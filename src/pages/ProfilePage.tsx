import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Pencil, Loader2, CheckCircle2, Award, BookOpen, Star, Trophy, Upload, Flame, Sparkles, Droplets, Bell } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { isWaterReminderEnabled, setWaterReminderEnabled } from '@/lib/waterReminder';
import { subscribeToPush, unsubscribeFromPush, isPushSupported } from '@/lib/pushNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [programs, setPrograms] = useState<{ nome: string; progress: number }[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [completedHistory, setCompletedHistory] = useState<{ titulo: string; concluido_em: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<{ icon: any; label: string; earned: boolean; emoji: string }[]>([]);
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
      const { data: assocs } = await supabase.from('associacoes').select('product_id').eq('user_id', user.id).eq('status', 'ativo');
      if (!assocs?.length) return;
      const results: { nome: string; progress: number }[] = [];
      for (const assoc of assocs) {
        const { data: product } = await supabase.from('products').select('id, nome').eq('id', assoc.product_id).maybeSingle();
        if (!product) continue;
        const { data: mods } = await supabase.from('modules').select('id').eq('product_id', product.id);
        const modIds = mods?.map(m => m.id) || [];
        if (!modIds.length) { results.push({ nome: product.nome, progress: 0 }); continue; }
        const { data: lessons } = await supabase.from('lessons').select('id').in('module_id', modIds);
        const total = lessons?.length || 0;
        if (!total) { results.push({ nome: product.nome, progress: 0 }); continue; }
        const { data: prog } = await supabase.from('rastreamento_progresso').select('lesson_id')
          .eq('user_id', user.id).eq('concluido', true).in('lesson_id', lessons!.map(l => l.id));
        results.push({ nome: product.nome, progress: ((prog?.length || 0) / total) * 100 });
      }
      setPrograms(results);
    } catch (err) { console.error(err); }
  };

  const loadHistory = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('rastreamento_progresso')
        .select('lesson_id, concluido_em').eq('user_id', user.id).eq('concluido', true)
        .order('concluido_em', { ascending: false }).limit(10);
      if (!data?.length) return;
      const { data: lessons } = await supabase.from('lessons').select('id, titulo').in('id', data.map(d => d.lesson_id));
      const lessonMap = new Map(lessons?.map(l => [l.id, l.titulo]) || []);
      setCompletedHistory(data.map(d => ({ titulo: lessonMap.get(d.lesson_id) || 'Aula', concluido_em: d.concluido_em })));
    } catch (err) { console.error(err); }
  };

  const loadBadges = async () => {
    if (!user) return;
    try {
      const { data: progress } = await supabase.from('rastreamento_progresso')
        .select('lesson_id, concluido').eq('user_id', user.id);
      
      const hasFirstAccess = true;
      const completedLessons = progress?.filter(p => p.concluido) || [];
      const hasFirstLesson = completedLessons.length >= 1;

      let hasModuleComplete = false;
      
      if (completedLessons.length > 0) {
        const lessonIds = completedLessons.map(p => p.lesson_id);
        const { data: lessons } = await supabase.from('lessons').select('id, module_id').in('id', lessonIds);
        const moduleIds = [...new Set(lessons?.map(l => l.module_id) || [])];
        
        for (const modId of moduleIds) {
          const { data: modLessons } = await supabase.from('lessons').select('id').eq('module_id', modId);
          if (modLessons && modLessons.every(l => lessonIds.includes(l.id))) {
            hasModuleComplete = true;
            break;
          }
        }
      }

      setBadges([
        { icon: Star, label: 'Primeiro acesso', earned: hasFirstAccess, emoji: '🌱' },
        { icon: BookOpen, label: 'Primeira aula concluída', earned: hasFirstLesson, emoji: '📚' },
        { icon: Award, label: 'Módulo completo', earned: hasModuleComplete, emoji: '🏅' },
        { icon: Trophy, label: 'Programa completo', earned: false, emoji: '🏆' },
        { icon: Flame, label: '7 dias seguidos', earned: daysSince >= 7, emoji: '🔥' },
        { icon: Sparkles, label: '30 dias seguidos', earned: daysSince >= 30, emoji: '⭐' },
      ]);
    } catch (err) { console.error(err); }
  };

  const saveName = async () => {
    if (!user || !newName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ nome_completo: newName.trim() }).eq('id', user.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Nome atualizado!');
      setEditingName(false);
      window.location.reload();
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
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer upload');
    } finally { setUploadingAvatar(false); }
  };

  const initial = profile?.nome_completo?.charAt(0)?.toUpperCase() || 'U';
  const roleLabel = profile?.role === 'admin' ? 'Admin' : 'Aluno';

  if (loading) {
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
        <div className="h-32 bg-gradient-to-r from-primary/20 via-accent to-primary/10 relative" />
        
        <div className="mx-auto max-w-2xl px-4 -mt-16">
          <motion.div
            className="text-center mb-12"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Avatar */}
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

            {/* Name */}
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
                  <h1 className="font-display text-3xl font-semibold text-foreground">{profile?.nome_completo || 'Usuário'}</h1>
                  <button onClick={() => { setEditingName(true); setNewName(profile?.nome_completo || ''); }}>
                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="inline-block rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">{roleLabel}</span>
            </motion.div>

            {/* Journey stats */}
            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
              <span>{daysSince} dias na plataforma</span>
              <span>{completedHistory.length} aulas concluídas</span>
            </motion.div>
          </motion.div>

          {/* Badges */}
          {badges.length > 0 && (
            <motion.div className="mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="font-display text-2xl font-semibold mb-4 text-foreground">Conquistas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {badges.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className={`rounded-2xl border p-4 text-center transition-all duration-300 hover:scale-[1.03] ${
                      b.earned ? 'border-primary bg-accent shadow-card' : 'border-border bg-card opacity-40'
                    }`}
                  >
                    <span className="text-2xl">{b.emoji}</span>
                    <p className="text-xs font-medium text-foreground mt-1">{b.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <h2 className="font-display text-2xl font-semibold mb-6 text-foreground">Meus Programas</h2>
            {programs.length > 0 ? (
              <div className="space-y-4 mb-12">
                {programs.map((p, i) => (
                  <motion.div
                    key={i}
                    className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-soft transition-shadow"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{p.nome}</h3>
                      <span className="text-sm text-primary font-bold">{Math.round(p.progress)}%</span>
                    </div>
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }} style={{ transformOrigin: 'left' }}>
                      <Progress value={p.progress} className="h-2" />
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            ) : <p className="text-muted-foreground mb-12">Nenhum programa ativo.</p>}
          </motion.div>

          {/* Reminders Settings */}
          <motion.div className="mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <h2 className="font-display text-2xl font-semibold mb-4 text-foreground">Lembretes</h2>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <Droplets className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Lembrete de água</p>
                    <p className="text-xs text-muted-foreground">Notificação a cada 1 hora para se hidratar</p>
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
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Notificações push</p>
                      <p className="text-xs text-muted-foreground">Receber alertas mesmo com o app fechado</p>
                    </div>
                  </div>
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={async (checked) => {
                      setPushEnabled(checked);
                      localStorage.setItem('push_notifications_enabled', String(checked));
                      if (checked && user) {
                        await subscribeToPush(user.id);
                      } else if (!checked && user) {
                        await unsubscribeFromPush(user.id);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>

          {completedHistory.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <h2 className="font-display text-2xl font-semibold mb-6 text-foreground">Aulas Concluídas</h2>
              <div className="space-y-2 pb-8">
                {completedHistory.map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card hover:shadow-soft transition-shadow"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.04 }}
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
