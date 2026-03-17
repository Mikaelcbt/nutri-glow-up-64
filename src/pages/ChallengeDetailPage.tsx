import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lock, Calendar, Check } from 'lucide-react';

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
  imagem_url?: string;
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
        <div className="px-4 py-8 md:px-16 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl shimmer" />
          <div className="grid grid-cols-3 md:flex gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[140px] md:h-[240px] md:w-[180px] rounded-xl shimmer" />)}
          </div>
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
  const currentDay = days.find(d => d.liberado && !completedDays.has(d.numero_dia));

  const renderDayCard = (day: ChallengeDay, i: number, size: 'sm' | 'lg') => {
    const completed = completedDays.has(day.numero_dia);
    const isCurrent = currentDay?.id === day.id;
    const isLocked = !day.liberado;
    const isSmall = size === 'sm';

    const inner = (
      <div className={`relative overflow-hidden rounded-xl ${isSmall ? 'h-[140px]' : 'h-[240px] w-[180px]'} ${isCurrent && !isLocked ? 'ring-2 ring-primary' : ''}`}>
        {/* Background */}
        {day.imagem_url ? (
          <>
            <img src={day.imagem_url} alt={day.titulo} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        ) : (
          <div className={`absolute inset-0 ${isLocked ? 'bg-muted/40' : 'bg-gradient-to-br from-primary/15 via-accent/25 to-primary/10'}`} />
        )}

        {/* Locked overlay */}
        {isLocked && (
          <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-foreground/5 ${isSmall ? '' : 'group-hover:bg-black/40'} transition-all duration-300 rounded-xl`}>
            <Lock className={`text-muted-foreground ${isSmall ? 'h-4 w-4' : 'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white'}`} />
            {!isSmall && <span className="text-white text-xs font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Bloqueado</span>}
          </div>
        )}

        {/* Completed badge */}
        {completed && (
          <div className={`absolute top-2 right-2 z-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ${isSmall ? 'w-5 h-5' : 'w-7 h-7'}`}>
            <Check className={isSmall ? 'h-3 w-3' : 'h-4 w-4'} strokeWidth={3} />
          </div>
        )}

        {/* Unlocked hover CTA (desktop only) */}
        {!isLocked && !isSmall && (
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
              {completed ? 'Ver novamente →' : 'Acessar dia →'}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center z-10 pointer-events-none">
          <span className={`font-display font-bold leading-none ${day.imagem_url ? 'text-white' : 'text-foreground'} ${isSmall ? 'text-3xl' : 'text-5xl'}`}>
            {day.numero_dia}
          </span>
          <span className={`mt-1 line-clamp-1 font-medium ${day.imagem_url ? 'text-white/80' : 'text-muted-foreground'} ${isSmall ? 'text-[9px]' : 'text-xs mt-2 line-clamp-2'}`}>
            {day.titulo || `Dia ${day.numero_dia}`}
          </span>
          {isCurrent && !isLocked && (
            <span className={`font-semibold text-primary mt-0.5 ${isSmall ? 'text-[8px]' : 'text-[10px] mt-2'}`}>▶ Atual</span>
          )}
        </div>
      </div>
    );

    return (
      <motion.div
        key={day.id}
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] }}
        className={isSmall ? '' : 'flex-shrink-0'}
      >
        {isLocked ? (
          <div className={`group cursor-not-allowed ${!isSmall ? 'transition-all duration-300' : ''}`}>{inner}</div>
        ) : (
          <Link
            to={`/app/desafios/${challenge.id}/dia/${day.numero_dia}`}
            className={`group block ${!isSmall ? 'transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03]' : ''}`}
          >
            {inner}
          </Link>
        )}
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <AnimatedPage>
        {/* Hero */}
        <section className="relative h-[40vh] w-full overflow-hidden">
          <div className="absolute inset-0">
            {challenge.imagem_capa_url ? (
              <img src={challenge.imagem_capa_url} alt={challenge.titulo} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/20 via-accent to-primary/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </div>
          <div className="relative flex h-full items-end px-4 pb-6 md:px-16 md:pb-8">
            <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-3 w-full max-w-2xl">
              <Link to="/app/desafios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Voltar</Link>
              <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground">{challenge.titulo}</h1>
              <p className="text-muted-foreground text-sm md:text-base">{challenge.descricao}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {challenge.total_dias} dias</span>
                <span>{releasedDays} liberados</span>
                {completedCount > 0 && <span className="text-primary font-medium">{completedCount} concluídos</span>}
              </div>
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

        {/* Days */}
        <section className="px-4 py-6 md:px-16 md:py-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">Dias do Desafio</h2>
            <div className="hidden md:flex gap-2">
              <button onClick={() => scroll('left')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-all"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => scroll('right')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-all"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>

          {/* Mobile: 3-column grid */}
          <div className="grid grid-cols-3 gap-3 md:hidden">
            {days.map((day, i) => renderDayCard(day, i, 'sm'))}
          </div>

          {/* Desktop: carousel */}
          <div ref={carouselRef} className="hidden md:flex gap-5 overflow-x-auto scroll-smooth pb-4" style={{ scrollbarWidth: 'none' }}>
            {days.map((day, i) => renderDayCard(day, i, 'lg'))}
          </div>
        </section>
      </AnimatedPage>
    </AppLayout>
  );
}
