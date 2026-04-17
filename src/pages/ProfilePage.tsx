import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Pencil, Loader2, CheckCircle2, Upload, Flame, Droplets, Bell, Zap, Star, BookOpen, Award, Trophy, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { isWaterReminderEnabled, setWaterReminderEnabled } from '@/lib/waterReminder';
import { subscribeToPush, unsubscribeFromPush, isPushSupported } from '@/lib/pushNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';
import { useUserStats } from '@/hooks/useUserStats';

interface ProgramProgress {
  nome: string;
  progress: number;
}

interface CompletedLesson {
  titulo: string;
  concluido_em: string;
}

interface Badge {
  label: string;
  earned: boolean;
  emoji: string;
  description: string;
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const stats = useUserStats();

  const [programs, setPrograms] = useState<ProgramProgress[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [completedHistory, setCompletedHistory] = useState<CompletedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [daysSince, setDaysSince] = useState(0);
  const [waterReminder, setWaterReminder] = useState(isWaterReminderEnabled());
  const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('push_notifications_enabled') !== 'false');

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    setLoading(true);
    setAvatarUrl(profile?.avatar_url || null);
    if (profile?.criado_em) {
      setDaysSince(Math.floor((Date.now() - new Date(profile.criado_em).getTime()) / 86400000));
    }
    await Promise.all([loadProgress(), loadHistory(), loadBadges()]);
    setLoading(false);
  };

  const loadProgress = async () => {
    if (!user) return;
    try {
      // Fetch product IDs in one query based on role
      let productIds: string[] = [];
      if (profile?.role === 'admin') {
        const { data } = await supabase.from('products').select('id').eq('is_active', true).limit(100);
        productIds = data?.map(p => p.id) ?? [];
      } else {
        const { data } = await supabase.from('associacoes').select('product_id').eq('user_id', user.id).eq('status', 'ativo').limit(50);
        productIds = data?.map(a => a.product_id) ?? [];
      }
      if (!productIds.length) return;

      // Fetch products, modules and lessons in parallel
      const [productsRes, modulesRes] = await Promise.all([
        supabase.from('products').select('id, nome').in('id', productIds).limit(50),
        supabase.from('modules').select('id, product_id').in('product_id', productIds).limit(500),
      ]);

      const moduleIds = modulesRes.data?.map(m => m.id) ?? [];
      if (!moduleIds.length) {
        setPrograms(productsRes.data?.map(p => ({ nome: p.nome, progress: 0 })) ?? []);
        return;
      }

      const [lessonsRes, progressRes] = await Promise.all([
        supabase.from('lessons').select('id, module_id').in('module_id', moduleIds).limit(2000),
        supabase.from('rastreamento_progresso').select('lesson_id').eq('user_id', user.id).eq('concluido', true).limit(2000),
      ]);

      const completedSet = new Set(progressRes.data?.map(p => p.lesson_id) ?? []);
      const moduleToProduct = new Map(modulesRes.data?.map(m => [m.id, m.product_id]) ?? []);

      // Group lessons by product
      const lessonsByProduct = new Map<string, string[]>();
      const completedByProduct = new Map<string, number>();
      for (const lesson of lessonsRes.data ?? []) {
        const productId = moduleToProduct.get(lesson.module_id);
        if (!productId) continue;
        if (!lessonsByProduct.has(productId)) lessonsByProduct.set(productId, []);
        lessonsByProduct.get(productId)!.push(lesson.id);
        if (completedSet.has(lesson.id)) {
          completedByProduct.set(productId, (completedByProduct.get(productId) ?? 0) + 1);
        }
      }

      const results: ProgramProgress[] = (productsRes.data ?? []).map(p => {
        const total = lessonsByProduct.get(p.id)?.length ?? 0;
        const done = completedByProduct.get(p.id) ?? 0;
        return { nome: p.nome, progress: total > 0 ? (done / total) * 100 : 0 };
      });

      setPrograms(results);
    } catch (err) { console.error('[Profile] loadProgress error:', err); }
  };

  const loadHistory = async () => {
    if (!user) return;
    try {
      const { data: progData } = await supabase
        .from('rastreamento_progresso')
        .select('lesson_id, concluido_em')
        .eq('user_id', user.id)
        .eq('concluido', true)
        .order('concluido_em', { ascending: false })
        .limit(10);

      if (!progData?.length) return;

      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, titulo')
        .in('id', progData.map(d => d.lesson_id))
        .limit(10);

      const lessonMap = new Map(lessons?.map(l => [l.id, l.titulo]) ?? []);
      setCompletedHistory(progData.map(d => ({
        titulo: lessonMap.get(d.lesson_id) ?? 'Aula',
        concluido_em: d.concluido_em,
      })));
    } catch (err) { console.error('[Profile] loadHistory error:', err); }
  };

  const loadBadges = async () => {
    if (!user) return;
    try {
      const [progressRes, challengeRes, habitsRes] = await Promise.all([
        supabase.from('rastreamento_progresso').select('lesson_id, concluido').eq('user_id', user.id).limit(2000),
        supabase.from('desafio_progresso').select('desafio_id').eq('user_id', user.id).eq('concluido', true).limit(100),
        supabase.from('habitos_registro').select('data, concluido').eq('user_id', user.id).eq('concluido', true).limit(500),
      ]);

      const completedLessons = progressRes.data?.filter(p => p.concluido) ?? [];
      const hasFirstLesson = completedLessons.length >= 1;
      const hasThirdLesson = completedLessons.length >= 3;
      const hasTenLessons = completedLessons.length >= 10;

      // Check module completion — batch query
      let hasModuleComplete = false;
      if (completedLessons.length > 0) {
        const completedIds = completedLessons.map(p => p.lesson_id);
        const { data: lessonMods } = await supabase
          .from('lessons')
          .select('id, module_id')
          .in('id', completedIds)
          .limit(2000);

        const moduleIds = [...new Set(lessonMods?.map(l => l.module_id) ?? [])];
        if (moduleIds.length > 0) {
          const { data: allModLessons } = await supabase
            .from('lessons')
            .select('id, module_id')
            .in('module_id', moduleIds)
            .limit(2000);

          const completedSet = new Set(completedIds);
          const lessonsByModule = new Map<string, string[]>();
          for (const l of allModLessons ?? []) {
            if (!lessonsByModule.has(l.module_id)) lessonsByModule.set(l.module_id, []);
            lessonsByModule.get(l.module_id)!.push(l.id);
          }
          hasModuleComplete = [...lessonsByModule.values()].some(ids => ids.every(id => completedSet.has(id)));
        }
      }

      const hasFirstChallenge = (challengeRes.data?.length ?? 0) >= 1;

      // Unique days with habits
      const uniqueHabitDays = new Set(habitsRes.data?.map(h => h.data) ?? []).size;

      setBadges([
        { emoji: '🌱', label: 'Primeiro acesso', description: 'Entrou na plataforma', earned: true },
        { emoji: '📚', label: 'Primeira aula', description: 'Concluiu a 1ª aula', earned: hasFirstLesson },
        { emoji: '📖', label: 'Em ritmo', description: 'Concluiu 3 aulas', earned: hasThirdLesson },
        { emoji: '🔥', label: 'Dedicado', description: 'Concluiu 10 aulas', earned: hasTenLessons },
        { emoji: '🏅', label: 'Módulo completo', description: 'Completou um módulo inteiro', earned: hasModuleComplete },
        { emoji: '⚡', label: 'Desafiador', description: 'Completou um dia de desafio', earned: hasFirstChallenge },
        { emoji: '💧', label: 'Hidratado', description: 'Registrou hábito por 7 dias', earned: uniqueHabitDays >= 7 },
        { emoji: '🏆', label: 'Consistente', description: 'Registrou hábito por 30 dias', earned: uniqueHabitDays >= 30 },
      ]);
    } catch (err) { console.error('[Profile] loadBadges error:', err); }
  };

  const saveName = async () => {
    if (!user || !newName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ nome_completo: newName.trim() }).eq('id', user.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Nome atualizado!');
      setEditingName(false);
      await refreshProfile();
    } catch { toast.error('Erro ao salvar'); } finally { setSavingName(false); }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatares').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatares').getPublicUrl(path);
      const url = urlData.publicUrl + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      setAvatarUrl(url);
      toast.success('Avatar atualizado!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer upload');
    } finally { setUploadingAvatar(false); }
  };

  const initial = profile?.nome_completo?.charAt(0)?.toUpperCase() ?? 'U';
  const roleLabel = profile?.role === 'admin' ? 'Admin' : 'Aluna';

  // XP para nível atual
  const xpInLevel = stats.xp - stats.xpForCurrentLevel;
  const xpNeeded = stats.xpForNextLevel - stats.xpForCurrentLevel;

  if (loading || stats.loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl px-4 py-16 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-28 w-28 rounded-full shimmer" />
            <Skeleton className="h-8 w-48 shimmer" />
            <Skeleton className="h-4 w-32 shimmer" />
          </div>
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl shimmer" />)}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AnimatedPage>
        {/* Banner */}
        <div className="h-28 md:h-36 bg-gradient-to-r from-primary/20 via-accent to-primary/10 relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 50%, hsl(142 76% 93% / 0.8), transparent 60%)' }} />
        </div>

        <div className="mx-auto max-w-2xl px-4 -mt-14 md:-mt-16 pb-12">
          {/* Avatar + nome */}
          <motion.div className="text-center mb-8" variants={staggerContainer} initial="initial" animate="animate">
            <motion.div variants={fadeInUp} className="relative inline-block mb-4">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground text-4xl font-bold border-4 border-background shadow-soft overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : initial}
              </div>
              <label className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border shadow-card cursor-pointer hover:bg-secondary transition-colors">
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              </label>
            </motion.div>

            <motion.div variants={fadeInUp}>
              {editingName ? (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="max-w-xs h-10 bg-secondary border-border" />
                  <Button size="sm" onClick={saveName} disabled={savingName} className="active:scale-[0.97] transition-transform">
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h1 className="font-display text-3xl font-semibold text-foreground">{profile?.nome_completo ?? 'Usuário'}</h1>
                  <button onClick={() => { setEditingName(true); setNewName(profile?.nome_completo ?? ''); }}>
                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="inline-block rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">{roleLabel}</span>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-6 mt-3 text-sm text-muted-foreground">
              <span>{daysSince} dias na plataforma</span>
              <span>{completedHistory.length} aulas concluídas</span>
            </motion.div>
          </motion.div>

          {/* ── Nível + XP ── */}
          <motion.div
            className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(142_72%_50%)] text-primary-foreground font-display text-xl font-bold shadow-md">
                  {stats.level}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Nível</p>
                  <p className="font-display text-lg font-semibold text-foreground">{getLevelName(stats.level)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">XP total</p>
                <p className="font-bold text-primary text-lg">{stats.xp.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> {xpInLevel} / {xpNeeded} XP</span>
                <span>Nível {stats.level + 1} em {stats.xpForNextLevel - stats.xp} XP</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(142_72%_50%)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.xpProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
            </div>

            {/* Stats rápidos */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center rounded-xl bg-secondary/60 py-3">
                <div className="flex justify-center mb-1">
                  <Flame className={`h-5 w-5 ${stats.streak > 0 ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
                </div>
                <p className={`font-bold text-lg leading-none ${stats.streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>{stats.streak}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">streak</p>
              </div>
              <div className="text-center rounded-xl bg-secondary/60 py-3">
                <div className="flex justify-center mb-1">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <p className="font-bold text-lg leading-none text-foreground">{completedHistory.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">aulas</p>
              </div>
              <div className="text-center rounded-xl bg-secondary/60 py-3">
                <div className="flex justify-center mb-1">
                  <Star className="h-5 w-5 text-[hsl(var(--gold))]" />
                </div>
                <p className="font-bold text-lg leading-none text-foreground">{badges.filter(b => b.earned).length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">conquistas</p>
              </div>
            </div>
          </motion.div>

          {/* ── Conquistas ── */}
          {badges.length > 0 && (
            <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="font-display text-2xl font-semibold mb-4 text-foreground">Conquistas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {badges.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className={`rounded-2xl border p-4 text-center transition-all duration-300 hover:scale-[1.03] ${
                      b.earned
                        ? 'border-primary/30 bg-accent shadow-card'
                        : 'border-border bg-card opacity-40 grayscale'
                    }`}
                  >
                    <span className="text-2xl">{b.emoji}</span>
                    <p className="text-xs font-semibold text-foreground mt-1.5 leading-tight">{b.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{b.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Meus Programas ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="font-display text-2xl font-semibold mb-4 text-foreground">Meus Programas</h2>
            {programs.length > 0 ? (
              <div className="space-y-4 mb-8">
                {programs.map((p, i) => (
                  <motion.div
                    key={i}
                    className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-soft transition-shadow"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.08 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{p.nome}</h3>
                      <span className="text-sm text-primary font-bold">{Math.round(p.progress)}%</span>
                    </div>
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.45 + i * 0.1, duration: 0.6 }} style={{ transformOrigin: 'left' }}>
                      <Progress value={p.progress} className="h-2" />
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            ) : <p className="text-muted-foreground mb-8">Nenhum programa ativo.</p>}
          </motion.div>

          {/* ── Lembretes ── */}
          <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <h2 className="font-display text-2xl font-semibold mb-4 text-foreground">Lembretes</h2>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <Droplets className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Lembrete de água</p>
                    <p className="text-xs text-muted-foreground">Notificação a cada 1 hora</p>
                  </div>
                </div>
                <Switch
                  checked={waterReminder}
                  onCheckedChange={(checked) => {
                    setWaterReminder(checked);
                    setWaterReminderEnabled(checked);
                  }}
                />
              </div>
              {isPushSupported() && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Notificações push</p>
                      <p className="text-xs text-muted-foreground">Alertas com o app fechado</p>
                    </div>
                  </div>
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={async (checked) => {
                      setPushEnabled(checked);
                      localStorage.setItem('push_notifications_enabled', String(checked));
                      if (checked && user) await subscribeToPush(user.id);
                      else if (!checked && user) await unsubscribeFromPush(user.id);
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Histórico de aulas ── */}
          {completedHistory.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
              <h2 className="font-display text-2xl font-semibold mb-4 text-foreground">Aulas Concluídas</h2>
              <div className="space-y-2 pb-8">
                {completedHistory.map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card hover:shadow-soft transition-shadow"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.04 }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground flex-1">{h.titulo}</span>
                    <span className="text-xs text-muted-foreground">{new Date(h.concluido_em).toLocaleDateString('pt-BR')}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}

function getLevelName(level: number): string {
  const names: Record<number, string> = {
    1: 'Iniciante',
    2: 'Explorador',
    3: 'Comprometida',
    4: 'Dedicada',
    5: 'Avançada',
    6: 'Expert',
    7: 'Mestre',
    8: 'Elite',
    9: 'Lendária',
    10: 'Imparável',
  };
  return names[level] ?? `Nível ${level}`;
}
