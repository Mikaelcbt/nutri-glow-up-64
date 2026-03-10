import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lock, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Challenge {
  id: string;
  titulo: string;
  descricao: string;
  imagem_capa_url: string;
  total_dias: number;
}

interface ChallengeDay {
  id: string;
  desafio_id: string;
  numero_dia: number;
  titulo: string;
  liberado: boolean;
}

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<ChallengeDay[]>([]);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id, user]);

  const loadData = async () => {
    const [challengeRes, daysRes] = await Promise.all([
      supabase.from('desafios').select('*').eq('id', id).single(),
      supabase.from('desafio_dias').select('*').eq('desafio_id', id).order('numero_dia'),
    ]);

    if (challengeRes.data) setChallenge(challengeRes.data);
    if (daysRes.data) setDays(daysRes.data);

    if (user) {
      const { data: progress } = await supabase
        .from('desafio_progresso')
        .select('numero_dia')
        .eq('desafio_id', id)
        .eq('user_id', user.id)
        .eq('concluido', true);
      if (progress) setCompletedDays(new Set(progress.map(p => p.numero_dia)));
    }

    setLoading(false);
  };

  const scroll = (dir: 'left' | 'right') => {
    carouselRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-8 py-8 md:px-16 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="flex gap-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-36 w-28 rounded-xl flex-shrink-0" />)}</div>
        </div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Desafio não encontrado.</p>
        </div>
      </AppLayout>
    );
  }

  const releasedDays = days.filter(d => d.liberado).length;
  const completedCount = completedDays.size;
  const progressPct = challenge.total_dias > 0 ? Math.round((completedCount / challenge.total_dias) * 100) : 0;

  // Find current day = first released & not completed
  const currentDay = days.find(d => d.liberado && !completedDays.has(d.numero_dia));

  return (
    <AppLayout>
      <AnimatedPage>
        {/* Hero */}
        <section className="relative h-[40vh] w-full overflow-hidden">
          <div className="absolute inset-0">
            {challenge.imagem_capa_url ? (
              <img src={challenge.imagem_capa_url} alt={challenge.titulo} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-accent" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </div>
          <div className="relative flex h-full items-end px-8 pb-8 md:px-16">
            <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-3 w-full max-w-2xl">
              <Link to="/app/desafios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Voltar</Link>
              <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground">{challenge.titulo}</h1>
              <p className="text-muted-foreground">{challenge.descricao}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {challenge.total_dias} dias</span>
                <span>{releasedDays} liberados</span>
                {completedCount > 0 && <span className="text-primary font-medium">{completedCount} concluídos</span>}
              </div>
              {/* Progress bar */}
              {completedCount > 0 && (
                <div className="space-y-1 max-w-md">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Days Carousel */}
        <section className="px-8 py-8 md:px-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-semibold text-foreground">Dias do Desafio</h2>
            <div className="flex gap-2">
              <button onClick={() => scroll('left')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-all"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => scroll('right')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-all"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>

          <div ref={carouselRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-4" style={{ scrollbarWidth: 'none' }}>
            {days.map((day, i) => {
              const completed = completedDays.has(day.numero_dia);
              const isCurrent = currentDay?.id === day.id;
              return (
                <motion.div
                  key={day.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex-shrink-0"
                >
                  {day.liberado ? (
                    <Link
                      to={`/app/desafios/${challenge.id}/dia/${day.numero_dia}`}
                      className={`flex flex-col items-center justify-center w-28 h-36 rounded-xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        completed
                          ? 'bg-primary/10 border-primary text-primary'
                          : isCurrent
                          ? 'bg-card border-primary shadow-md ring-2 ring-primary/20'
                          : 'bg-card border-border text-foreground hover:border-primary/50'
                      }`}
                    >
                      {completed && <CheckCircle className="h-5 w-5 mb-1 text-primary" />}
                      <span className="text-2xl font-bold">{day.numero_dia}</span>
                      <span className="text-[11px] text-center px-2 mt-1 line-clamp-2 text-muted-foreground">{day.titulo || `Dia ${day.numero_dia}`}</span>
                      {isCurrent && <span className="text-[10px] text-primary font-medium mt-1">Atual</span>}
                    </Link>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-28 h-36 rounded-xl border border-border bg-muted/30 text-muted-foreground/50 cursor-not-allowed opacity-60">
                      <Lock className="h-5 w-5 mb-1" />
                      <span className="text-2xl font-bold">{day.numero_dia}</span>
                      <span className="text-[11px] mt-1">Bloqueado</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      </AnimatedPage>
    </AppLayout>
  );
}
