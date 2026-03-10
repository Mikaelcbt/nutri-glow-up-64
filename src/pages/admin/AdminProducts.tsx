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

const generateSlug = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    nome: '', descricao: '', imagem_capa_url: '', texto_imagem_capa: '', cor_destaque: '#39d98a', is_active: true,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data, error } = await supabase.from('products').select('*').order('criado_em', { ascending: false });
    if (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos: ' + error.message);
      return;
    }
    if (data) setProducts(data);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nome: '', descricao: '', imagem_capa_url: '', texto_imagem_capa: '', cor_destaque: '#39d98a', is_active: true });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ nome: p.nome, descricao: p.descricao, imagem_capa_url: p.imagem_capa_url || '', texto_imagem_capa: p.texto_imagem_capa || '', cor_destaque: p.cor_destaque, is_active: p.is_active });
    setOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `capas/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('imagens')
      .upload(filePath, file);

    if (uploadError) {
      toast.error('Erro no upload: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('imagens').getPublicUrl(filePath);
    setForm(f => ({ ...f, imagem_capa_url: urlData.publicUrl }));
    toast.success('Imagem enviada!');
    setUploading(false);
  };

  const save = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    const slug = generateSlug(form.nome);
    const payload = { ...form, slug };

    try {
      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) {
          console.error('Erro ao atualizar produto:', error);
          toast.error('Erro ao atualizar: ' + error.message);
          return;
        }
        toast.success('Produto atualizado!');
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) {
          console.error('Erro ao criar produto:', error);
          toast.error('Erro ao criar: ' + error.message);
          return;
        }
        toast.success('Produto criado!');
      }
      setOpen(false);
      await load();
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('products').delete().eq('id', deleting);
    if (error) {
      toast.error('Erro ao remover: ' + error.message);
    } else {
      toast.success('Produto removido!');
      await load();
    }
    setDeleting(null);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">PRODUTOS</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded overflow-hidden bg-secondary flex-shrink-0">
                {p.imagem_capa_url && <img src={p.imagem_capa_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div>
                <h3 className="font-semibold">{p.nome}</h3>
                <p className="text-xs text-muted-foreground">/{p.slug} • {p.is_active ? '✅ Ativo' : '❌ Inativo'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(p.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {!products.length && <p className="text-muted-foreground text-center py-12">Nenhum produto cadastrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editing ? 'Atualize as informações do produto.' : 'Preencha os dados para criar um novo produto.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} className="bg-secondary border-border" />
            
            {/* Image upload */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Imagem de capa</label>
              <div className="flex gap-2">
                <Input placeholder="URL da imagem de capa" value={form.imagem_capa_url} onChange={(e) => setForm(f => ({ ...f, imagem_capa_url: e.target.value }))} className="bg-secondary border-border flex-1" />
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
                <img src={form.imagem_capa_url} alt="Preview" className="h-32 w-full rounded object-cover" />
              )}
            </div>

            <Input placeholder="Texto da imagem de capa" value={form.texto_imagem_capa} onChange={(e) => setForm(f => ({ ...f, texto_imagem_capa: e.target.value }))} className="bg-secondary border-border" />
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Cor destaque:</label>
                <Input type="color" value={form.cor_destaque} onChange={(e) => setForm(f => ({ ...f, cor_destaque: e.target.value }))} className="w-12 h-10 p-1 bg-secondary border-border" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Ativo
              </label>
            </div>
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
            <AlertDialogDescription>Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
