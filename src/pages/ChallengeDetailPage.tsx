import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Calendar, Check, Lock, Play, Star } from 'lucide-react';

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

// Padrão de ziguezague: quantos nós por linha e se está invertido
function getRowLayout(dayIndex: number): { row: number; col: number; reversed: boolean } {
  const COLS = 3;
  const row = Math.floor(dayIndex / COLS);
  const col = dayIndex % COLS;
  const reversed = row % 2 === 1;
  return { row, col: reversed ? COLS - 1 - col : col, reversed };
}

interface DayNodeProps {
  day: ChallengeDay;
  index: number;
  completed: boolean;
  isCurrent: boolean;
  challengeId: string;
}

function DayNode({ day, index, completed, isCurrent, challengeId }: DayNodeProps) {
  const isLocked = !day.liberado;

  const nodeContent = (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Número do dia acima */}
      <span className={`text-[10px] font-bold mb-1 ${isLocked ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
        {day.numero_dia}
      </span>

      {/* Nó principal */}
      <div className="relative">
        {/* Anel de brilho no atual */}
        {isCurrent && !isLocked && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        )}

        <div className={`
          relative flex items-center justify-center rounded-full transition-all duration-300 shadow-md
          ${completed
            ? 'w-14 h-14 bg-gradient-to-br from-primary to-[hsl(142_72%_37%)] text-primary-foreground'
            : isCurrent && !isLocked
            ? 'w-16 h-16 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground ring-4 ring-primary/30'
            : isLocked
            ? 'w-12 h-12 bg-secondary text-muted-foreground/40 border border-border'
            : 'w-14 h-14 bg-card text-foreground border-2 border-primary/60'
          }
        `}>
          {completed ? (
            <Check className="h-6 w-6" strokeWidth={3} />
          ) : isLocked ? (
            <Lock className="h-4 w-4" />
          ) : isCurrent ? (
            <Play className="h-6 w-6 fill-current ml-0.5" />
          ) : (
            <span className="font-display font-bold text-lg">{day.numero_dia}</span>
          )}
        </div>

        {/* Badge "atual" */}
        {isCurrent && !isLocked && (
          <motion.div
            className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Hoje
          </motion.div>
        )}
      </div>

      {/* Título embaixo */}
      {!isLocked && (
        <span className={`text-[10px] text-center mt-1.5 max-w-[72px] leading-tight ${completed ? 'text-primary' : 'text-muted-foreground'} line-clamp-2`}>
          {day.titulo || `Dia ${day.numero_dia}`}
        </span>
      )}
    </motion.div>
  );

  if (isLocked) {
    return <div className="flex justify-center">{nodeContent}</div>;
  }

  return (
    <Link
      to={`/app/desafios/${challengeId}/dia/${day.numero_dia}`}
      className="flex justify-center group"
    >
      {nodeContent}
    </Link>
  );
}

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<ChallengeDay[]>([]);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id, user]);

  const loadData = async () => {
    const [challengeRes, daysRes] = await Promise.all([
      supabase.from('desafios').select('*').eq('id', id).single(),
      supabase.from('desafio_dias').select('*').eq('desafio_id', id).order('numero_dia').limit(365),
    ]);

    if (challengeRes.data) setChallenge(challengeRes.data);
    if (daysRes.data) setDays(daysRes.data);

    if (user) {
      const { data: progress } = await supabase
        .from('desafio_progresso')
        .select('numero_dia')
        .eq('desafio_id', id)
        .eq('user_id', user.id)
        .eq('concluido', true)
        .limit(365);
      if (progress) setCompletedDays(new Set(progress.map(p => p.numero_dia)));
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-8 md:px-16 space-y-6 max-w-2xl mx-auto">
          <Skeleton className="h-56 w-full rounded-2xl shimmer" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl shimmer" />
            ))}
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

  const completedCount = completedDays.size;
  const releasedDays = days.filter(d => d.liberado).length;
  const progressPct = challenge.total_dias > 0 ? Math.round((completedCount / challenge.total_dias) * 100) : 0;
  const currentDay = days.find(d => d.liberado && !completedDays.has(d.numero_dia));

  // Organiza dias em linhas de 3 com ziguezague
  const COLS = 3;
  const rows: ChallengeDay[][] = [];
  for (let i = 0; i < days.length; i += COLS) {
    const chunk = days.slice(i, i + COLS);
    const rowIndex = Math.floor(i / COLS);
    rows.push(rowIndex % 2 === 1 ? [...chunk].reverse() : chunk);
  }

  return (
    <AppLayout>
      <AnimatedPage>
        {/* Hero */}
        <section className="relative h-[38vh] w-full overflow-hidden">
          <div className="absolute inset-0">
            {challenge.imagem_capa_url ? (
              <img src={challenge.imagem_capa_url} alt={challenge.titulo} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/20 via-accent to-primary/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
          </div>
          <div className="relative flex h-full items-end px-4 pb-5 md:px-16 md:pb-8">
            <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-2 w-full max-w-2xl">
              <Link to="/app/desafios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Voltar
              </Link>
              <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground leading-tight">
                {challenge.titulo}
              </h1>
              <p className="text-muted-foreground text-sm md:text-base line-clamp-2">{challenge.descricao}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {challenge.total_dias} dias</span>
                <span className="flex items-center gap-1 text-primary"><Star className="h-4 w-4 fill-current" /> {releasedDays} liberados</span>
                {completedCount > 0 && (
                  <span className="flex items-center gap-1 text-primary font-semibold">
                    <Check className="h-4 w-4" /> {completedCount} concluídos
                  </span>
                )}
              </div>
              {completedCount > 0 && (
                <div className="flex items-center gap-3 max-w-md">
                  <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(142_72%_50%)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <span className="text-xs font-bold text-primary">{progressPct}%</span>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Mapa de dias — trilha */}
        <section className="px-4 py-8 md:px-16 md:py-10 max-w-2xl mx-auto">
          <motion.h2
            className="font-display text-xl md:text-2xl font-semibold text-foreground mb-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Sua trilha
          </motion.h2>

          <div className="relative space-y-2">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="relative">
                {/* Linha conectora vertical entre linhas */}
                {rowIdx < rows.length - 1 && (
                  <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-border"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: rowIdx * 0.1 + 0.4, duration: 0.3 }}
                    style={{ transformOrigin: 'top' }}
                  />
                )}

                {/* Linha de nós */}
                <div className="grid grid-cols-3 gap-2 items-end py-3">
                  {/* Linha conectora horizontal */}
                  <div className="col-span-3 relative h-0">
                    {row.length > 1 && (
                      <motion.div
                        className="absolute top-0 bg-border h-0.5"
                        style={{ left: '16.66%', right: '16.66%', top: '-1.75rem' }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: rowIdx * 0.1 + 0.2, duration: 0.4 }}
                        aria-hidden
                      />
                    )}
                  </div>

                  {row.map((day, colIdx) => {
                    const globalIndex = rowIdx * COLS + colIdx;
                    return (
                      <DayNode
                        key={day.id}
                        day={day}
                        index={globalIndex}
                        completed={completedDays.has(day.numero_dia)}
                        isCurrent={currentDay?.id === day.id}
                        challengeId={challenge.id}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {days.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">Os dias ainda não foram configurados.</p>
            </div>
          )}

          {/* Conclusão total */}
          {completedCount > 0 && completedCount === challenge.total_dias && (
            <motion.div
              className="mt-8 text-center rounded-2xl border border-primary/30 bg-accent/40 p-6 space-y-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              <p className="text-4xl">🏆</p>
              <p className="font-display text-xl font-semibold text-foreground">Desafio concluído!</p>
              <p className="text-sm text-muted-foreground">Parabéns por completar todos os {challenge.total_dias} dias.</p>
            </motion.div>
          )}
        </section>
      </AnimatedPage>
    </AppLayout>
  );
}
