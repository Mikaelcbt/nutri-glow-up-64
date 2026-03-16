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

function extractReply(data: any) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return "";
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return json({ error: "config_error", detail: "Backend auth is not configured" }, 500);
    }

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not set");
      return json({ error: "config_error", detail: "AI service not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error("JWT validation failed:", claimsError?.message ?? claimsError);
      return json({ error: "auth_invalid", detail: "Invalid or expired token" }, 401);
    }

    const userId = claimsData.claims.sub as string;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed:", profileError);
    }

    if (profile?.role !== "admin") {
      const { data: assoc, error: assocError } = await supabase
        .from("associacoes")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "ativo")
        .limit(1);

      if (assocError) {
        console.error("Association lookup failed:", assocError);
        return json({ error: "forbidden", detail: "Não foi possível validar seu acesso à NutriIA." }, 403);
      }

      if (!assoc || assoc.length === 0) {
        return json({ error: "forbidden", detail: "Você precisa de uma associação ativa para usar a NutriIA." }, 403);
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
            .filter((message: any) => typeof message?.content === "string" && message.content.trim())
            .map((message: any) => ({
              role: message.role === "assistant" ? "assistant" : "user",
              content: message.content,
            })),
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return json({ error: "rate_limit", detail: "Muitas requisições. Tente novamente em alguns instantes." }, 429);
      }

      if (response.status === 402) {
        return json({ error: "credits", detail: "Os créditos de IA do workspace acabaram. Recarregue e tente novamente." }, 402);
      }

      return json({ error: "ai_error", detail: "O serviço de IA falhou ao gerar a resposta." }, 502);
    }

    const data = await response.json();
    const reply = extractReply(data);

    if (!reply) {
      console.error("Empty AI response:", JSON.stringify(data));
      return json({ error: "empty_response", detail: "A IA não retornou conteúdo nesta tentativa." }, 502);
    }

    return json({ reply });
  } catch (error) {
    console.error("Unexpected error:", error);
    return json({ error: "internal", detail: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
