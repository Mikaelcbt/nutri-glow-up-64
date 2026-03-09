import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

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
  const [form, setForm] = useState({
    nome: '', descricao: '', imagem_capa_url: '', texto_imagem_capa: '', cor_destaque: '#39d98a', is_active: true,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('products').select('*').order('criado_em', { ascending: false });
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

  const save = async () => {
    const slug = generateSlug(form.nome);
    const payload = { ...form, slug };

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Produto atualizado');
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Produto criado');
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    await supabase.from('products').delete().eq('id', id);
    toast.success('Produto removido');
    load();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">PRODUTOS</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
      </div>

      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded overflow-hidden bg-secondary flex-shrink-0">
                {p.imagem_capa_url && <img src={p.imagem_capa_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div>
                <h3 className="font-semibold">{p.nome}</h3>
                <p className="text-xs text-muted-foreground">/{p.slug} • {p.is_active ? 'Ativo' : 'Inativo'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {!products.length && <p className="text-muted-foreground">Nenhum produto cadastrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} className="bg-secondary border-border" />
            <Input placeholder="URL da imagem de capa" value={form.imagem_capa_url} onChange={(e) => setForm(f => ({ ...f, imagem_capa_url: e.target.value }))} className="bg-secondary border-border" />
            <Input placeholder="Texto da imagem de capa" value={form.texto_imagem_capa} onChange={(e) => setForm(f => ({ ...f, texto_imagem_capa: e.target.value }))} className="bg-secondary border-border" />
            <div className="flex gap-4 items-center">
              <Input type="color" value={form.cor_destaque} onChange={(e) => setForm(f => ({ ...f, cor_destaque: e.target.value }))} className="w-16 h-10 p-1 bg-secondary border-border" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Ativo
              </label>
            </div>
            <Button onClick={save} className="w-full font-display tracking-wider">SALVAR</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
