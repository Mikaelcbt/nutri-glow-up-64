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

  // Check if user has active association
  useEffect(() => {
    if (!user) return;
    supabase
      .from('associacoes')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .limit(1)
      .then(({ data }) => setHasAccess((data?.length ?? 0) > 0));
  }, [user]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('conversas_ia')
      .select('id, role, conteudo, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
    setLoading(false);
  }, [user]);

  const sendMessage = useCallback(async (text: string) => {
    if (!user || !profile || sending) return;
    setSending(true);

    // 1. Save user message
    const { data: inserted } = await supabase
      .from('conversas_ia')
      .insert({ user_id: user.id, role: 'user', conteudo: text })
      .select()
      .single();

    if (inserted) {
      setMessages(prev => [...prev, inserted as ChatMessage]);
    }

    try {
      // 2. Get context
      const [{ data: programs }, { data: progressData }, { data: history }] = await Promise.all([
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
        supabase
          .from('conversas_ia')
          .select('role, conteudo')
          .eq('user_id', user.id)
          .order('criado_em', { ascending: false })
          .limit(10),
      ]);

      // 3. Call edge function
      const { data: aiData, error } = await supabase.functions.invoke('ai-nutritionist', {
        body: {
          messages: (history ?? []).reverse().map((m: any) => ({ role: m.role, content: m.conteudo })),
          user_name: profile.nome_completo,
          programs: programs ?? [],
          progress: progressData ?? [],
        },
      });

      if (error) throw error;

      const responseText = aiData?.response || 'Desculpe, não consegui processar sua pergunta.';

      // 4. Save AI response
      const { data: aiInserted } = await supabase
        .from('conversas_ia')
        .insert({ user_id: user.id, role: 'assistant', conteudo: responseText })
        .select()
        .single();

      if (aiInserted) {
        setMessages(prev => [...prev, aiInserted as ChatMessage]);
      }
    } catch (err) {
      console.error('NutriIA error:', err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        conteudo: 'Desculpe, estou com dificuldades técnicas. Tente novamente em instantes.',
        criado_em: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [user, profile, sending]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from('conversas_ia').delete().eq('user_id', user.id);
    setMessages([]);
  }, [user]);

  return { messages, loading, sending, hasAccess, loadHistory, sendMessage, clearHistory };
}
