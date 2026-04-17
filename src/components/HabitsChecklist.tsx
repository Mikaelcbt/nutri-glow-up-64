import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { fadeInUp } from '@/components/AnimatedPage';
import { useXPGain } from '@/components/XPToast';
import { XP_VALUES, useUserStats } from '@/hooks/useUserStats';
import confetti from 'canvas-confetti';

interface Habit {
  id: string;
  titulo: string;
  icone: string;
  ordem: number;
}

export default function HabitsChecklist() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [prevCompleted, setPrevCompleted] = useState(0);
  const { showXP, GainOverlay } = useXPGain();
  const { refreshStats } = useUserStats();
  // Rastreia quais hábitos já ganharam XP nesta sessão (inclui os já marcados ao carregar)
  const xpEarnedRef = useRef<Set<string>>(new Set());

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [habitsRes, recordsRes] = await Promise.all([
        supabase
          .from('habitos')
          .select('id, titulo, icone, ordem')
          .eq('ativo', true)
          .order('ordem')
          .limit(50),
        supabase
          .from('habitos_registro')
          .select('habito_id, concluido')
          .eq('user_id', user.id)
          .eq('data', today)
          .limit(100),
      ]);

      if (!habitsRes.data?.length) {
        setHabits([]);
        setLoading(false);
        return;
      }
      setHabits(habitsRes.data);

      const map: Record<string, boolean> = {};
      (recordsRes.data || []).forEach(r => { map[r.habito_id] = r.concluido; });
      setRecords(map);
      const completedCount = Object.values(map).filter(Boolean).length;
      setPrevCompleted(completedCount);
      // Pré-popula hábitos já marcados para não dar XP novamente
      xpEarnedRef.current = new Set(
        Object.entries(map).filter(([, v]) => v).map(([k]) => k)
      );
    } catch (err) {
      console.error('[Habits] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => { loadHabits(); }, [loadHabits]);

  const toggleHabit = async (habitId: string, checked: boolean) => {
    if (!user) return;
    const newRecords = { ...records, [habitId]: checked };
    setRecords(newRecords);

    try {
      await supabase.from('habitos_registro').upsert(
        { user_id: user.id, habito_id: habitId, data: today, concluido: checked },
        { onConflict: 'user_id,habito_id,data' }
      );

      const completedCount = Object.values(newRecords).filter(Boolean).length;

      // XP idempotente: apenas uma vez por hábito por sessão
      if (checked && !xpEarnedRef.current.has(habitId)) {
        xpEarnedRef.current.add(habitId);
        showXP(XP_VALUES.HABIT, 'Hábito concluído');
        refreshStats();
      }

      if (completedCount === habits.length && habits.length > 0 && prevCompleted < habits.length) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#22C55E', '#16A34A', '#DCFCE7', '#D4AF37'],
        });
        setPrevCompleted(completedCount);
      }
    } catch (err) {
      console.error('[Habits] Toggle error:', err);
      setRecords(records);
    }
  };

  if (loading || habits.length === 0) return null;

  const completedCount = Object.values(records).filter(Boolean).length;
  const progressPct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <>
      <GainOverlay />
      <motion.section
        className="px-4 py-6 md:px-16 md:py-8"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Seus hábitos de hoje
          </h2>
          {completedCount === habits.length && habits.length > 0 && (
            <motion.span
              className="text-sm font-semibold text-primary"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              🎉 Tudo feito!
            </motion.span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {completedCount} de {habits.length} hábitos concluídos hoje
        </p>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="space-y-1">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5 }}
              style={{ transformOrigin: 'left' }}
            >
              <Progress value={progressPct} className="h-2.5" />
            </motion.div>
            <p className="text-xs text-right text-primary font-bold">{progressPct}%</p>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {habits.map((habit, i) => {
                const isChecked = !!records[habit.id];
                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`flex items-center gap-3.5 rounded-xl px-4 py-3 transition-all duration-300 cursor-pointer ${
                      isChecked
                        ? 'bg-accent/60 border border-primary/20'
                        : 'bg-secondary/50 border border-transparent hover:border-border'
                    }`}
                    onClick={() => toggleHabit(habit.id, !isChecked)}
                  >
                    <span className="text-xl flex-shrink-0">{habit.icone}</span>
                    <span className={`text-sm font-medium flex-1 transition-all duration-200 ${
                      isChecked ? 'text-primary line-through' : 'text-foreground'
                    }`}>
                      {habit.titulo}
                    </span>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => toggleHabit(habit.id, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5"
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>
    </>
  );
}
