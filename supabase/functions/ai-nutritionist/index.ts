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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("JWT validation failed:", claimsError);
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub as string;

    // ── Body ─────────────────────────────────────────────
    const { messages, user_name, programs, progress } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return json({ error: "messages array is required" }, 400);
    }

    // ── Gemini API key ───────────────────────────────────
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      console.error("GEMINI_API_KEY not set");
      return json({ error: "AI service not configured" }, 500);
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

    // ── Call Gemini ──────────────────────────────────────
    const geminiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1024,
      },
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return json({ error: "AI service error", details: errText }, 502);
    }

    const geminiData = await geminiRes.json();
    const responseText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Desculpe, não consegui gerar uma resposta.";

    return json({ response: responseText });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
