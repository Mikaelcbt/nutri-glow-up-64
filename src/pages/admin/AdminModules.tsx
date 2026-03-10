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
}

interface Product { id: string; nome: string; }

export default function AdminModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: '', descricao: '', ordem: 1, texto_destaque_palavra: '', cor_destaque: '#39d98a',
  });

  useEffect(() => {
    supabase.from('products').select('id, nome').order('nome').then(({ data, error }) => {
      if (error) toast.error('Erro ao carregar produtos: ' + error.message);
      if (data) setProducts(data);
    });
  }, []);

  useEffect(() => {
    if (selectedProduct) loadModules();
  }, [selectedProduct]);

  const loadModules = async () => {
    const { data, error } = await supabase.from('modules').select('*').eq('product_id', selectedProduct).order('ordem');
    if (error) { toast.error('Erro: ' + error.message); return; }
    if (data) setModules(data);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ titulo: '', descricao: '', ordem: modules.length + 1, texto_destaque_palavra: '', cor_destaque: '#39d98a' });
    setOpen(true);
  };

  const openEdit = (m: Module) => {
    setEditing(m);
    setForm({ titulo: m.titulo, descricao: m.descricao, ordem: m.ordem, texto_destaque_palavra: m.texto_destaque_palavra || '', cor_destaque: m.cor_destaque || '#39d98a' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.titulo.trim()) { toast.error('Título é obrigatório'); return; }
    setSaving(true);
    try {
      const payload = { ...form, product_id: selectedProduct };
      if (editing) {
        const { error } = await supabase.from('modules').update(payload).eq('id', editing.id);
        if (error) { toast.error('Erro: ' + error.message); return; }
        toast.success('Módulo atualizado!');
      } else {
        const { error } = await supabase.from('modules').insert(payload);
        if (error) { toast.error('Erro: ' + error.message); return; }
        toast.success('Módulo criado!');
      }
      setOpen(false);
      await loadModules();
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from('modules').delete().eq('id', deleting);
    if (error) toast.error('Erro: ' + error.message);
    else { toast.success('Módulo removido!'); await loadModules(); }
    setDeleting(null);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">MÓDULOS</h1>
        {selectedProduct && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Módulo</Button>}
      </div>

      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
        <SelectTrigger className="w-64 mb-6 bg-secondary border-border">
          <SelectValue placeholder="Selecione um produto" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="space-y-3">
        {modules.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold" style={{ backgroundColor: m.cor_destaque, color: '#0e0e0e' }}>{m.ordem}</span>
              <div>
                <h3 className="font-semibold">{m.titulo}</h3>
                <p className="text-xs text-muted-foreground">{m.descricao}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(m.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {selectedProduct && !modules.length && <p className="text-muted-foreground text-center py-12">Nenhum módulo cadastrado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'EDITAR MÓDULO' : 'NOVO MÓDULO'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Preencha os dados do módulo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título" value={form.titulo} onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} className="bg-secondary border-border" />
            <Input type="number" placeholder="Ordem" value={form.ordem} onChange={(e) => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 1 }))} className="bg-secondary border-border" />
            <Input placeholder="Palavra destaque" value={form.texto_destaque_palavra} onChange={(e) => setForm(f => ({ ...f, texto_destaque_palavra: e.target.value }))} className="bg-secondary border-border" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Cor destaque:</label>
              <Input type="color" value={form.cor_destaque} onChange={(e) => setForm(f => ({ ...f, cor_destaque: e.target.value }))} className="w-12 h-10 p-1 bg-secondary border-border" />
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
            <AlertDialogDescription>Tem certeza que deseja excluir este módulo?</AlertDialogDescription>
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
