import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  conteudo: string;
  criado_em: string;
}

export function useNutriChat() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Check if user has active association or is admin
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

  // Load history
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
    } catch (err) {
      console.error('[NutriIA] Unexpected error loading history:', err);
    }
    setLoading(false);
  }, [user]);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || !profile || sending) return;
    setSending(true);

    try {
      console.log('[NutriIA] Sending message:', text);

      // 1. Save user message
      const { data: inserted, error: insertErr } = await supabase
        .from('conversas_ia')
        .insert({ user_id: user.id, role: 'user', conteudo: text })
        .select()
        .single();

      if (insertErr) console.error('[NutriIA] Insert user msg error:', insertErr);
      if (inserted) {
        setMessages(prev => [...prev, inserted as ChatMessage]);
      }

      // 2. Get context (don't block on errors)
      let programs: any[] = [];
      let progressData: any[] = [];

      try {
        const [programsRes, progressRes] = await Promise.all([
          supabase
            .from('associacoes')
            .select('product:products(nome, descricao), status')
            .eq('user_id', user.id)
            .eq('status', 'ativo'),
          supabase
            .from('rastreamento_progresso')
            .select('lesson:lessons(titulo, module:modules(titulo))')
            .eq('user_id', user.id)
            .eq('concluido', true),
        ]);
        programs = programsRes.data ?? [];
        progressData = progressRes.data ?? [];
      } catch (ctxErr) {
        console.error('[NutriIA] Context fetch error (non-blocking):', ctxErr);
      }

      // 3. Build messages for the AI
      const recentMessages = messages.slice(-10).map(m => ({ role: m.role, content: m.conteudo }));
      recentMessages.push({ role: 'user', content: text });

      // 4. Call edge function via supabase.functions.invoke
      console.log('[NutriIA] Invoking ai-nutritionist...');
      const { data: fnData, error: fnError } = await supabase.functions.invoke('ai-nutritionist', {
        body: {
          messages: recentMessages,
          user_name: profile.nome_completo || 'Aluno',
          programs,
          progress: progressData,
        },
      });

      // 5. Handle response
      if (fnError) {
        console.error('[NutriIA] Function invoke error:', fnError.message, fnError.name);

        let errBody = fnData as { error?: string; detail?: string } | null;

        if (!errBody && typeof fnError === 'object' && fnError && 'context' in fnError) {
          try {
            const response = (fnError as { context?: Response }).context;
            if (response) {
              errBody = await response.clone().json();
            }
          } catch (parseErr) {
            console.error('[NutriIA] Failed to parse function error body:', parseErr);
          }
        }

        console.error('[NutriIA] Error body:', JSON.stringify(errBody));

        if (fnError.name === 'FunctionsFetchError') {
          throw new Error('Falha de conexão ao chamar a NutriIA. Atualize a página e tente novamente.');
        }
        if (errBody?.error === 'auth_missing' || errBody?.error === 'auth_invalid') {
          throw new Error('Erro de autenticação. Faça login novamente.');
        }
        if (errBody?.error === 'forbidden') {
          throw new Error(errBody.detail || 'Você precisa de uma assinatura ativa para usar a NutriIA.');
        }
        if (errBody?.error === 'rate_limit') {
          throw new Error(errBody.detail || 'Muitas requisições. Aguarde um momento.');
        }
        if (errBody?.error === 'credits') {
          throw new Error(errBody.detail || 'Créditos de IA esgotados.');
        }
        if (errBody?.error === 'config_error') {
          throw new Error('Serviço de IA não configurado. Contate o administrador.');
        }
        if (errBody?.error === 'ai_error') {
          throw new Error(errBody.detail || 'Erro no serviço de IA. Tente novamente.');
        }
        if (errBody?.error === 'empty_response') {
          throw new Error(errBody.detail || 'A IA não retornou uma resposta. Tente novamente.');
        }
        if (errBody?.error === 'internal') {
          throw new Error(errBody.detail || 'Erro interno ao consultar a NutriIA.');
        }

        throw new Error(errBody?.detail || fnError.message || 'Erro ao consultar a NutriIA.');
      }

      console.log('[NutriIA] Response data:', fnData);

      // Extract reply from standardized response
      const reply = (fnData as { reply?: string })?.reply;
      if (!reply) {
        console.error('[NutriIA] Missing reply field in response:', fnData);
        throw new Error('Resposta inesperada da IA. Tente novamente.');
      }

      // 6. Save AI response
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
      console.error('[NutriIA] Final error:', err?.message || err);
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
  }, [user, profile, sending, messages]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from('conversas_ia').delete().eq('user_id', user.id);
    setMessages([]);
  }, [user]);

  return { messages, loading, sending, hasAccess, loadHistory, sendMessage, clearHistory };
}
