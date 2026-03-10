import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, Edit, Settings, Trophy, Calendar, Users } from 'lucide-react';

interface Challenge {
  id: string;
  titulo: string;
  descricao: string;
  imagem_capa_url: string;
  total_dias: number;
  is_active: boolean;
}

interface Stats { totalChallenges: number; totalDays: number; totalParticipants: number; }

export default function AdminChallenges() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', imagem_capa_url: '', total_dias: 7, is_active: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ totalChallenges: 0, totalDays: 0, totalParticipants: 0 });
  const [daysCount, setDaysCount] = useState<Record<string, { total: number; liberados: number }>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('desafios').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar desafios: ' + error.message); setLoading(false); return; }
    setChallenges(data || []);

    const [daysRes, participantsRes] = await Promise.all([
      supabase.from('desafio_dias').select('id, desafio_id, liberado'),
      supabase.from('desafio_progresso').select('user_id'),
    ]);

    let allDays = daysRes.data || [];
    const uniqueParticipants = new Set((participantsRes.data || []).map(p => p.user_id));

    // Auto-create days for existing challenges that have no days
    const challengeIdsWithDays = new Set(allDays.map(d => d.desafio_id));
    const challengesWithoutDays = (data || []).filter(c => !challengeIdsWithDays.has(c.id) && c.total_dias > 0);
    if (challengesWithoutDays.length > 0) {
      const missingDays = challengesWithoutDays.flatMap(c =>
        Array.from({ length: c.total_dias }, (_, i) => ({
          desafio_id: c.id, numero_dia: i + 1, titulo: `Dia ${i + 1}`, liberado: false,
        }))
      );
      const { data: createdDays, error: missingErr } = await supabase.from('desafio_dias').insert(missingDays).select('id, desafio_id, liberado');
      if (!missingErr && createdDays) {
        allDays = [...allDays, ...createdDays];
        toast.success(`Dias criados automaticamente para ${challengesWithoutDays.length} desafio(s)`);
      }
    }

    setStats({ totalChallenges: (data || []).length, totalDays: allDays.length, totalParticipants: uniqueParticipants.size });

    const counts: Record<string, { total: number; liberados: number }> = {};
    allDays.forEach(d => {
      if (!counts[d.desafio_id]) counts[d.desafio_id] = { total: 0, liberados: 0 };
      counts[d.desafio_id].total++;
      if (d.liberado) counts[d.desafio_id].liberados++;
    });
    setDaysCount(counts);
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const path = `capas/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('desafios').upload(path, file);
    if (error) { toast.error('Erro no upload: ' + error.message); setUploadingImage(false); return; }
    const { data: urlData } = supabase.storage.from('desafios').getPublicUrl(path);
    setForm(f => ({ ...f, imagem_capa_url: urlData.publicUrl }));
    toast.success('Imagem enviada!');
    setUploadingImage(false);
  };

  const openEdit = (c: Challenge) => {
    setEditingId(c.id);
    setForm({ titulo: c.titulo, descricao: c.descricao || '', imagem_capa_url: c.imagem_capa_url || '', total_dias: c.total_dias, is_active: c.is_active });
    setShowForm(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ titulo: '', descricao: '', imagem_capa_url: '', total_dias: 7, is_active: true });
    setShowForm(true);
  };

  const saveChallenge = async () => {
    if (!form.titulo.trim()) { toast.error('Preencha o título'); return; }
    if (form.total_dias < 1) { toast.error('Mínimo de 1 dia'); return; }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from('desafios').update({
        titulo: form.titulo, descricao: form.descricao, imagem_capa_url: form.imagem_capa_url, is_active: form.is_active,
      }).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar: ' + error.message); setSaving(false); return; }
      toast.success('Desafio atualizado!');
    } else {
      const payload = { titulo: form.titulo, descricao: form.descricao, imagem_capa_url: form.imagem_capa_url, total_dias: form.total_dias, is_active: form.is_active };
      const { data, error } = await supabase.from('desafios').insert([payload]).select().single();
      if (error) { toast.error('Erro ao criar desafio: ' + error.message); setSaving(false); return; }
      if (!data) { toast.error('Desafio não foi criado - verifique as permissões RLS'); setSaving(false); return; }

      const daysToInsert = Array.from({ length: form.total_dias }, (_, i) => ({
        desafio_id: data.id, numero_dia: i + 1, titulo: `Dia ${i + 1}`, liberado: false,
      }));
      const { error: daysError } = await supabase.from('desafio_dias').insert(daysToInsert);
      if (daysError) toast.error('Desafio criado mas erro ao gerar dias: ' + daysError.message);
      else toast.success(`Desafio criado com ${form.total_dias} dias!`);
    }

    setShowForm(false);
    setSaving(false);
    load();
  };

  const toggleActive = async (c: Challenge) => {
    const { error } = await supabase.from('desafios').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success(c.is_active ? 'Desafio desativado' : 'Desafio ativado');
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('desafio_dias').delete().eq('desafio_id', deleteId);
    await supabase.from('desafio_progresso').delete().eq('desafio_id', deleteId);
    const { error } = await supabase.from('desafios').delete().eq('id', deleteId);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Desafio excluído');
    setDeleteId(null);
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Trophy, label: 'Desafios', value: stats.totalChallenges },
            { icon: Calendar, label: 'Dias criados', value: stats.totalDays },
            { icon: Users, label: 'Participantes', value: stats.totalParticipants },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Desafios</h1>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Desafio</Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">Nenhum desafio cadastrado.</p>
            <Button onClick={openNew} variant="outline"><Plus className="mr-2 h-4 w-4" /> Criar primeiro desafio</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map(c => {
              const dc = daysCount[c.id];
              return (
                <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
                  {c.imagem_capa_url ? (
                    <img src={c.imagem_capa_url} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Trophy className="h-6 w-6 text-muted-foreground/40" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.titulo}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm text-muted-foreground">{c.total_dias} dias</span>
                      {dc && <Badge variant="secondary" className="text-xs">{dc.liberados}/{dc.total} liberados</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                    <span className="text-xs text-muted-foreground w-12">{c.is_active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/desafios/${c.id}/dias`)}><Settings className="h-4 w-4 mr-1" /> Dias</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Challenge Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Desafio' : 'Novo Desafio'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Nome do desafio" /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do desafio" rows={3} /></div>
            <div>
              <Label>Imagem de capa</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.imagem_capa_url} onChange={e => setForm(f => ({ ...f, imagem_capa_url: e.target.value }))} placeholder="URL ou faça upload" className="flex-1" />
                <Button variant="outline" size="sm" asChild disabled={uploadingImage}>
                  <label className="cursor-pointer"><Upload className="h-4 w-4 mr-1" /> {uploadingImage ? 'Enviando...' : 'Upload'}<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
                </Button>
              </div>
              {form.imagem_capa_url && <img src={form.imagem_capa_url} alt="" className="mt-2 h-32 w-full rounded-lg object-cover" />}
            </div>
            {!editingId && (
              <div><Label>Total de dias</Label><Input type="number" min={1} value={form.total_dias} onChange={e => setForm(f => ({ ...f, total_dias: Math.max(1, parseInt(e.target.value) || 1) }))} /></div>
            )}
            <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Ativo</Label></div>
            <Button onClick={saveChallenge} disabled={saving} className="w-full">{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar Desafio'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir desafio?</AlertDialogTitle><AlertDialogDescription>Todos os dias e progresso serão removidos permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
