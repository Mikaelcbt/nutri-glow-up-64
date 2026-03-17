import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { fadeInUp } from '@/components/AnimatedPage';
import confetti from 'canvas-confetti';

interface Habit {
  id: string;
  titulo: string;
  icone: string;
  ordem: number;
}

interface HabitRecord {
  habito_id: string;
  concluido: boolean;
}

export default function HabitsChecklist() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [prevCompleted, setPrevCompleted] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  const loadHabits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: habitsData } = await supabase
        .from('habitos')
        .select('id, titulo, icone, ordem')
        .eq('ativo', true)
        .order('ordem');

      if (!habitsData?.length) {
        setHabits([]);
        setLoading(false);
        return;
      }
      setHabits(habitsData);

      const { data: recordsData } = await supabase
        .from('habitos_registro')
        .select('habito_id, concluido')
        .eq('user_id', user.id)
        .eq('data', today);

      const map: Record<string, boolean> = {};
      (recordsData || []).forEach(r => { map[r.habito_id] = r.concluido; });
      setRecords(map);
      setPrevCompleted(Object.values(map).filter(Boolean).length);
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
      if (completedCount === habits.length && habits.length > 0 && prevCompleted < habits.length) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22C55E', '#16A34A', '#DCFCE7', '#D4AF37'],
        });
        setPrevCompleted(completedCount);
      }
    } catch (err) {
      console.error('[Habits] Toggle error:', err);
      setRecords(records); // revert
    }
  };

  if (loading || habits.length === 0) return null;

  const completedCount = Object.values(records).filter(Boolean).length;
  const progressPct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <motion.section
      className="px-8 py-8 md:px-16"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <h2 className="font-display text-2xl font-semibold text-foreground mb-1">
        Seus hábitos de hoje
      </h2>
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

        {completedCount === habits.length && habits.length > 0 && (
          <motion.p
            className="text-center text-sm font-semibold text-primary pt-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            🎉 Parabéns! Todos os hábitos concluídos!
          </motion.p>
        )}
      </div>
    </motion.section>
  );
}
