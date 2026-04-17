import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Download, CheckCircle, ArrowLeft, Clock, ChefHat, Sparkles, Dumbbell, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import confetti from 'canvas-confetti';
import { useXPGain } from '@/components/XPToast';
import { XP_VALUES, useUserStats } from '@/hooks/useUserStats';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

interface DayData {
  id: string;
  desafio_id: string;
  numero_dia: number;
  titulo: string;
  video_url: string;
  treino_url: string;
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
      <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
        <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
        <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="w-full h-full" allowFullScreen />
      </div>
    );
  }
  return (
    <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
      <video src={url} controls className="w-full h-full bg-black" />
    </div>
  );
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm|\.mov/.test(url);
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
  const [treinoOpen, setTreinoOpen] = useState(false);
  const { showXP, GainOverlay } = useXPGain();
  const { refreshStats } = useUserStats();

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
    // Guard: impede double-submit e re-conclusão
    if (!user || !id || !numero || completed || marking) return;
    setMarking(true);
    try {
      const { error } = await supabase.from('desafio_progresso').upsert({
        desafio_id: id, user_id: user.id, numero_dia: Number(numero), concluido: true,
      }, { onConflict: 'desafio_id,user_id,numero_dia' });

      if (!error) {
        setCompleted(true);
        fireConfetti();
        showXP(XP_VALUES.CHALLENGE_DAY, 'Dia do desafio!');
        refreshStats();
        toast.success('Dia marcado como concluído! 🎉');
      } else {
        toast.error('Erro ao marcar progresso');
      }
    } finally {
      setMarking(false);
    }
  };

  const handleTreinoClick = () => {
    if (!day?.treino_url) return;
    if (isVideoUrl(day.treino_url)) {
      setTreinoOpen(true);
    } else {
      window.open(day.treino_url, '_blank', 'noopener,noreferrer');
    }
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
  const hasTreino = !!day.treino_url?.trim();

  return (
    <AppLayout>
      <GainOverlay />

      {/* Treino Drawer */}
      {hasTreino && isVideoUrl(day.treino_url) && (
        <Drawer open={treinoOpen} onOpenChange={setTreinoOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="flex items-center justify-between pb-0">
              <DrawerTitle className="flex items-center gap-2 font-display text-lg">
                <Dumbbell className="h-5 w-5 text-primary" />
                Treino do Dia {day.numero_dia}
              </DrawerTitle>
              <DrawerClose asChild>
                <button className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="px-4 pb-6 pt-3">
              <VideoPlayer url={day.treino_url} />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <AnimatedPage>
        <div className="px-4 py-6 md:px-16 md:py-8 max-w-4xl mx-auto space-y-8 pb-32">

          {/* ── Header ── */}
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-3">
            <Link to={`/app/desafios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {challengeTitle}
            </Link>

            {/* Editorial day number behind title */}
            <div className="relative">
              <span
                className="absolute -top-4 left-0 font-display font-bold text-foreground/[0.06] select-none leading-none pointer-events-none"
                style={{ fontSize: 'clamp(72px, 20vw, 120px)', lineHeight: 1 }}
                aria-hidden="true"
              >
                {String(day.numero_dia).padStart(2, '0')}
              </span>
              <div className="relative pt-4 pl-1">
                <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-tight">
                  {day.titulo || `Dia ${day.numero_dia}`}
                </h1>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <Badge className="bg-primary/15 text-primary border-primary/20 mt-2 gap-1 text-xs">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}>✓</motion.span>
                    Liberado
                  </Badge>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ── Vídeo principal ── */}
          {day.video_url?.trim() && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
              <VideoPlayer url={day.video_url} />
            </motion.div>
          )}

          {/* ── Dieta ── */}
          {hasMeals && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
              <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2 border-l-[3px] border-primary pl-3">
                <Sparkles className="h-4 w-4 text-primary" /> Dieta de Hoje
              </h2>
              <div className="space-y-3">
                {visibleMeals.map(({ key, label, emoji }, i) => {
                  const content = day[key] as string;
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.07, duration: 0.35 }}
                    >
                      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card">
                        {/* Left accent stripe */}
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary to-primary/30" />
                        <div className="pl-5 pr-5 py-4 space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl leading-none">{emoji}</span>
                            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">{label}</h3>
                          </div>
                          <RichContent html={content} className="text-muted-foreground" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ── Alimentos Permitidos ── */}
          {hasContent(day.alimentos) && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground border-l-[3px] border-primary pl-3">
                Alimentos Permitidos
              </h2>
              <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary/60 to-primary/20" />
                <div className="pl-5 pr-5 py-4">
                  <RichContent html={day.alimentos} />
                </div>
              </div>
            </motion.section>
          )}

          {/* ── Receita ── */}
          {hasRecipe && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2 border-l-[3px] border-primary pl-3">
                <ChefHat className="h-4 w-4 text-primary" /> Receita do Dia
              </h2>
              <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary/40 to-primary/10" />
                <div className="pl-5 pr-5 py-5 space-y-4">
                  {hasContent(day.titulo_receita) && (
                    <h3 className="text-base font-semibold text-foreground">{day.titulo_receita}</h3>
                  )}
                  {(day.tempo_preparo?.trim() || day.rendimento?.trim()) && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {day.tempo_preparo?.trim() && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> {day.tempo_preparo}
                        </span>
                      )}
                      {day.rendimento?.trim() && <span>📦 {day.rendimento}</span>}
                    </div>
                  )}
                  {hasContent(day.ingredientes) && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ingredientes</p>
                      <RichContent html={day.ingredientes} />
                    </div>
                  )}
                  {hasContent(day.modo_preparo) && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Modo de Preparo</p>
                      <RichContent html={day.modo_preparo} />
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* ── Observações ── */}
          {hasContent(day.observacoes) && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 space-y-2">
                <h2 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                  💡 <span>Observações e Dicas</span>
                </h2>
                <RichContent html={day.observacoes} className="text-muted-foreground" />
              </div>
            </motion.section>
          )}

          {/* ── PDF ── */}
          {day.pdf_url?.trim() && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Button asChild variant="outline" className="w-full h-11 font-medium border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200" size="lg">
                <a href={day.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Baixar material complementar
                </a>
              </Button>
            </motion.div>
          )}
        </div>

        {/* ── Fixed bottom bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom" style={{ background: 'hsl(var(--background)/0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid hsl(var(--border)/0.6)' }}>
          <div className="max-w-4xl mx-auto px-4 py-3">
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
            ) : hasTreino ? (
              /* Two-button layout when workout is available */
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  onClick={handleTreinoClick}
                  variant="outline"
                  size="lg"
                  className="h-12 font-semibold border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all duration-200 gap-2"
                >
                  {isVideoUrl(day.treino_url) ? (
                    <Dumbbell className="h-4 w-4" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Ver Treino
                </Button>
                <Button
                  onClick={markComplete}
                  disabled={marking}
                  size="lg"
                  className="h-12 font-semibold bg-gradient-to-r from-primary to-primary/90 shadow-md hover:shadow-green-glow btn-ripple transition-all duration-200 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {marking ? 'Marcando...' : 'Concluir dia'}
                </Button>
              </div>
            ) : (
              /* Single button when no workout */
              <Button
                onClick={markComplete}
                disabled={marking}
                size="lg"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 shadow-md btn-ripple animate-[pulse_3s_ease-in-out_infinite] hover:animate-none transition-all duration-200"
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
