import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flame, Zap, ArrowRight, Trophy } from 'lucide-react';
import { useUserStats } from '@/hooks/useUserStats';
import { Button } from '@/components/ui/button';

interface TodayCardProps {
  habitsCompleted: number;
  habitsTotal: number;
  nextLessonId?: string | null;
  nextLessonTitle?: string | null;
  activeChallengeId?: string | null;
  activeChallengeTitle?: string | null;
}

export default function TodayCard({
  habitsCompleted,
  habitsTotal,
  nextLessonId,
  nextLessonTitle,
  activeChallengeId,
  activeChallengeTitle,
}: TodayCardProps) {
  const { streak, level, xp, xpProgress, xpToday, loading } = useUserStats();

  if (loading) return null;

  const allHabitsDone = habitsTotal > 0 && habitsCompleted >= habitsTotal;
  const habitsPct = habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0;

  return (
    <motion.section
      className="px-4 pt-4 pb-2 md:px-16 md:pt-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-accent/60 via-card to-card p-5 shadow-card overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        {/* Top row: Streak + XP hoje */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Hoje</p>
            <div className="flex items-center gap-3">
              {/* Streak */}
              <motion.div
                className="flex items-center gap-1.5"
                animate={streak > 0 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              >
                <Flame className={`h-5 w-5 ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground/30'}`} />
                <span className={`font-display text-2xl font-bold leading-none ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground/30'}`}>
                  {streak}
                </span>
                <span className="text-xs text-muted-foreground">dia{streak !== 1 ? 's' : ''}</span>
              </motion.div>

              <div className="w-px h-6 bg-border" />

              {/* Nível */}
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                  {level}
                </div>
                <span className="text-xs text-muted-foreground">nível</span>
              </div>
            </div>
          </div>

          {/* XP hoje */}
          {xpToday > 0 && (
            <motion.div
              className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <Zap className="h-3.5 w-3.5 text-primary fill-primary" />
              <span className="text-xs font-bold text-primary">+{xpToday} XP hoje</span>
            </motion.div>
          )}
        </div>

        {/* XP bar */}
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(142_72%_50%)]"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{xp} XP • Nível {level + 1} em breve</p>
        </div>

        {/* Hábitos de hoje */}
        {habitsTotal > 0 && (
          <div className="mb-4 rounded-xl bg-background/60 px-4 py-3 flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${allHabitsDone ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {allHabitsDone ? '✓' : `${habitsCompleted}/${habitsTotal}`}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-none mb-1">
                {allHabitsDone ? 'Hábitos completos! 🎉' : 'Hábitos de hoje'}
              </p>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${habitsPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
            <span className="text-xs font-bold text-primary">{habitsPct}%</span>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-2 flex-wrap">
          {nextLessonId && (
            <Button asChild size="sm" className="flex-1 min-w-[140px] btn-ripple bg-gradient-to-r from-primary to-[hsl(142_72%_37%)] shadow-sm text-xs font-semibold">
              <Link to={`/app/aula/${nextLessonId}`}>
                Continuar aula <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {activeChallengeId && (
            <Button asChild size="sm" variant="outline" className="flex-1 min-w-[140px] border-primary/30 text-primary text-xs font-semibold hover:bg-accent">
              <Link to={`/app/desafios/${activeChallengeId}`}>
                <Trophy className="mr-1.5 h-3.5 w-3.5" />
                {activeChallengeTitle ? activeChallengeTitle.slice(0, 20) : 'Ver desafio'}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
