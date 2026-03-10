import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Pencil, Loader2, CheckCircle2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [programs, setPrograms] = useState<{ nome: string; progress: number }[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [completedHistory, setCompletedHistory] = useState<{ titulo: string; concluido_em: string }[]>([]);

  useEffect(() => { if (user) { loadProgress(); loadHistory(); } }, [user]);

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

  const initial = profile?.nome_completo?.charAt(0)?.toUpperCase() || 'U';

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center mb-12">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-bold">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : initial}
          </div>
          {editingName ? (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="max-w-xs h-10 bg-secondary border-border" />
              <Button size="sm" onClick={saveName} disabled={savingName}>
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
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
        </div>

        <h2 className="font-display text-2xl font-semibold mb-6 text-foreground">Meus Programas</h2>
        {programs.length > 0 ? (
          <div className="space-y-4 mb-12">
            {programs.map((p, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">{p.nome}</h3>
                  <span className="text-sm text-primary font-bold">{Math.round(p.progress)}%</span>
                </div>
                <Progress value={p.progress} className="h-2" />
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground mb-12">Nenhum programa ativo.</p>}

        {completedHistory.length > 0 && (
          <>
            <h2 className="font-display text-2xl font-semibold mb-6 text-foreground">Aulas Concluídas</h2>
            <div className="space-y-2">
              {completedHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1">{h.titulo}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.concluido_em).toLocaleDateString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
