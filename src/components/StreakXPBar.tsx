import { motion } from 'framer-motion';
import { useUserStats } from '@/hooks/useUserStats';
import { Flame, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function StreakXPBar() {
  const { streak, level, xp, xpForCurrentLevel, xpForNextLevel, xpProgress, xpToday, loading } = useUserStats();

  if (loading) return null;

  const xpInLevel = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;

  return (
    <motion.div
      className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-secondary/70 border border-border"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Streak */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className="flex items-center gap-1 cursor-default"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={streak > 0 ? {
                scale: [1, 1.2, 1],
                filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'],
              } : {}}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            >
              <Flame className={`h-4 w-4 ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
            </motion.div>
            <span className={`text-sm font-bold leading-none ${streak > 0 ? 'text-orange-500' : 'text-muted-foreground/40'}`}>
              {streak}
            </span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {streak > 0 ? `${streak} dia${streak === 1 ? '' : 's'} de streak` : 'Complete todos os hábitos hoje para começar uma streak'}
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-4 bg-border" />

      {/* Nível + XP bar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default">
            {/* Nível badge */}
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none flex-shrink-0">
              {level}
            </div>

            {/* Barra XP */}
            <div className="flex flex-col gap-0.5">
              <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(142_72%_50%)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-2.5 w-2.5 text-primary" />
                <span className="text-[9px] text-muted-foreground leading-none">
                  {xpInLevel}/{xpNeeded} XP
                </span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-0.5">
          <p className="font-semibold">Nível {level}</p>
          <p>{xp} XP total</p>
          {xpToday > 0 && <p className="text-primary">+{xpToday} XP hoje</p>}
          <p className="text-muted-foreground">Faltam {xpForNextLevel - xp} XP para o nível {level + 1}</p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
