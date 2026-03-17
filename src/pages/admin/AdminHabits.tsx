import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, Trash2, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface Habit {
  id: string;
  titulo: string;
  icone: string;
  ordem: number;
  ativo: boolean;
}

export default function AdminHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ titulo: '', icone: '✅', ordem: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('habitos')
      .select('*')
      .order('ordem');
    if (error) { toast.error('Erro ao carregar hábitos'); console.error(error); }
    setHabits(data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ titulo: '', icone: '✅', ordem: (habits.length + 1) * 10 });
    setDialogOpen(true);
  };

  const openEdit = (h: Habit) => {
    setEditingId(h.id);
    setForm({ titulo: h.titulo, icone: h.icone, ordem: h.ordem });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.titulo.trim()) { toast.error('Título obrigatório'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('habitos')
          .update({ titulo: form.titulo.trim(), icone: form.icone.trim() || '✅', ordem: form.ordem })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Hábito atualizado');
      } else {
        const { error } = await supabase
          .from('habitos')
          .insert({ titulo: form.titulo.trim(), icone: form.icone.trim() || '✅', ordem: form.ordem, ativo: true });
        if (error) throw error;
        toast.success('Hábito criado');
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const toggleActive = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from('habitos').update({ ativo }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ativo } : h));
  };

  const deleteHabit = async (id: string) => {
    if (!confirm('Excluir este hábito?')) return;
    const { error } = await supabase.from('habitos').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Hábito excluído');
    await load();
  };

  const emojiOptions = ['💧', '🥗', '🏃', '😴', '📖', '💊', '🧘', '🍎', '🥤', '🏋️', '🚶', '🧠', '✅'];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Hábitos Diários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os hábitos que aparecem na home do aluno</p>
        </div>
        <Button onClick={openNew} className="btn-ripple bg-gradient-to-r from-primary to-[hsl(142_72%_37%)]">
          <Plus className="mr-2 h-4 w-4" /> Novo hábito
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="text-muted-foreground">Nenhum hábito cadastrado.</p>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Criar primeiro hábito</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((h, i) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card hover:shadow-soft transition-all duration-300"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
              <span className="text-2xl flex-shrink-0">{h.icone}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{h.titulo}</p>
                <p className="text-xs text-muted-foreground">Ordem: {h.ordem}</p>
              </div>
              <Switch
                checked={h.ativo}
                onCheckedChange={(checked) => toggleActive(h.id, checked)}
              />
              <Button variant="ghost" size="sm" onClick={() => openEdit(h)} className="text-muted-foreground hover:text-foreground">
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteHabit(h.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingId ? 'Editar Hábito' : 'Novo Hábito'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Ícone (emoji)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {emojiOptions.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icone: e }))}
                    className={`text-xl p-1.5 rounded-lg transition-all ${form.icone === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'hover:bg-secondary'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Input
                value={form.icone}
                onChange={(e) => setForm(f => ({ ...f, icone: e.target.value }))}
                placeholder="Emoji ou texto"
                className="h-10 bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Título</label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Beber 2L de água"
                className="h-10 bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Ordem</label>
              <Input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))}
                className="h-10 bg-secondary border-border"
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full btn-ripple bg-gradient-to-r from-primary to-[hsl(142_72%_37%)]">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
