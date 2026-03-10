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
import { Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface Material { id: string; product_id: string | null; titulo: string; descricao: string; arquivo_url: string; tipo: string; }
interface Product { id: string; nome: string; }

export default function AdminMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', arquivo_url: '', tipo: 'pdf', product_id: '' });

  useEffect(() => { load(); loadProducts(); }, []);

  const load = async () => {
    setLoadingMaterials(true);
    try {
      const { data, error } = await supabase.from('materiais').select('*').order('criado_em', { ascending: false });
      if (error) throw error;
      setMaterials(data || []);
    } catch (err: any) { toast.error(err.message || 'Erro'); } finally { setLoadingMaterials(false); }
  };

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('id, nome').order('nome');
    setProducts(data || []);
  };

  const openNew = () => { setEditing(null); setForm({ titulo: '', descricao: '', arquivo_url: '', tipo: 'pdf', product_id: '' }); setOpen(true); };
  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({ titulo: m.titulo, descricao: m.descricao || '', arquivo_url: m.arquivo_url || '', tipo: m.tipo || 'pdf', product_id: m.product_id || '' });
    setOpen(true);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `materiais/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error } = await supabase.storage.from('materiais').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('materiais').getPublicUrl(path);
      setForm(f => ({ ...f, arquivo_url: urlData.publicUrl }));
      toast.success('Arquivo enviado!');
    } catch (err: any) { toast.error(err.message || 'Erro no upload'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const save = async () => {
    if (!form.titulo.trim()) { toast.error('Título obrigatório'); return; }
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo.trim(), descricao: form.descricao.trim(),
        arquivo_url: form.arquivo_url.trim(), tipo: form.tipo,
        product_id: form.product_id || null,
      };
      if (editing) {
        const { error } = await supabase.from('materiais').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Material atualizado!');
      } else {
        const { error } = await supabase.from('materiais').insert(payload);
        if (error) throw error;
        toast.success('Material criado!');
      }
      setOpen(false); await load();
    } catch (err: any) { toast.error(err.message || 'Erro'); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const { error } = await supabase.from('materiais').delete().eq('id', deleting);
      if (error) throw error;
      toast.success('Material removido!');
      setDeleting(null); await load();
    } catch (err: any) { toast.error(err.message || 'Erro'); } finally { setDeletingBusy(false); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">Materiais</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Material</Button>
      </div>

      {loadingMaterials ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {materials.map(m => (
            <div key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card hover:shadow-soft transition-shadow">
              <div>
                <h3 className="font-semibold text-foreground">{m.titulo}</h3>
                <p className="text-xs text-muted-foreground">{m.tipo} {m.product_id ? '' : '• Global'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleting(m.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {!materials.length && <p className="text-center py-12 text-muted-foreground">Nenhum material.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Editar Material' : 'Novo Material'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Preencha os dados do material.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título" value={form.titulo} onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} className="bg-secondary border-border" />
            <Textarea placeholder="Descrição" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} className="bg-secondary border-border" />
            <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="planilha">Planilha</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.product_id} onValueChange={(v) => setForm(f => ({ ...f, product_id: v === 'none' ? '' : v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Produto (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (global)</SelectItem>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="URL do arquivo" value={form.arquivo_url} onChange={(e) => setForm(f => ({ ...f, arquivo_url: e.target.value }))} className="bg-secondary border-border flex-1" />
              <label className="cursor-pointer">
                <Button variant="outline" disabled={uploading} asChild><span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</span></Button>
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            <Button onClick={save} disabled={saving || uploading} className="w-full">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && !deletingBusy && setDeleting(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este material?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deletingBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
