import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface XPToastProps {
  amount: number;
  label?: string;
  onDone?: () => void;
}

/** Animação flutuante de +XP que sobe e some */
export function XPPopup({ amount, label, onDone }: XPToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed left-1/2 z-[9999] flex flex-col items-center gap-1"
          style={{ bottom: '5rem' }}
          initial={{ opacity: 0, y: 0, x: '-50%' }}
          animate={{ opacity: 1, y: -60, x: '-50%' }}
          exit={{ opacity: 0, y: -100, x: '-50%' }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 shadow-lg shadow-primary/30">
            <Zap className="h-4 w-4 text-primary-foreground fill-primary-foreground" />
            <span className="text-sm font-bold text-primary-foreground">+{amount} XP</span>
          </div>
          {label && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
              {label}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Hook para exibir animação de XP */
export function useXPGain() {
  const [gains, setGains] = useState<{ id: number; amount: number; label?: string }[]>([]);

  const showXP = (amount: number, label?: string) => {
    const id = Date.now();
    setGains(prev => [...prev, { id, amount, label }]);
  };

  const remove = (id: number) => {
    setGains(prev => prev.filter(g => g.id !== id));
  };

  const GainOverlay = () => (
    <>
      {gains.map(g => (
        <XPPopup key={g.id} amount={g.amount} label={g.label} onDone={() => remove(g.id)} />
      ))}
    </>
  );

  return { showXP, GainOverlay };
}
