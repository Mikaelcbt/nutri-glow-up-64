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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export default function AdminLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [pageError, setPageError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descricao: '', conteudo: '', video_url: '', ordem: 1, is_preview: false,
  });

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setSelectedModule('');
      setLessons([]);
      void loadModules(selectedProduct);
      return;
    }

    setModules([]);
    setSelectedModule('');
    setLessons([]);
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedModule) {
      void loadLessons(selectedModule);
      return;
    }

    setLessons([]);
  }, [selectedModule]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    setPageError('');

    try {
      const { data, error } = await supabase.from('products').select('id, nome').order('nome');
      if (error) throw error;
      setProducts(data ?? []);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao carregar produtos.');
      console.error('Erro ao carregar produtos:', error);
      setPageError(message);
      setProducts([]);
      toast.error(message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadModules = async (productId: string) => {
    setLoadingModules(true);
    setPageError('');

    try {
      const { data, error } = await supabase.from('modules').select('id, titulo, product_id').eq('product_id', productId).order('ordem');
      if (error) throw error;
      setModules(data ?? []);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao carregar módulos.');
      console.error('Erro ao carregar módulos:', error);
      setPageError(message);
      setModules([]);
      toast.error(message);
    } finally {
      setLoadingModules(false);
    }
  };

  const loadLessons = async (moduleId: string) => {
    setLoadingLessons(true);
    setPageError('');

    try {
      const { data, error } = await supabase.from('lessons').select('*').eq('module_id', moduleId).order('ordem');
      if (error) throw error;
      setLessons(data ?? []);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao carregar aulas.');
      console.error('Erro ao carregar aulas:', error);
      setPageError(message);
      setLessons([]);
      toast.error(message);
    } finally {
      setLoadingLessons(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setPageError('');
    setForm({ titulo: '', descricao: '', conteudo: '', video_url: '', ordem: lessons.length + 1, is_preview: false });
    setOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setPageError('');
    setForm({
      titulo: lesson.titulo,
      descricao: lesson.descricao,
      conteudo: lesson.conteudo || '',
      video_url: lesson.video_url || '',
      ordem: lesson.ordem,
      is_preview: lesson.is_preview,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!selectedModule) {
      const message = 'Selecione um módulo antes de salvar a aula.';
      setPageError(message);
      toast.error(message);
      return;
    }

    if (!form.titulo.trim()) {
      const message = 'Título é obrigatório.';
      setPageError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    setPageError('');

    try {
      const payload = {
        ...form,
        module_id: selectedModule,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        conteudo: form.conteudo.trim(),
        video_url: form.video_url.trim(),
      };

      if (editing) {
        const { data, error } = await supabase
          .from('lessons')
          .update(payload)
          .eq('id', editing.id)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Nenhuma aula foi atualizada. Verifique a permissão de admin no RLS.');

        toast.success('Aula atualizada com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('lessons')
          .insert(payload)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Nenhuma aula foi criada. Verifique a permissão de admin no RLS.');

        toast.success('Aula criada com sucesso!');
      }

      setOpen(false);
      await loadLessons(selectedModule);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao salvar aula.');
      console.error('Erro ao salvar aula:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting || !selectedModule) return;

    setDeletingBusy(true);
    setPageError('');

    try {
      const { data, error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', deleting)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Nenhuma aula foi removida. Verifique a permissão de admin no RLS.');

      toast.success('Aula removida com sucesso!');
      await loadLessons(selectedModule);
      setDeleting(null);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao remover aula.');
      console.error('Erro ao remover aula:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">AULAS</h1>
        {selectedModule && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nova Aula</Button>}
      </div>

      {pageError && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-48 bg-secondary border-border" disabled={loadingProducts}><SelectValue placeholder={loadingProducts ? 'Carregando produtos...' : 'Produto'} /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {products.map((product) => <SelectItem key={product.id} value={product.id}>{product.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedModule} onValueChange={setSelectedModule}>
          <SelectTrigger className="w-48 bg-secondary border-border" disabled={!selectedProduct || loadingModules}><SelectValue placeholder={loadingModules ? 'Carregando módulos...' : 'Módulo'} /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {modules.map((module) => <SelectItem key={module.id} value={module.id}>{module.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loadingLessons ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando aulas...
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6">{lesson.ordem}</span>
                <div>
                  <h3 className="font-semibold">{lesson.titulo}</h3>
                  <p className="text-xs text-muted-foreground">{lesson.is_preview ? '👁 Preview' : ''} {lesson.video_url ? '🎥' : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(lesson)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(lesson.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {selectedModule && !lessons.length && <p className="text-muted-foreground text-center py-12">Nenhuma aula cadastrada.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'EDITAR AULA' : 'NOVA AULA'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Preencha os dados da aula.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título" value={form.titulo} onChange={(e) => setForm((current) => ({ ...current, titulo: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm((current) => ({ ...current, descricao: e.target.value }))} className="bg-secondary border-border" />
            <Input placeholder="URL do vídeo (embed)" value={form.video_url} onChange={(e) => setForm((current) => ({ ...current, video_url: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Conteúdo (Markdown)" rows={6} value={form.conteudo} onChange={(e) => setForm((current) => ({ ...current, conteudo: e.target.value }))} className="bg-secondary border-border" />
            <Input type="number" placeholder="Ordem" value={form.ordem} onChange={(e) => setForm((current) => ({ ...current, ordem: parseInt(e.target.value, 10) || 1 }))} className="bg-secondary border-border" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_preview} onChange={(e) => setForm((current) => ({ ...current, is_preview: e.target.checked }))} />
              Aula de preview (gratuita)
            </label>
            <Button onClick={save} disabled={saving} className="w-full font-display tracking-wider">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> SALVANDO...</> : 'SALVAR'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(nextOpen) => !nextOpen && !deletingBusy && setDeleting(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta aula?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border" disabled={deletingBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deletingBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
