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
        <div className="px-8 py-8 md:px-16 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="flex gap-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-[240px] w-[180px] rounded-xl flex-shrink-0" />)}</div>
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

          <div ref={carouselRef} className="flex gap-5 overflow-x-auto scroll-smooth pb-4" style={{ scrollbarWidth: 'none' }}>
            {days.map((day, i) => {
              const completed = completedDays.has(day.numero_dia);
              const isCurrent = currentDay?.id === day.id;
              const isLocked = !day.liberado;

              const cardBg = day.imagem_url ? null : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/8 to-accent/10" />
              );
              const cardImg = day.imagem_url ? (
                <div className="absolute inset-0">
                  <img src={day.imagem_url} alt={day.titulo} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </div>
              ) : null;

              const textColor = day.imagem_url ? 'text-white' : 'text-foreground';
              const subTextColor = day.imagem_url ? 'text-white/80' : 'text-muted-foreground';

              const inner = (
                <>
                  {cardImg}
                  {cardBg}

                  {/* Border overlay */}
                  <div className={`absolute inset-0 rounded-2xl border-2 transition-all duration-300 ${
                    isLocked
                      ? 'border-border/30 group-hover:border-border/50'
                      : 'border-border/30 group-hover:border-[#22C55E] group-hover:shadow-[0_8px_30px_-8px_rgba(34,197,94,0.3)]'
                  }`} />

                  {/* Completed badge — always visible */}
                  {completed && (
                    <div className="absolute top-3 right-3 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-[#22C55E] text-white shadow-md">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </div>
                  )}

                  {/* Locked hover overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all duration-300 rounded-2xl">
                      <Lock className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="text-white text-xs font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Conteúdo bloqueado
                      </span>
                    </div>
                  )}

                  {/* Unlocked hover overlay — CTA button */}
                  {!isLocked && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                      <span className="bg-[#22C55E] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
                        {completed ? 'Ver novamente →' : 'Acessar dia →'}
                      </span>
                    </div>
                  )}

                  {/* Main content */}
                  <div className="relative flex flex-col items-center justify-center h-full p-4 text-center z-10 pointer-events-none">
                    <span className={`text-4xl font-bold leading-none ${textColor}`}>
                      {day.numero_dia}
                    </span>
                    <span className={`text-xs mt-2 line-clamp-2 font-medium ${subTextColor}`}>
                      {day.titulo || `Dia ${day.numero_dia}`}
                    </span>
                    {isCurrent && !isLocked && (
                      <span className={`text-[10px] font-semibold mt-2 ${day.imagem_url ? 'text-white' : 'text-primary'}`}>
                        ▶ Atual
                      </span>
                    )}
                  </div>
                </>
              );

              return (
                <motion.div
                  key={day.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex-shrink-0"
                >
                  {isLocked ? (
                    <div
                      className="group relative overflow-hidden rounded-2xl cursor-not-allowed transition-all duration-300"
                      style={{ width: '180px', height: '240px' }}
                    >
                      {inner}
                    </div>
                  ) : (
                    <Link
                      to={`/app/desafios/${challenge.id}/dia/${day.numero_dia}`}
                      className="group relative block overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03]"
                      style={{ width: '180px', height: '240px' }}
                    >
                      {inner}
                    </Link>
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
