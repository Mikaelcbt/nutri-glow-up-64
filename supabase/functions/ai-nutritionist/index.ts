const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const geminiKey =
      Deno.env.get("GOOGLE_GEMINI_API_KEY") ||
      Deno.env.get("GEMINI_API_KEY") ||
      "";

    if (!geminiKey) {
      console.error("[NutriIA] No Gemini API key found in env");
      return respond({ reply: "Erro: chave da IA não configurada no servidor." }, 500);
    }

    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages || [];
    const userName: string = body.user_name || "Aluno";

    if (messages.length === 0) {
      return respond({ reply: "Erro: nenhuma mensagem enviada." }, 400);
    }

    console.log("[NutriIA] Received", messages.length, "messages from", userName);

    // Build Gemini contents
    const contents = messages
      .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemText = [
      "Você é a NutriIA, assistente de nutrição da plataforma Nutri Glow Up.",
      "Responda sempre em português do Brasil de forma acolhedora e profissional.",
      "Use markdown para organizar a resposta.",
      "Não faça diagnósticos médicos nem prescreva medicamentos.",
      `O aluno se chama ${userName}.`,
    ].join(" ");

    // Call Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

    console.log("[NutriIA] Calling Gemini...");

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    });

    const rawText = await geminiRes.text();
    console.log("[NutriIA] Gemini HTTP status:", geminiRes.status);
    console.log("[NutriIA] Gemini raw response (first 500 chars):", rawText.substring(0, 500));

    if (!geminiRes.ok) {
      console.error("[NutriIA] Gemini error body:", rawText);
      return respond(
        { reply: `Erro da API Gemini (${geminiRes.status}). Tente novamente.` },
        502,
      );
    }

    // Parse response
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error("[NutriIA] Failed to parse Gemini JSON:", e);
      return respond({ reply: "Erro ao interpretar resposta da IA." }, 502);
    }

    const replyText =
      parsed?.candidates?.[0]?.content?.parts
        ?.map((p: any) => (typeof p?.text === "string" ? p.text : ""))
        .join("")
        .trim() || "";

    if (!replyText) {
      console.error("[NutriIA] Empty reply from Gemini. Full parsed:", JSON.stringify(parsed));
      return respond({ reply: "A IA não gerou conteúdo nesta tentativa. Tente novamente." }, 502);
    }

    console.log("[NutriIA] Success! Reply length:", replyText.length);
    return respond({ reply: replyText });
  } catch (err) {
    console.error("[NutriIA] Unhandled error:", err);
    return respond({ reply: `Erro interno: ${String(err)}` }, 500);
  }
});
