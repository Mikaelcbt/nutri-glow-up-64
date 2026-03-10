import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Lesson {
  id: string;
  module_id: string;
  titulo: string;
  descricao: string;
  conteudo: string;
  video_url: string;
  ordem: number;
  is_preview: boolean;
}

interface Product { id: string; nome: string; }
interface Module { id: string; titulo: string; product_id: string; }

export default function AdminLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: '', descricao: '', conteudo: '', video_url: '', ordem: 1, is_preview: false,
  });

  useEffect(() => {
    supabase.from('products').select('id, nome').order('nome').then(({ data, error }) => {
      if (error) toast.error('Erro: ' + error.message);
      if (data) setProducts(data);
    });
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      supabase.from('modules').select('id, titulo, product_id').eq('product_id', selectedProduct).order('ordem').then(({ data, error }) => {
        if (error) toast.error('Erro: ' + error.message);
        if (data) setModules(data);
        setSelectedModule('');
        setLessons([]);
      });
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedModule) loadLessons();
  }, [selectedModule]);

  const loadLessons = async () => {
    const { data, error } = await supabase.from('lessons').select('*').eq('module_id', selectedModule).order('ordem');
    if (error) { toast.error('Erro: ' + error.message); return; }
    if (data) setLessons(data);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ titulo: '', descricao: '', conteudo: '', video_url: '', ordem: lessons.length + 1, is_preview: false });
    setOpen(true);
  };

  const openEdit = (l: Lesson) => {
    setEditing(l);
    setForm({ titulo: l.titulo, descricao: l.descricao, conteudo: l.conteudo || '', video_url: l.video_url || '', ordem: l.ordem, is_preview: l.is_preview });
    setOpen(true);
  };

  const save = async () => {
    if (!form.titulo.trim()) { toast.error('Título é obrigatório'); return; }
    setSaving(true);
    try {
      const payload = { ...form, module_id: selectedModule };
      if (editing) {
        const { error } = await supabase.from('lessons').update(payload).eq('id', editing.id);
        if (error) { toast.error('Erro: ' + error.message); return; }
        toast.success('Aula atualizada!');
      } else {
        const { error } = await supabase.from('lessons').insert(payload);
        if (error) { toast.error('Erro: ' + error.message); return; }
        toast.success('Aula criada!');
      }
      setOpen(false);
      await loadLessons();
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('lessons').delete().eq('id', deleting);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Aula removida!'); await loadLessons(); }
    setDeleting(null);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">AULAS</h1>
        {selectedModule && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nova Aula</Button>}
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="Produto" /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedModule} onValueChange={setSelectedModule}>
          <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {lessons.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-6">{l.ordem}</span>
              <div>
                <h3 className="font-semibold">{l.titulo}</h3>
                <p className="text-xs text-muted-foreground">{l.is_preview ? '👁 Preview' : ''} {l.video_url ? '🎥' : ''}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(l.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {selectedModule && !lessons.length && <p className="text-muted-foreground text-center py-12">Nenhuma aula cadastrada.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'EDITAR AULA' : 'NOVA AULA'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Preencha os dados da aula.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título" value={form.titulo} onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} className="bg-secondary border-border" />
            <Input placeholder="URL do vídeo (embed)" value={form.video_url} onChange={(e) => setForm(f => ({ ...f, video_url: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Conteúdo (Markdown)" rows={6} value={form.conteudo} onChange={(e) => setForm(f => ({ ...f, conteudo: e.target.value }))} className="bg-secondary border-border" />
            <Input type="number" placeholder="Ordem" value={form.ordem} onChange={(e) => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 1 }))} className="bg-secondary border-border" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_preview} onChange={(e) => setForm(f => ({ ...f, is_preview: e.target.checked }))} />
              Aula de preview (gratuita)
            </label>
            <Button onClick={save} disabled={saving} className="w-full font-display tracking-wider">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> SALVANDO...</> : 'SALVAR'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta aula?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
