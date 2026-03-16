// NutriIA Edge Function v3 - force redeploy
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // ── Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "auth_missing", detail: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError?.message ?? claimsError);
      return json({ error: "auth_invalid", detail: "Invalid or expired token" }, 401);
    }

    const userId = claimsData.claims.sub as string;

    // ── Body ─────────────────────────────────────────────
    const { messages, user_name, programs, progress } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return json({ error: "bad_request", detail: "messages array is required" }, 400);
    }

    // ── Lovable AI Gateway ───────────────────────────────
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not set");
      return json({ error: "config_error", detail: "AI service not configured" }, 500);
    }

    // ── System prompt ────────────────────────────────────
    const systemPrompt = `Você é a NutriIA, assistente virtual de nutrição da plataforma Nutri Glow Up.
Seu papel é ajudar os alunos com dúvidas sobre nutrição, alimentação saudável, receitas e hábitos alimentares.

Regras:
- Responda sempre em português do Brasil.
- Seja acolhedora, motivadora e profissional.
- Use linguagem simples e acessível.
- NÃO faça diagnósticos médicos nem prescreva medicamentos.
- Para questões médicas específicas, oriente a buscar um profissional de saúde.
- Use markdown para formatar suas respostas (listas, negrito, etc.).

Nome do aluno: ${user_name || "Aluno"}

${programs?.length ? `Programas ativos: ${JSON.stringify(programs)}` : ""}
${progress?.length ? `Progresso: ${JSON.stringify(progress)}` : ""}`;

    // ── Call Lovable AI Gateway ──────────────────────────
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error status:", aiResponse.status, "body:", errText);

      if (aiResponse.status === 429) {
        return json({ error: "rate_limit", detail: "Muitas requisições. Tente novamente em alguns instantes." }, 429);
      }
      if (aiResponse.status === 402) {
        return json({ error: "credits", detail: "Créditos insuficientes no serviço de IA." }, 402);
      }
      return json({ error: "ai_error", detail: `Gateway returned ${aiResponse.status}` }, 502);
    }

    const aiData = await aiResponse.json();
    const replyText =
      aiData?.choices?.[0]?.message?.content || "";

    if (!replyText) {
      return json({ error: "empty_response", detail: "A IA não retornou conteúdo." }, 502);
    }

    return json({ reply: replyText });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "internal", detail: "Internal server error" }, 500);
  }
});
