import { useEffect, useState, useRef } from 'react';
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
import { Plus, Trash2, Save, Upload, Edit, Settings, Unlock, Lock, ChevronRight, Trophy, Calendar, Users } from 'lucide-react';

interface Challenge {
  id: string;
  titulo: string;
  descricao: string;
  imagem_capa_url: string;
  total_dias: number;
  is_active: boolean;
}

interface DayData {
  id: string;
  desafio_id: string;
  numero_dia: number;
  titulo: string;
  video_url: string;
  pdf_url: string;
  alimentos: string;
  receita: string;
  liberado: boolean;
}

interface Stats {
  totalChallenges: number;
  totalDays: number;
  totalParticipants: number;
}

export default function AdminChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', imagem_capa_url: '', total_dias: 7, is_active: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ totalChallenges: 0, totalDays: 0, totalParticipants: 0 });
  const [daysCount, setDaysCount] = useState<Record<string, { total: number; liberados: number }>>({});

  // Day management
  const [managingChallenge, setManagingChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [daysLoading, setDaysLoading] = useState(false);
  const [editingDay, setEditingDay] = useState<DayData | null>(null);
  const [savingDay, setSavingDay] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('desafios').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar desafios: ' + error.message);
      setLoading(false);
      return;
    }
    setChallenges(data || []);

    // Load stats
    const [daysRes, participantsRes] = await Promise.all([
      supabase.from('desafio_dias').select('id, desafio_id, liberado'),
      supabase.from('desafio_progresso').select('user_id'),
    ]);

    const allDays = daysRes.data || [];
    const uniqueParticipants = new Set((participantsRes.data || []).map(p => p.user_id));
    setStats({
      totalChallenges: (data || []).length,
      totalDays: allDays.length,
      totalParticipants: uniqueParticipants.size,
    });

    // Days count per challenge
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
    if (error) {
      toast.error('Erro no upload da imagem: ' + error.message);
      setUploadingImage(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('desafios').getPublicUrl(path);
    setForm(f => ({ ...f, imagem_capa_url: urlData.publicUrl }));
    toast.success('Imagem enviada!');
    setUploadingImage(false);
  };

  const openEdit = (c: Challenge) => {
    setEditingId(c.id);
    setForm({
      titulo: c.titulo,
      descricao: c.descricao || '',
      imagem_capa_url: c.imagem_capa_url || '',
      total_dias: c.total_dias,
      is_active: c.is_active,
    });
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
      // Update
      const { error } = await supabase.from('desafios').update({
        titulo: form.titulo,
        descricao: form.descricao,
        imagem_capa_url: form.imagem_capa_url,
        is_active: form.is_active,
      }).eq('id', editingId);

      if (error) {
        toast.error('Erro ao atualizar: ' + error.message);
        setSaving(false);
        return;
      }
      toast.success('Desafio atualizado!');
    } else {
      // Create
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        imagem_capa_url: form.imagem_capa_url,
        total_dias: form.total_dias,
        is_active: form.is_active,
      };
      console.log('Creating challenge with payload:', payload);
      
      const { data, error } = await supabase.from('desafios').insert([payload]).select().single();
      if (error) {
        toast.error('Erro ao criar desafio: ' + error.message);
        console.error('Insert error:', error);
        setSaving(false);
        return;
      }

      if (!data) {
        toast.error('Desafio não foi criado - verifique as permissões RLS');
        setSaving(false);
        return;
      }

      // Create days
      const daysToInsert = Array.from({ length: form.total_dias }, (_, i) => ({
        desafio_id: data.id,
        numero_dia: i + 1,
        titulo: '',
        video_url: '',
        pdf_url: '',
        alimentos: '',
        receita: '',
        liberado: false,
      }));
      
      const { error: daysError } = await supabase.from('desafio_dias').insert(daysToInsert);
      if (daysError) {
        toast.error('Desafio criado mas erro ao gerar dias: ' + daysError.message);
        console.error('Days insert error:', daysError);
      } else {
        toast.success(`Desafio criado com ${form.total_dias} dias!`);
      }
    }

    setShowForm(false);
    setSaving(false);
    load();
  };

  const toggleActive = async (c: Challenge) => {
    const { error } = await supabase.from('desafios').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    toast.success(c.is_active ? 'Desafio desativado' : 'Desafio ativado');
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error: daysErr } = await supabase.from('desafio_dias').delete().eq('desafio_id', deleteId);
    if (daysErr) { toast.error('Erro ao excluir dias: ' + daysErr.message); return; }
    const { error: progErr } = await supabase.from('desafio_progresso').delete().eq('desafio_id', deleteId);
    if (progErr) console.warn('Erro ao excluir progresso:', progErr.message);
    const { error } = await supabase.from('desafios').delete().eq('id', deleteId);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Desafio excluído');
    setDeleteId(null);
    load();
  };

  // === Day management ===
  const openManage = async (c: Challenge) => {
    setManagingChallenge(c);
    setDaysLoading(true);
    const { data, error } = await supabase.from('desafio_dias').select('*').eq('desafio_id', c.id).order('numero_dia');
    if (error) toast.error('Erro ao carregar dias: ' + error.message);
    setDays(data || []);
    setDaysLoading(false);
  };

  const notifyUsersAboutDay = async (challengeTitle: string, challengeId: string, dayNum: number) => {
    // Get all user profiles to notify
    const { data: users } = await supabase.from('profiles').select('id');
    if (!users || users.length === 0) return;

    const notifications = users.map(u => ({
      user_id: u.id,
      titulo: '🔓 Novo dia liberado!',
      mensagem: `Dia ${dayNum} do desafio "${challengeTitle}" já está disponível!`,
      link: `/app/desafios/${challengeId}/dia/${dayNum}`,
      lida: false,
    }));

    await supabase.from('notificacoes').insert(notifications);
  };

  const toggleDayLiberado = async (day: DayData) => {
    const newValue = !day.liberado;
    const { error } = await supabase.from('desafio_dias').update({ liberado: newValue }).eq('id', day.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setDays(prev => prev.map(d => d.id === day.id ? { ...d, liberado: newValue } : d));
    
    if (newValue && managingChallenge) {
      await notifyUsersAboutDay(managingChallenge.titulo, managingChallenge.id, day.numero_dia);
    }
    toast.success(newValue ? `Dia ${day.numero_dia} liberado e notificações enviadas!` : `Dia ${day.numero_dia} bloqueado`);
  };

  const bulkToggle = async (liberado: boolean) => {
    if (!managingChallenge) return;
    const { error } = await supabase.from('desafio_dias').update({ liberado }).eq('desafio_id', managingChallenge.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setDays(prev => prev.map(d => ({ ...d, liberado })));
    toast.success(liberado ? 'Todos os dias liberados!' : 'Todos os dias bloqueados');
  };

  const releaseNext = async () => {
    const nextBlocked = days.find(d => !d.liberado);
    if (!nextBlocked) { toast.info('Todos os dias já estão liberados'); return; }
    const { error } = await supabase.from('desafio_dias').update({ liberado: true }).eq('id', nextBlocked.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setDays(prev => prev.map(d => d.id === nextBlocked.id ? { ...d, liberado: true } : d));
    
    if (managingChallenge) {
      await notifyUsersAboutDay(managingChallenge.titulo, managingChallenge.id, nextBlocked.numero_dia);
    }
    toast.success(`Dia ${nextBlocked.numero_dia} liberado e notificações enviadas!`);
  };

  const handleDayPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingDay) return;
    const path = `pdfs/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('desafios').upload(path, file);
    if (error) { toast.error('Erro no upload: ' + error.message); return; }
    const { data: urlData } = supabase.storage.from('desafios').getPublicUrl(path);
    setEditingDay(prev => prev ? { ...prev, pdf_url: urlData.publicUrl } : null);
    toast.success('PDF enviado!');
  };

  const saveDayEdit = async () => {
    if (!editingDay) return;
    setSavingDay(true);
    const { error } = await supabase.from('desafio_dias').update({
      titulo: editingDay.titulo,
      video_url: editingDay.video_url,
      pdf_url: editingDay.pdf_url,
      alimentos: editingDay.alimentos,
      receita: editingDay.receita,
      liberado: editingDay.liberado,
    }).eq('id', editingDay.id);

    if (error) {
      toast.error('Erro ao salvar dia: ' + error.message);
    } else {
      toast.success(`Dia ${editingDay.numero_dia} salvo!`);
      setDays(prev => prev.map(d => d.id === editingDay.id ? editingDay : d));
      setEditingDay(null);
    }
    setSavingDay(false);
  };

  const getYouTubeId = (url: string) => {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    return m?.[1] || null;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5"><Trophy className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalChallenges}</p>
                <p className="text-sm text-muted-foreground">Desafios</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-accent p-2.5"><Calendar className="h-5 w-5 text-accent-foreground" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalDays}</p>
                <p className="text-sm text-muted-foreground">Dias criados</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalParticipants}</p>
                <p className="text-sm text-muted-foreground">Participantes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Desafios</h1>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo Desafio</Button>
        </div>

        {/* List */}
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
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Trophy className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.titulo}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm text-muted-foreground">{c.total_dias} dias</span>
                      {dc && (
                        <Badge variant="secondary" className="text-xs">
                          {dc.liberados}/{dc.total} liberados
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                    <span className="text-xs text-muted-foreground w-12">{c.is_active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openManage(c)}>
                    <Settings className="h-4 w-4 mr-1" /> Dias
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Challenge Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Desafio' : 'Novo Desafio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Nome do desafio" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do desafio" rows={3} />
            </div>
            <div>
              <Label>Imagem de capa</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.imagem_capa_url} onChange={e => setForm(f => ({ ...f, imagem_capa_url: e.target.value }))} placeholder="URL ou faça upload" className="flex-1" />
                <Button variant="outline" size="sm" asChild disabled={uploadingImage}>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" /> {uploadingImage ? 'Enviando...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </Button>
              </div>
              {form.imagem_capa_url && (
                <img src={form.imagem_capa_url} alt="" className="mt-2 h-32 w-full rounded-lg object-cover" />
              )}
            </div>
            {!editingId && (
              <div>
                <Label>Total de dias</Label>
                <Input type="number" min={1} value={form.total_dias} onChange={e => setForm(f => ({ ...f, total_dias: Math.max(1, parseInt(e.target.value) || 1) }))} />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Ativo</Label>
            </div>
            <Button onClick={saveChallenge} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar Desafio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir desafio?</AlertDialogTitle>
            <AlertDialogDescription>Todos os dias e progresso dos alunos serão removidos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Days Dialog */}
      <Dialog open={!!managingChallenge && !editingDay} onOpenChange={() => setManagingChallenge(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar dias — {managingChallenge?.titulo}</DialogTitle>
          </DialogHeader>

          {daysLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : (
            <>
              {/* Bulk actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={releaseNext}>
                  <ChevronRight className="h-4 w-4 mr-1" /> Liberar próximo dia
                </Button>
                <Button variant="outline" size="sm" onClick={() => bulkToggle(true)}>
                  <Unlock className="h-4 w-4 mr-1" /> Liberar todos
                </Button>
                <Button variant="outline" size="sm" onClick={() => bulkToggle(false)}>
                  <Lock className="h-4 w-4 mr-1" /> Bloquear todos
                </Button>
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {days.map(day => (
                  <div
                    key={day.id}
                    className={`relative rounded-xl border p-4 text-center space-y-2 transition-all ${
                      day.liberado
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${
                      day.liberado ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {day.numero_dia}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{day.titulo || 'Sem título'}</p>
                    <div className="flex items-center justify-center gap-1">
                      <Switch
                        checked={day.liberado}
                        onCheckedChange={() => toggleDayLiberado(day)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setEditingDay({ ...day })}>
                      <Edit className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Day Modal */}
      <Dialog open={!!editingDay} onOpenChange={() => setEditingDay(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dia {editingDay?.numero_dia}</DialogTitle>
          </DialogHeader>
          {editingDay && (
            <div className="space-y-4">
              <div>
                <Label>Título do dia</Label>
                <Input value={editingDay.titulo} onChange={e => setEditingDay(prev => prev ? { ...prev, titulo: e.target.value } : null)} placeholder="Ex: Detox inicial" />
              </div>
              <div>
                <Label>URL do Vídeo</Label>
                <Input value={editingDay.video_url} onChange={e => setEditingDay(prev => prev ? { ...prev, video_url: e.target.value } : null)} placeholder="YouTube, Vimeo ou link direto" />
                {editingDay.video_url && getYouTubeId(editingDay.video_url) && (
                  <div className="mt-2 aspect-video rounded-lg overflow-hidden">
                    <iframe src={`https://www.youtube.com/embed/${getYouTubeId(editingDay.video_url)}`} className="w-full h-full" allowFullScreen />
                  </div>
                )}
              </div>
              <div>
                <Label>PDF da Dieta</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={editingDay.pdf_url} onChange={e => setEditingDay(prev => prev ? { ...prev, pdf_url: e.target.value } : null)} placeholder="URL do PDF" className="flex-1 text-sm" />
                  <Button variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-1" /> PDF
                      <input type="file" accept=".pdf" className="hidden" onChange={handleDayPdfUpload} />
                    </label>
                  </Button>
                </div>
                {editingDay.pdf_url && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">📄 {editingDay.pdf_url.split('/').pop()}</p>
                )}
              </div>
              <div>
                <Label>Alimentos permitidos</Label>
                <Textarea value={editingDay.alimentos} onChange={e => setEditingDay(prev => prev ? { ...prev, alimentos: e.target.value } : null)} rows={4} placeholder="Liste os alimentos..." />
              </div>
              <div>
                <Label>Receita do dia</Label>
                <Textarea value={editingDay.receita} onChange={e => setEditingDay(prev => prev ? { ...prev, receita: e.target.value } : null)} rows={4} placeholder="Descreva a receita..." />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editingDay.liberado} onCheckedChange={v => setEditingDay(prev => prev ? { ...prev, liberado: v } : null)} />
                <Label>Liberado para alunos</Label>
              </div>
              <Button onClick={saveDayEdit} disabled={savingDay} className="w-full">
                <Save className="mr-2 h-4 w-4" /> {savingDay ? 'Salvando...' : 'Salvar dia'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
