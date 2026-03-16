import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "auth_missing", detail: "Token ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) {
      console.error("[NutriIA] GOOGLE_GEMINI_API_KEY not found in secrets");
      return new Response(
        JSON.stringify({ error: "config_error", detail: "Chave da IA não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Validate user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[NutriIA] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "auth_invalid", detail: "Token inválido ou expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = userData.user.id;

    // 4. Check access (admin or active association)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role !== "admin") {
      const { data: assoc } = await supabase
        .from("associacoes")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "ativo")
        .limit(1);

      if (!assoc || assoc.length === 0) {
        return new Response(
          JSON.stringify({ error: "forbidden", detail: "Associação ativa necessária" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 5. Parse request body
    const body = await req.json();
    const messages = body.messages;
    const userName = body.user_name || "Aluno";
    const programs = body.programs || [];
    const progress = body.progress || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "bad_request", detail: "messages é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Build Gemini request
    const systemPrompt = [
      "Você é a NutriIA, assistente virtual de nutrição da plataforma Nutri Glow Up.",
      "Ajude os alunos com dúvidas sobre nutrição, alimentação saudável, receitas e hábitos alimentares.",
      "",
      "Regras:",
      "- Responda sempre em português do Brasil.",
      "- Seja acolhedora, motivadora e profissional.",
      "- Use linguagem simples e acessível.",
      "- Use markdown para listas, destaques e organização.",
      "- NÃO faça diagnósticos médicos nem prescreva medicamentos.",
      "- Para questões médicas, oriente a buscar um profissional.",
      "",
      `Aluno: ${userName}`,
      programs.length > 0 ? `Programas ativos: ${JSON.stringify(programs)}` : "",
      progress.length > 0 ? `Progresso: ${JSON.stringify(progress)}` : "",
    ].filter(Boolean).join("\n");

    const contents = messages
      .filter((m: any) => m && typeof m.content === "string" && m.content.trim())
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      return new Response(
        JSON.stringify({ error: "bad_request", detail: "Nenhuma mensagem válida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[NutriIA] Calling Gemini API with", contents.length, "messages");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    console.log("[NutriIA] Gemini status:", geminiResponse.status);

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("[NutriIA] Gemini error:", geminiResponse.status, errText);

      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit", detail: "Muitas requisições, tente em instantes" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "ai_error", detail: "Falha ao gerar resposta da IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("[NutriIA] Gemini response received, candidates:", geminiData?.candidates?.length);

    // 7. Extract text from Gemini response
    let reply = "";
    try {
      const candidates = geminiData?.candidates;
      if (Array.isArray(candidates) && candidates.length > 0) {
        const parts = candidates[0]?.content?.parts;
        if (Array.isArray(parts)) {
          reply = parts
            .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
            .join("")
            .trim();
        }
      }
    } catch (parseErr) {
      console.error("[NutriIA] Error parsing Gemini response:", parseErr);
    }

    if (!reply) {
      console.error("[NutriIA] Empty reply. Full response:", JSON.stringify(geminiData));
      return new Response(
        JSON.stringify({ error: "empty_response", detail: "A IA não retornou conteúdo" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[NutriIA] Success, reply length:", reply.length);

    // 8. Return
    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[NutriIA] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "internal", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
