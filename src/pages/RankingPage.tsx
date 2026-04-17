import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { XP_VALUES, computeConsecutiveStreak } from '@/hooks/useUserStats';
import { Button } from '@/components/ui/button';

interface RankEntry {
  userId: string;
  nome: string;
  avatar_url: string | null;
  xp: number;
  streak: number;
  lessons: number;
  challengeDays: number;
}

const MEDAL_COLORS = ['text-[hsl(43_72%_52%)]', 'text-slate-400', 'text-amber-700'];
const MEDAL_BG = ['bg-[hsl(43_72%_52%)]/15', 'bg-slate-400/15', 'bg-amber-700/15'];

export default function RankingPage() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => { loadRanking(); }, []);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [lessonsRes, challengeRes, habitsRes, habitsRegistroRes, profilesRes] = await Promise.all([
        supabase.from('rastreamento_progresso').select('user_id').eq('concluido', true).limit(5000),
        supabase.from('desafio_progresso').select('user_id').eq('concluido', true).limit(5000),
        supabase.from('habitos').select('id').eq('ativo', true).limit(100),
        // Seleciona habito_id para poder contar por (user_id, data)
        supabase.from('habitos_registro').select('user_id, data, habito_id').eq('concluido', true).limit(10000),
        supabase.from('profiles').select('id, nome_completo, avatar_url').limit(200),
      ]);

      const totalHabits = habitsRes.data?.length ?? 0;

      // Aulas por usuário
      const lessonsByUser = new Map<string, number>();
      for (const r of lessonsRes.data ?? []) {
        lessonsByUser.set(r.user_id, (lessonsByUser.get(r.user_id) ?? 0) + 1);
      }

      // Dias de desafio por usuário
      const challengeByUser = new Map<string, number>();
      for (const r of challengeRes.data ?? []) {
        challengeByUser.set(r.user_id, (challengeByUser.get(r.user_id) ?? 0) + 1);
      }

      // Hábitos: contagem por (user_id, data) para calcular dias completos e streak correto
      // Map: user_id → (date → count)
      const habitCountByUserDay = new Map<string, Map<string, number>>();
      for (const r of habitsRegistroRes.data ?? []) {
        if (!habitCountByUserDay.has(r.user_id)) habitCountByUserDay.set(r.user_id, new Map());
        const dayMap = habitCountByUserDay.get(r.user_id)!;
        // Contamos registros únicos por (user_id, habito_id, data) — cada row é 1 hábito feito
        dayMap.set(r.data, (dayMap.get(r.data) ?? 0) + 1);
      }

      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) ?? []);
      const allUserIds = new Set([
        ...lessonsByUser.keys(),
        ...challengeByUser.keys(),
        ...habitCountByUserDay.keys(),
      ]);

      const entries: RankEntry[] = [];
      for (const uid of allUserIds) {
        const profile = profileMap.get(uid);
        if (!profile) continue;

        const lessons = lessonsByUser.get(uid) ?? 0;
        const challengeDays = challengeByUser.get(uid) ?? 0;
        const dayMap = habitCountByUserDay.get(uid) ?? new Map<string, number>();

        // Dias completos (todos os hábitos feitos no dia)
        const completeDays = totalHabits > 0
          ? [...dayMap.values()].filter(count => count >= totalHabits).length
          : 0;

        // Streak real: dias consecutivos com todos os hábitos
        let streak = 0;
        if (totalHabits > 0 && dayMap.size > 0) {
          const dateCountRecord: Record<string, number> = Object.fromEntries(dayMap);
          streak = computeConsecutiveStreak(dateCountRecord, totalHabits, today);
        }

        const xp =
          lessons * XP_VALUES.LESSON +
          challengeDays * XP_VALUES.CHALLENGE_DAY +
          completeDays * totalHabits * XP_VALUES.HABIT +
          streak * XP_VALUES.STREAK_BONUS;

        entries.push({
          userId: uid,
          nome: profile.nome_completo ?? 'Usuária',
          avatar_url: profile.avatar_url,
          xp, streak, lessons, challengeDays,
        });
      }

      entries.sort((a, b) => b.xp - a.xp);
      setRanking(entries.slice(0, 50));

      if (user) {
        const pos = entries.findIndex(e => e.userId === user.id);
        setMyRank(pos >= 0 ? pos + 1 : null);
      }
    } catch (err) {
      console.error('[Ranking] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <AnimatedPage>
        <div className="px-4 py-6 md:px-16 md:py-8 max-w-2xl mx-auto">
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="mb-8 text-center">
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground">Ranking</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">Top alunas por XP acumulado</p>

            <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
              {myRank && (
                <motion.div
                  className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 text-sm font-semibold text-primary"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Trophy className="h-4 w-4" />
                  Você está em #{myRank}
                </motion.div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={loadRanking}
                disabled={loading}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </motion.div>

          {/* Top 3 pódio */}
          {!loading && ranking.length >= 3 && (
            <motion.div
              className="flex items-end justify-center gap-3 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <PodiumCard entry={ranking[1]} position={2} />
              <PodiumCard entry={ranking[0]} position={1} tall />
              <PodiumCard entry={ranking[2]} position={3} />
            </motion.div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl shimmer" />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">Ainda não há dados suficientes para o ranking.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranking.slice(3).map((entry, i) => {
                const rank = i + 4;
                const isMe = entry.userId === user?.id;
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 + 0.2 }}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                      isMe
                        ? 'border-primary/40 bg-accent/40 shadow-card'
                        : 'border-border bg-card hover:border-primary/20'
                    }`}
                  >
                    <span className="w-7 text-center text-sm font-bold text-muted-foreground">
                      #{rank}
                    </span>
                    <Avatar className="h-9 w-9 border border-border flex-shrink-0">
                      {entry.avatar_url && <AvatarImage src={entry.avatar_url} alt="" className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {entry.nome.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                        {entry.nome}{isMe ? ' (você)' : ''}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span>{entry.lessons} aulas</span>
                        <span>{entry.challengeDays} desafios</span>
                        {entry.streak > 0 && (
                          <span className="flex items-center gap-0.5 text-orange-500">
                            <Flame className="h-2.5 w-2.5" />{entry.streak}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-bold text-sm flex-shrink-0">
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      {entry.xp.toLocaleString('pt-BR')}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}

function PodiumCard({ entry, position, tall = false }: { entry: RankEntry; position: number; tall?: boolean }) {
  const medalColor = MEDAL_COLORS[position - 1];
  const medalBg = MEDAL_BG[position - 1];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div
      className={`flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-card flex-1 max-w-[120px] ${tall ? 'pb-5' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.08, type: 'spring', stiffness: 300 }}
    >
      <span className="text-2xl">{medals[position - 1]}</span>
      <Avatar className="h-12 w-12 border-2 border-border">
        {entry.avatar_url && <AvatarImage src={entry.avatar_url} alt="" className="object-cover" />}
        <AvatarFallback className="bg-primary/10 text-primary font-bold">
          {entry.nome.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className="text-xs font-semibold text-foreground text-center leading-tight line-clamp-2">{entry.nome}</p>
      <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${medalBg}`}>
        <Zap className={`h-3 w-3 ${medalColor} fill-current`} />
        <span className={`text-[11px] font-bold ${medalColor}`}>{entry.xp.toLocaleString('pt-BR')}</span>
      </div>
      {entry.streak > 0 && (
        <div className="flex items-center gap-0.5 text-[10px] text-orange-500 font-semibold">
          <Flame className="h-3 w-3" /> {entry.streak}
        </div>
      )}
    </motion.div>
  );
}
