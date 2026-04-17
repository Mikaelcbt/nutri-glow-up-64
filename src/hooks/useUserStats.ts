import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createElement } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface UserStats {
  streak: number;
  xp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpProgress: number;
  xpToday: number;
  loading: boolean;
}

/** XP por ação */
export const XP_VALUES = {
  LESSON: 20,
  CHALLENGE_DAY: 15,
  HABIT: 5,
  STREAK_BONUS: 10,
} as const;

/** XP total necessário para atingir o nível N */
function xpForLevel(level: number): number {
  return Math.floor(50 * level * (level - 1));
}

/** Nível baseado no XP total */
function computeLevel(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level++;
  return level;
}

/**
 * Calcula dias consecutivos de streak a partir de um mapa date → count.
 * Um dia é "completo" quando count >= totalRequired.
 * Conta a partir de hoje (ou ontem se hoje ainda não está completo) para trás.
 *
 * Exportado para reuso em RankingPage.
 */
export function computeConsecutiveStreak(
  dateCountMap: Record<string, number>,
  totalRequired: number,
  today: string,
): number {
  if (totalRequired === 0 || Object.keys(dateCountMap).length === 0) return 0;

  const checkDate = new Date(today + 'T12:00:00');
  const todayCount = dateCountMap[today] ?? 0;

  // Se hoje ainda não completou todos, começa a contar de ontem
  if (todayCount < totalRequired) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if ((dateCountMap[dateStr] ?? 0) >= totalRequired) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── Context ──────────────────────────────────────────────────────────────────

const defaultStats: UserStats = {
  streak: 0, xp: 0, level: 1,
  xpForCurrentLevel: 0, xpForNextLevel: 100,
  xpProgress: 0, xpToday: 0, loading: true,
};

interface UserStatsContextType {
  stats: UserStats;
  refreshStats: () => void;
}

const UserStatsContext = createContext<UserStatsContextType>({
  stats: defaultStats,
  refreshStats: () => {},
});

export function UserStatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>(defaultStats);

  const compute = useCallback(async () => {
    if (!user) {
      setStats(s => ({ ...s, loading: false }));
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const [lessonsRes, challengeDaysRes, habitsRes, habitsRegistroRes] = await Promise.all([
      supabase
        .from('rastreamento_progresso')
        .select('concluido_em')
        .eq('user_id', user.id)
        .eq('concluido', true)
        .limit(1000),
      supabase
        .from('desafio_progresso')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('concluido', true)
        .limit(1000),
      supabase
        .from('habitos')
        .select('id')
        .eq('ativo', true)
        .limit(100),
      supabase
        .from('habitos_registro')
        .select('habito_id, data')
        .eq('user_id', user.id)
        .eq('concluido', true)
        .order('data', { ascending: false })
        .limit(500),
    ]);

    const totalLessons = lessonsRes.data?.length ?? 0;
    const totalChallengeDays = challengeDaysRes.data?.length ?? 0;
    const totalHabits = habitsRes.data?.length ?? 0;

    // ── Streak ──────────────────────────────────────────────────────────────
    let streak = 0;
    const habitsByDate: Record<string, number> = {};

    if (totalHabits > 0 && habitsRegistroRes.data?.length) {
      for (const r of habitsRegistroRes.data) {
        habitsByDate[r.data] = (habitsByDate[r.data] ?? 0) + 1;
      }
      streak = computeConsecutiveStreak(habitsByDate, totalHabits, today);
    }

    // ── XP ──────────────────────────────────────────────────────────────────
    const xpFromLessons = totalLessons * XP_VALUES.LESSON;
    const xpFromChallengeDays = totalChallengeDays * XP_VALUES.CHALLENGE_DAY;

    const completeDays = Object.values(habitsByDate).filter(c => c >= totalHabits).length;
    const xpFromHabits = completeDays * totalHabits * XP_VALUES.HABIT;
    const xpFromStreak = streak * XP_VALUES.STREAK_BONUS;
    const totalXp = xpFromLessons + xpFromChallengeDays + xpFromHabits + xpFromStreak;

    // ── XP hoje ─────────────────────────────────────────────────────────────
    const lessonsToday = lessonsRes.data?.filter(l => l.concluido_em?.startsWith(today)).length ?? 0;
    const challengesToday = challengeDaysRes.data?.filter(c => c.created_at?.startsWith(today)).length ?? 0;
    const habitsToday = habitsRegistroRes.data?.filter(h => h.data === today).length ?? 0;
    const xpToday =
      lessonsToday * XP_VALUES.LESSON +
      challengesToday * XP_VALUES.CHALLENGE_DAY +
      habitsToday * XP_VALUES.HABIT;

    // ── Nível ────────────────────────────────────────────────────────────────
    const level = computeLevel(totalXp);
    const xpForCurrentLevel = xpForLevel(level);
    const xpForNextLevel = xpForLevel(level + 1);
    const xpProgress =
      xpForNextLevel > xpForCurrentLevel
        ? Math.round(((totalXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100)
        : 100;

    setStats({
      streak, xp: totalXp, level,
      xpForCurrentLevel, xpForNextLevel,
      xpProgress, xpToday, loading: false,
    });
  }, [user]);

  useEffect(() => { compute(); }, [compute]);

  // Reset to loading state when user changes
  useEffect(() => {
    setStats(defaultStats);
  }, [user?.id]);

  return createElement(
    UserStatsContext.Provider,
    { value: { stats, refreshStats: compute } },
    children,
  );
}

/**
 * Hook para consumir stats de gamificação.
 * Retorna os stats + refreshStats() para forçar recálculo após ações do usuário.
 */
export function useUserStats(): UserStats & { refreshStats: () => void } {
  const { stats, refreshStats } = useContext(UserStatsContext);
  return { ...stats, refreshStats };
}
