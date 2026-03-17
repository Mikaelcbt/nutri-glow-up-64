import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  conteudo: string;
  criado_em: string;
}

const FUNCTION_URL = 'https://zpubzpnzdyhqrvoahkwj.supabase.co/functions/v1/ai-nutritionist';

export function useNutriChat() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [platformContext, setPlatformContext] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    if (profile?.role === 'admin') {
      setHasAccess(true);
      return;
    }
    supabase
      .from('associacoes')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .limit(1)
      .then(({ data }) => setHasAccess((data?.length ?? 0) > 0));
  }, [user, profile]);

  const loadPlatformContext = useCallback(async () => {
    if (!user || platformContext) return platformContext;
    try {
      const [assocRes, progressRes, challengeRes] = await Promise.all([
        supabase
          .from('associacoes')
          .select(`
            status,
            product:products(
              nome, 
              descricao,
              modules(titulo, ordem, lessons(titulo, ordem, descricao))
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'ativo'),
        supabase
          .from('rastreamento_progresso')
          .select('concluido, lesson:lessons(titulo, module:modules(titulo))')
          .eq('user_id', user.id)
          .eq('concluido', true),
        supabase
          .from('desafios')
          .select(`
            titulo,
            descricao,
            desafio_dias(
              numero_dia, titulo, cafe_manha, lanche_manha, almoco,
              lanche_tarde, jantar, ceia, lista_alimentos, receita, liberado
            )
          `)
          .eq('is_active', true),
      ]);
      const ctx = {
        programs: assocRes.data || [],
        progress: progressRes.data || [],
        challenges: challengeRes.data || [],
      };
      setPlatformContext(ctx);
      return ctx;
    } catch (err) {
      console.error('[NutriIA] Error loading platform context:', err);
      return { programs: [], progress: [], challenges: [] };
    }
  }, [user, platformContext]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversas_ia')
        .select('id, role, conteudo, criado_em')
        .eq('user_id', user.id)
        .order('criado_em', { ascending: true });
      if (error) console.error('[NutriIA] Load history error:', error);
      if (data) setMessages(data as ChatMessage[]);
      // Pre-load platform context
      loadPlatformContext();
    } catch (err) {
      console.error('[NutriIA] Unexpected error loading history:', err);
    }
    setLoading(false);
  }, [user, loadPlatformContext]);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || !profile || sending) return;
    setSending(true);

    try {
      console.log('[NutriIA] Sending message:', text);

      // 1. Save user message to DB
      const { data: inserted, error: insertErr } = await supabase
        .from('conversas_ia')
        .insert({ user_id: user.id, role: 'user', conteudo: text })
        .select()
        .single();

      if (insertErr) console.error('[NutriIA] Insert user msg error:', insertErr);
      if (inserted) {
        setMessages(prev => [...prev, inserted as ChatMessage]);
      }

      // 2. Build messages array for AI (filter out old fallback messages)
      const recentMessages = messages
        .slice(-10)
        .filter(m => {
          const c = m.conteudo?.trim();
          return c && !c.startsWith('Erro') && c !== 'Não consegui gerar resposta.';
        })
        .map(m => ({ role: m.role, content: m.conteudo }));
      recentMessages.push({ role: 'user', content: text });

      // 3. Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // 4. Load platform context (cached after first load)
      const ctx = await loadPlatformContext();

      // 5. Call edge function via direct fetch
      console.log('[NutriIA] Calling edge function with platform context...');
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: recentMessages,
          user_name: profile.nome_completo || 'Aluno',
          programs: ctx?.programs || [],
          progress: ctx?.progress || [],
          challenges: ctx?.challenges || [],
        }),
      });

      console.log('[NutriIA] Edge function HTTP status:', response.status);
      const responseText = await response.text();
      console.log('[NutriIA] Edge function raw response:', responseText);

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 200)}`);
      }

      const reply = data?.reply;
      if (!reply || reply.startsWith('Erro')) {
        throw new Error(reply || 'A IA não retornou uma resposta válida.');
      }

      // 5. Save AI response
      const { data: aiInserted, error: aiInsertErr } = await supabase
        .from('conversas_ia')
        .insert({ user_id: user.id, role: 'assistant', conteudo: reply })
        .select()
        .single();

      if (aiInsertErr) console.error('[NutriIA] Insert AI msg error:', aiInsertErr);
      if (aiInserted) {
        setMessages(prev => [...prev, aiInserted as ChatMessage]);
      }
    } catch (err: any) {
      console.error('[NutriIA] Error:', err?.message || err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        conteudo: err?.message || 'Erro desconhecido ao processar sua mensagem.',
        criado_em: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [user, profile, sending, messages, loadPlatformContext]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from('conversas_ia').delete().eq('user_id', user.id);
    setMessages([]);
  }, [user]);

  return { messages, loading, sending, hasAccess, loadHistory, sendMessage, clearHistory };
}
