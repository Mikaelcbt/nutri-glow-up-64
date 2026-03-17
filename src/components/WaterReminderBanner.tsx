import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const WATER_HABIT_TITLE = 'Beber 2L de água';
const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const AUTO_DISMISS_MS = 30 * 1000; // 30 seconds

export default function WaterReminderBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [waterHabitId, setWaterHabitId] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const isEnabled = () => {
    const pref = localStorage.getItem('water_reminder_enabled');
    return pref === null || pref === 'true';
  };

  const checkWaterHabit = useCallback(async () => {
    if (!user || !isEnabled()) return;

    // Find the water habit
    const { data: habits } = await supabase
      .from('habitos')
      .select('id, titulo')
      .eq('ativo', true)
      .ilike('titulo', `%água%`);

    const waterHabit = habits?.[0];
    if (!waterHabit) return;
    setWaterHabitId(waterHabit.id);

    // Check if already completed today
    const { data: record } = await supabase
      .from('habitos_registro')
      .select('concluido')
      .eq('user_id', user.id)
      .eq('habito_id', waterHabit.id)
      .eq('data', today)
      .maybeSingle();

    if (record?.concluido) {
      setAlreadyDone(true);
      setVisible(false);
      return;
    }

    setAlreadyDone(false);
    setVisible(true);
  }, [user, today]);

  useEffect(() => {
    // Initial check after a short delay
    const initialTimeout = setTimeout(checkWaterHabit, 3000);

    // Repeat every hour
    const interval = setInterval(() => {
      if (isEnabled()) checkWaterHabit();
    }, REMINDER_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkWaterHabit]);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  const markDone = async () => {
    if (!user || !waterHabitId) return;
    setVisible(false);
    setAlreadyDone(true);

    await supabase.from('habitos_registro').upsert(
      { user_id: user.id, habito_id: waterHabitId, data: today, concluido: true },
      { onConflict: 'user_id,habito_id,data' }
    );
  };

  if (!visible || alreadyDone) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="mx-4 md:mx-16 mt-4 rounded-2xl border border-primary/20 bg-accent/60 backdrop-blur-sm px-4 md:px-5 py-3 md:py-3.5 flex items-center gap-3 shadow-card"
        >
          <span className="text-2xl">💧</span>
          <span className="text-sm font-medium text-foreground flex-1">
            Hora de beber água! Mantenha-se hidratado para melhores resultados.
          </span>
          <Button
            size="sm"
            onClick={markDone}
            className="bg-gradient-to-r from-primary to-[hsl(142_72%_37%)] text-primary-foreground text-xs font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"
          >
            Já bebi! ✓
          </Button>
          <button
            onClick={() => setVisible(false)}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
