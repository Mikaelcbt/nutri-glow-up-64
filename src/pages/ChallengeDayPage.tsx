import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { Download, CheckCircle, ArrowLeft, Clock, ChefHat, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import confetti from 'canvas-confetti';

interface DayData {
  id: string;
  desafio_id: string;
  numero_dia: number;
  titulo: string;
  video_url: string;
  pdf_url: string;
  alimentos: string;
  liberado: boolean;
  cafe_manha: string;
  lanche_manha: string;
  almoco: string;
  lanche_tarde: string;
  jantar: string;
  ceia: string;
  observacoes: string;
  titulo_receita: string;
  ingredientes: string;
  modo_preparo: string;
  tempo_preparo: string;
  rendimento: string;
}

function VideoPlayer({ url }: { url: string }) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
        <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
        <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="w-full h-full" allowFullScreen />
      </div>
    );
  }
  return (
    <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
      <video src={url} controls className="w-full h-full bg-black" />
    </div>
  );
}

function hasContent(html: string | undefined | null): boolean {
  if (!html) return false;
  return html.replace(/<[^>]*>/g, '').trim().length > 0;
}

function RichContent({ html, className = '' }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html);
  return (
    <div
      className={`rich-content text-[15px] leading-[1.7] ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

const mealFields: { key: keyof DayData; label: string; emoji: string }[] = [
  { key: 'cafe_manha', label: 'Café da manhã', emoji: '🌅' },
  { key: 'lanche_manha', label: 'Lanche da manhã', emoji: '☀️' },
  { key: 'almoco', label: 'Almoço', emoji: '🥗' },
  { key: 'lanche_tarde', label: 'Lanche da tarde', emoji: '🌤️' },
  { key: 'jantar', label: 'Jantar', emoji: '🌙' },
  { key: 'ceia', label: 'Ceia', emoji: '🌜' },
];

function fireConfetti() {
  const defaults = { spread: 70, ticks: 80, gravity: 0.9, origin: { y: 0.85 } };
  confetti({ ...defaults, particleCount: 40, colors: ['#22C55E', '#16A34A', '#4ADE80'] });
  setTimeout(() => confetti({ ...defaults, particleCount: 30, colors: ['#22C55E', '#86EFAC', '#BBF7D0'] }), 150);
}

export default function ChallengeDayPage() {
  const { id, numero } = useParams<{ id: string; numero: string }>();
  const { user } = useAuth();
  const [day, setDay] = useState<DayData | null>(null);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (id && numero) loadDay();
  }, [id, numero]);

  const loadDay = async () => {
    const [dayRes, challengeRes] = await Promise.all([
      supabase.from('desafio_dias').select('*').eq('desafio_id', id).eq('numero_dia', Number(numero)).single(),
      supabase.from('desafios').select('titulo').eq('id', id).single(),
    ]);

    if (dayRes.data) setDay(dayRes.data);
    if (challengeRes.data) setChallengeTitle(challengeRes.data.titulo);

    if (user && id) {
      const { data: prog } = await supabase
        .from('desafio_progresso')
        .select('concluido')
        .eq('desafio_id', id)
        .eq('user_id', user.id)
        .eq('numero_dia', Number(numero))
        .maybeSingle();
      if (prog?.concluido) setCompleted(true);
    }
    setLoading(false);
  };

  const markComplete = async () => {
    if (!user || !id || !numero) return;
    setMarking(true);
    const { error } = await supabase.from('desafio_progresso').upsert({
      desafio_id: id, user_id: user.id, numero_dia: Number(numero), concluido: true,
    }, { onConflict: 'desafio_id,user_id,numero_dia' });

    if (!error) {
      setCompleted(true);
      fireConfetti();
      toast.success('Dia marcado como concluído! 🎉');
    } else {
      toast.error('Erro ao marcar progresso');
    }
    setMarking(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-8 md:px-16 space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 shimmer" />
          <Skeleton className="h-[50vh] w-full rounded-2xl shimmer" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl shimmer" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!day || !day.liberado) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <p className="text-muted-foreground">Este dia ainda não está disponível.</p>
          <Button asChild variant="outline"><Link to={`/app/desafios/${id}`}>Voltar ao desafio</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const hasMeals = mealFields.some(m => hasContent(day[m.key] as string));
  const hasRecipe = hasContent(day.titulo_receita) || hasContent(day.ingredientes) || hasContent(day.modo_preparo);
  const visibleMeals = mealFields.filter(m => hasContent(day[m.key] as string));

  return (
    <AppLayout>
      <AnimatedPage>
        <div className="px-4 py-6 md:px-16 md:py-8 max-w-4xl mx-auto space-y-8 pb-28">
          {/* Premium Header */}
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-4">
            <Link to={`/app/desafios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> {challengeTitle}
            </Link>
            <div className="flex items-start gap-4">
              <motion.div
                className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg flex-shrink-0"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <span className="font-display text-3xl md:text-4xl font-bold">{day.numero_dia}</span>
              </motion.div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-tight">
                  {day.titulo || `Dia ${day.numero_dia}`}
                </h1>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <Badge className="bg-primary/15 text-primary border-primary/20 mt-2 gap-1">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                    >
                      ✓
                    </motion.span>
                    Liberado
                  </Badge>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Video */}
          {day.video_url?.trim() && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <VideoPlayer url={day.video_url} />
            </motion.div>
          )}

          {/* Meals */}
          {hasMeals && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
              <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Dieta de Hoje
              </h2>
              <div className="space-y-4">
                {visibleMeals.map(({ key, label, emoji }, i) => {
                  const content = day[key] as string;
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 0.35 }}
                    >
                      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card hover:shadow-soft transition-shadow space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[32px] leading-none">{emoji}</span>
                          <h3 className="font-semibold text-primary text-base">{label}</h3>
                        </div>
                        <Separator className="bg-border/60" />
                        <RichContent html={content} />
                      </div>
                      {/* Visual separator between meals */}
                      {i < visibleMeals.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="w-1 h-4 rounded-full bg-primary/15" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* Alimentos Permitidos */}
          {hasContent(day.alimentos) && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground">✅ Alimentos Permitidos Hoje</h2>
              <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card">
                <RichContent html={day.alimentos} />
              </div>
            </motion.section>
          )}

          {/* Recipe */}
          {hasRecipe && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" /> Receita do Dia
              </h2>
              <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card space-y-4">
                {hasContent(day.titulo_receita) && <h3 className="text-lg font-semibold text-foreground">{day.titulo_receita}</h3>}
                {(day.tempo_preparo?.trim() || day.rendimento?.trim()) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {day.tempo_preparo?.trim() && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {day.tempo_preparo}</span>}
                    {day.rendimento?.trim() && <span>📦 {day.rendimento}</span>}
                  </div>
                )}
                {hasContent(day.ingredientes) && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">Ingredientes</h4>
                    <RichContent html={day.ingredientes} />
                  </div>
                )}
                {hasContent(day.modo_preparo) && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">Modo de Preparo</h4>
                    <RichContent html={day.modo_preparo} />
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* Observações */}
          {hasContent(day.observacoes) && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6 space-y-2">
                <h2 className="font-display text-lg font-semibold text-foreground">💡 Observações e Dicas</h2>
                <RichContent html={day.observacoes} />
              </div>
            </motion.section>
          )}

          {/* PDF */}
          {day.pdf_url?.trim() && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Button asChild variant="outline" className="w-full" size="lg">
                <a href={day.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-5 w-5" /> Baixar material complementar
                </a>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Fixed bottom button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border z-40 safe-area-bottom">
          <div className="max-w-4xl mx-auto">
            {completed ? (
              <motion.div
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary/10 text-primary font-medium"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
                  <CheckCircle className="h-5 w-5" />
                </motion.div>
                Dia concluído! 🎉
              </motion.div>
            ) : (
              <Button
                onClick={markComplete}
                disabled={marking}
                size="lg"
                className="w-full text-base bg-gradient-to-r from-primary to-primary/90 shadow-lg btn-ripple animate-[pulse_3s_ease-in-out_infinite] hover:animate-none"
              >
                <CheckCircle className="mr-2 h-5 w-5" /> {marking ? 'Marcando...' : 'Marcar dia como concluído'}
              </Button>
            )}
          </div>
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}
