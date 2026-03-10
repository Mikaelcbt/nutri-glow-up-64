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

interface Module {
  id: string;
  product_id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  texto_destaque_palavra: string;
  cor_destaque: string;
  imagem_url: string | null;
}

interface Product {
  id: string;
  nome: string;
}

const DEFAULT_HIGHLIGHT = '#39d98a';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export default function AdminModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [pageError, setPageError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descricao: '', ordem: 1, texto_destaque_palavra: '', cor_destaque: DEFAULT_HIGHLIGHT, imagem_url: '',
  });

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      void loadModules(selectedProduct);
      return;
    }

    setModules([]);
  }, [selectedProduct]);

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
      const { data, error } = await supabase.from('modules').select('*').eq('product_id', productId).order('ordem');
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

  const openNew = () => {
    setEditing(null);
    setPageError('');
    setForm({ titulo: '', descricao: '', ordem: modules.length + 1, texto_destaque_palavra: '', cor_destaque: DEFAULT_HIGHLIGHT, imagem_url: '' });
    setOpen(true);
  };

  const openEdit = (module: Module) => {
    setEditing(module);
    setPageError('');
    setForm({
      titulo: module.titulo,
      descricao: module.descricao,
      ordem: module.ordem,
      texto_destaque_palavra: module.texto_destaque_palavra || '',
      cor_destaque: module.cor_destaque || DEFAULT_HIGHLIGHT,
      imagem_url: module.imagem_url || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!selectedProduct) {
      const message = 'Selecione um produto antes de salvar o módulo.';
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
        product_id: selectedProduct,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        texto_destaque_palavra: form.texto_destaque_palavra.trim(),
        imagem_url: form.imagem_url.trim() || null,
      };

      if (editing) {
        const { data, error } = await supabase
          .from('modules')
          .update(payload)
          .eq('id', editing.id)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Nenhum módulo foi atualizado. Verifique a permissão de admin no RLS.');

        toast.success('Módulo atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('modules')
          .insert(payload)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Nenhum módulo foi criado. Verifique a permissão de admin no RLS.');

        toast.success('Módulo criado com sucesso!');
      }

      setOpen(false);
      await loadModules(selectedProduct);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao salvar módulo.');
      console.error('Erro ao salvar módulo:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting || !selectedProduct) return;

    setDeletingBusy(true);
    setPageError('');

    try {
      const { data, error } = await supabase
        .from('modules')
        .delete()
        .eq('id', deleting)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Nenhum módulo foi removido. Verifique a permissão de admin no RLS.');

      toast.success('Módulo removido com sucesso!');
      await loadModules(selectedProduct);
      setDeleting(null);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao remover módulo.');
      console.error('Erro ao remover módulo:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">MÓDULOS</h1>
        {selectedProduct && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Módulo</Button>}
      </div>

      {pageError && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </div>
      )}

      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
        <SelectTrigger className="w-64 mb-6 bg-secondary border-border" disabled={loadingProducts}>
          <SelectValue placeholder={loadingProducts ? 'Carregando produtos...' : 'Selecione um produto'} />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {products.map((product) => <SelectItem key={product.id} value={product.id}>{product.nome}</SelectItem>)}
        </SelectContent>
      </Select>

      {loadingModules ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando módulos...
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module) => (
            <div key={module.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                {module.imagem_url ? (
                  <img src={module.imagem_url} alt={module.titulo} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{module.ordem}</span>
                )}
                <div>
                  <h3 className="font-semibold">{module.titulo}</h3>
                  <p className="text-xs text-muted-foreground">{module.descricao}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(module)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(module.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {selectedProduct && !modules.length && <p className="text-muted-foreground text-center py-12">Nenhum módulo cadastrado.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'EDITAR MÓDULO' : 'NOVO MÓDULO'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Preencha os dados do módulo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título" value={form.titulo} onChange={(e) => setForm((current) => ({ ...current, titulo: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm((current) => ({ ...current, descricao: e.target.value }))} className="bg-secondary border-border" />
            <Input type="number" placeholder="Ordem" value={form.ordem} onChange={(e) => setForm((current) => ({ ...current, ordem: parseInt(e.target.value, 10) || 1 }))} className="bg-secondary border-border" />
            <Input placeholder="Palavra destaque" value={form.texto_destaque_palavra} onChange={(e) => setForm((current) => ({ ...current, texto_destaque_palavra: e.target.value }))} className="bg-secondary border-border" />
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">URL da imagem do módulo (opcional)</label>
              <Input placeholder="https://exemplo.com/imagem.jpg" value={form.imagem_url} onChange={(e) => setForm((current) => ({ ...current, imagem_url: e.target.value }))} className="bg-secondary border-border" />
              {form.imagem_url && (
                <img src={form.imagem_url} alt="Preview" className="mt-2 h-24 w-auto rounded-lg object-cover border border-border" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Cor destaque:</label>
              <Input type="color" value={form.cor_destaque} onChange={(e) => setForm((current) => ({ ...current, cor_destaque: e.target.value }))} className="w-12 h-10 p-1 bg-secondary border-border" />
            </div>
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
            <AlertDialogDescription>Tem certeza que deseja excluir este módulo?</AlertDialogDescription>
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
