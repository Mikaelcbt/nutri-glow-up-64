import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface Product {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  imagem_capa_url: string;
  texto_imagem_capa: string;
  cor_destaque: string;
  is_active: boolean;
}

const DEFAULT_HIGHLIGHT = '#39d98a';

const generateSlug = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [pageError, setPageError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    nome: '', descricao: '', imagem_capa_url: '', texto_imagem_capa: '', cor_destaque: DEFAULT_HIGHLIGHT, is_active: true,
  });

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoadingProducts(true);
    setPageError('');

    try {
      const orderedByCreated = await supabase.from('products').select('*').order('criado_em', { ascending: false });

      let data = orderedByCreated.data;
      let error = orderedByCreated.error;

      if (error && /criado_em|column/i.test(error.message)) {
        const fallback = await supabase.from('products').select('*').order('nome');
        data = fallback.data;
        error = fallback.error;
      }

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

  const openNew = () => {
    setEditing(null);
    setPageError('');
    setForm({ nome: '', descricao: '', imagem_capa_url: '', texto_imagem_capa: '', cor_destaque: DEFAULT_HIGHLIGHT, is_active: true });
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setPageError('');
    setForm({
      nome: product.nome,
      descricao: product.descricao,
      imagem_capa_url: product.imagem_capa_url || '',
      texto_imagem_capa: product.texto_imagem_capa || '',
      cor_destaque: product.cor_destaque || DEFAULT_HIGHLIGHT,
      is_active: product.is_active,
    });
    setOpen(true);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setPageError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `capas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagens')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('imagens').getPublicUrl(filePath);
      setForm((current) => ({ ...current, imagem_capa_url: urlData.publicUrl }));
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao enviar imagem.');
      console.error('Erro no upload da imagem:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const save = async () => {
    if (!form.nome.trim()) {
      const message = 'Nome é obrigatório.';
      setPageError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    setPageError('');

    try {
      const payload = {
        ...form,
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        texto_imagem_capa: form.texto_imagem_capa.trim(),
        slug: generateSlug(form.nome),
      };

      if (editing) {
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editing.id)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Nenhum produto foi atualizado. Verifique a permissão de admin no RLS.');

        toast.success('Produto atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Nenhum produto foi criado. Verifique a permissão de admin no RLS.');

        toast.success('Produto criado com sucesso!');
      }

      setOpen(false);
      await load();
    } catch (error) {
      const message = getErrorMessage(error, 'Erro inesperado ao salvar produto.');
      console.error('Erro ao salvar produto:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    setDeletingBusy(true);
    setPageError('');

    try {
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleting)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Nenhum produto foi removido. Verifique a permissão de admin no RLS.');

      toast.success('Produto removido com sucesso!');
      await load();
      setDeleting(null);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao remover produto.');
      console.error('Erro ao remover produto:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">PRODUTOS</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
      </div>

      {pageError && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </div>
      )}

      {loadingProducts ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando produtos...
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded overflow-hidden bg-secondary flex-shrink-0">
                  {product.imagem_capa_url && <img src={product.imagem_capa_url} alt={product.nome} className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div>
                  <h3 className="font-semibold">{product.nome}</h3>
                  <p className="text-xs text-muted-foreground">/{product.slug} • {product.is_active ? '✅ Ativo' : '❌ Inativo'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(product)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(product.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {!products.length && <p className="text-muted-foreground text-center py-12">Nenhum produto cadastrado.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editing ? 'Atualize as informações do produto.' : 'Preencha os dados para criar um novo produto.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm((current) => ({ ...current, nome: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm((current) => ({ ...current, descricao: e.target.value }))} className="bg-secondary border-border" />

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Imagem de capa</label>
              <div className="flex gap-2">
                <Input placeholder="URL da imagem de capa" value={form.imagem_capa_url} onChange={(e) => setForm((current) => ({ ...current, imagem_capa_url: e.target.value }))} className="bg-secondary border-border flex-1" />
                <label className="cursor-pointer">
                  <Button variant="outline" className="border-border" disabled={uploading} asChild>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              {form.imagem_capa_url && (
                <img src={form.imagem_capa_url} alt="Prévia da capa do produto" className="h-32 w-full rounded object-cover" loading="lazy" />
              )}
            </div>

            <Input placeholder="Texto da imagem de capa" value={form.texto_imagem_capa} onChange={(e) => setForm((current) => ({ ...current, texto_imagem_capa: e.target.value }))} className="bg-secondary border-border" />
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Cor destaque:</label>
                <Input type="color" value={form.cor_destaque} onChange={(e) => setForm((current) => ({ ...current, cor_destaque: e.target.value }))} className="w-12 h-10 p-1 bg-secondary border-border" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((current) => ({ ...current, is_active: e.target.checked }))} />
                Ativo
              </label>
            </div>
            <Button onClick={save} disabled={saving || uploading} className="w-full font-display tracking-wider">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> SALVANDO...</> : 'SALVAR'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(nextOpen) => !nextOpen && !deletingBusy && setDeleting(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
