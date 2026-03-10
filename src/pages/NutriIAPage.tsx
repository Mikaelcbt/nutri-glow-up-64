import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNutriChat } from '@/hooks/useNutriChat';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';
import AppLayout from '@/components/AppLayout';
import ReactMarkdown from 'react-markdown';

const suggestions = [
  'Como está meu progresso?',
  'Me dê dicas para hoje',
  'O que comer antes do treino?',
  'Como montar meu prato?',
  'Quais alimentos evitar?',
];

export default function NutriIAPage() {
  const [input, setInput] = useState('');
  const { messages, loading, sending, loadHistory, sendMessage, clearHistory } = useNutriChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    sendMessage(msg);
  };

  return (
    <AppLayout>
      <AnimatedPage className="h-[calc(100vh-56px)] lg:h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-6 bg-card">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg">IA</div>
              <div>
                <h1 className="font-display text-2xl font-semibold text-foreground">NutriIA</h1>
                <p className="text-sm text-muted-foreground">Tire suas dúvidas sobre nutrição e acompanhe seu progresso</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1.5" /> Limpar
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {loading && <p className="text-center text-sm text-muted-foreground">Carregando histórico...</p>}

            {/* Suggestions when empty */}
            {!loading && messages.length === 0 && (
              <motion.div
                className="py-16 text-center space-y-8"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div variants={fadeInUp}>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent mb-4">
                    <Sparkles className="h-10 w-10 text-accent-foreground" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-foreground">Olá! Sou a NutriIA 👋</h2>
                  <p className="text-muted-foreground mt-2">Como posso te ajudar hoje?</p>
                </motion.div>
                <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-[16px_16px_4px_16px]'
                      : 'bg-card border border-border shadow-card rounded-[16px_16px_16px_4px]'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown>{m.conteudo}</ReactMarkdown>
                    </div>
                  ) : m.conteudo}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-card border border-border shadow-card rounded-[16px_16px_16px_4px] px-4 py-3 flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 bg-card">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Pergunte sobre nutrição, progresso, dicas..."
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={sending}
            />
            <Button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              className="h-12 w-12 rounded-xl active:scale-95"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}
