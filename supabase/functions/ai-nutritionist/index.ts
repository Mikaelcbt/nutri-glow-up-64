import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "auth_missing", detail: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey =
      Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return json({ error: "config_error", detail: "Backend auth is not configured" }, 500);
    }

    if (!geminiApiKey) {
      console.error("Gemini API key not set. Expected GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY");
      return json({ error: "config_error", detail: "AI service not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth failed:", userError?.message);
      return json({ error: "auth_invalid", detail: "Invalid or expired token" }, 401);
    }

    const userId = user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role !== "admin") {
      const { data: assoc, error: assocError } = await supabase
        .from("associacoes")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "ativo")
        .limit(1);

      if (assocError) {
        console.error("Association lookup failed:", assocError);
        return json({ error: "forbidden", detail: "Nao foi possivel validar seu acesso." }, 403);
      }

      if (!assoc || assoc.length === 0) {
        return json({ error: "forbidden", detail: "Voce precisa de uma associacao ativa para usar a NutriIA." }, 403);
      }
    }

    const { messages, user_name, programs, progress } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "bad_request", detail: "messages array is required" }, 400);
    }

    const systemPrompt = `Você é a NutriIA, assistente virtual de nutrição da plataforma Nutri Glow Up.
Seu papel é ajudar os alunos com dúvidas sobre nutrição, alimentação saudável, receitas e hábitos alimentares.

Regras:
- Responda sempre em português do Brasil.
- Seja acolhedora, motivadora e profissional.
- Use linguagem simples e acessível.
- Use markdown para listas, destaques e organização.
- NÃO faça diagnósticos médicos nem prescreva medicamentos.
- Para questões médicas específicas, oriente a buscar um profissional de saúde.
- Se faltar contexto, faça uma pergunta curta antes de responder.

Contexto do aluno:
- Nome: ${user_name || "Aluno"}
${programs?.length ? `- Programas ativos: ${JSON.stringify(programs)}` : ""}
${progress?.length ? `- Progresso: ${JSON.stringify(progress)}` : ""}`;

    const geminiContents = messages
      .filter((msg: unknown) => {
        if (!msg || typeof msg !== "object") return false;
        const content = (msg as { content?: unknown }).content;
        return typeof content === "string" && content.trim().length > 0;
      })
      .map((msg: { role?: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    if (geminiContents.length === 0) {
      return json({ error: "bad_request", detail: "No valid messages provided" }, 400);
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return json({ error: "rate_limit", detail: "Muitas requisicoes. Tente novamente em alguns instantes." }, 429);
      }

      return json({ error: "ai_error", detail: "O servico de IA falhou ao gerar a resposta." }, 502);
    }

    const data = await response.json();

    const reply = Array.isArray(data?.candidates)
      ? data.candidates
          .flatMap((candidate: { content?: { parts?: Array<{ text?: string }> } }) =>
            Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [],
          )
          .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
          .join("")
          .trim()
      : "";

    if (!reply) {
      console.error("Empty Gemini response:", JSON.stringify(data));
      return json({ error: "empty_response", detail: "A IA nao retornou conteudo nesta tentativa." }, 502);
    }

    return json({ reply });
  } catch (error) {
    console.error("Unexpected error:", error);
    return json({ error: "internal", detail: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
