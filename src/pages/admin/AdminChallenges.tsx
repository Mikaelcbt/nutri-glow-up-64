import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, Upload } from 'lucide-react';
import { useRef } from 'react';

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

export default function AdminChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', imagem_capa_url: '', total_dias: 7, is_active: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Day management
  const [managingChallenge, setManagingChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [daysLoading, setDaysLoading] = useState(false);
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('desafios').select('*').order('created_at', { ascending: false });
    setChallenges(data || []);
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `capas/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('desafios').upload(path, file);
    if (error) { toast.error('Erro no upload'); return; }
    const { data: urlData } = supabase.storage.from('desafios').getPublicUrl(path);
    setForm(f => ({ ...f, imagem_capa_url: urlData.publicUrl }));
    toast.success('Imagem enviada!');
  };

  const saveChallenge = async () => {
    if (!form.titulo || form.total_dias < 1) { toast.error('Preencha título e dias (mínimo 1)'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('desafios').insert([form]).select().single();
    if (error) { toast.error('Erro ao salvar'); setSaving(false); return; }

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
    await supabase.from('desafio_dias').insert(daysToInsert);

    toast.success('Desafio criado com ' + form.total_dias + ' dias!');
    setShowNew(false);
    setForm({ titulo: '', descricao: '', imagem_capa_url: '', total_dias: 7, is_active: true });
    setSaving(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('desafio_dias').delete().eq('desafio_id', deleteId);
    await supabase.from('desafios').delete().eq('id', deleteId);
    toast.success('Desafio excluído');
    setDeleteId(null);
    load();
  };

  // Day management
  const openManage = async (c: Challenge) => {
    setManagingChallenge(c);
    setDaysLoading(true);
    const { data } = await supabase.from('desafio_dias').select('*').eq('desafio_id', c.id).order('numero_dia');
    setDays(data || []);
    setDaysLoading(false);
  };

  const updateDayField = (dayId: string, field: string, value: any) => {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, [field]: value } : d));
  };

  const handleDayPdfUpload = async (dayId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `pdfs/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('desafios').upload(path, file);
    if (error) { toast.error('Erro no upload do PDF'); return; }
    const { data: urlData } = supabase.storage.from('desafios').getPublicUrl(path);
    updateDayField(dayId, 'pdf_url', urlData.publicUrl);
    toast.success('PDF enviado!');
  };

  const saveDay = async (day: DayData) => {
    setSavingDay(day.id);
    const { error } = await supabase.from('desafio_dias').update({
      titulo: day.titulo,
      video_url: day.video_url,
      pdf_url: day.pdf_url,
      alimentos: day.alimentos,
      receita: day.receita,
      liberado: day.liberado,
    }).eq('id', day.id);

    if (error) toast.error('Erro ao salvar dia');
    else toast.success(`Dia ${day.numero_dia} salvo!`);
    setSavingDay(null);
  };

  const scrollDays = (dir: 'left' | 'right') => {
    carouselRef.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Desafios</h1>
          <Button onClick={() => setShowNew(true)}><Plus className="mr-2 h-4 w-4" /> Novo Desafio</Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : challenges.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">Nenhum desafio cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {challenges.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
                {c.imagem_capa_url ? (
                  <img src={c.imagem_capa_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">Sem img</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{c.titulo}</p>
                  <p className="text-sm text-muted-foreground">{c.total_dias} dias • {c.is_active ? 'Ativo' : 'Inativo'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openManage(c)}>Gerenciar dias</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Challenge Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Desafio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div>
              <Label>Imagem de capa</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.imagem_capa_url} onChange={e => setForm(f => ({ ...f, imagem_capa_url: e.target.value }))} placeholder="URL ou faça upload" className="flex-1" />
                <Button variant="outline" size="sm" asChild><label className="cursor-pointer"><Upload className="h-4 w-4 mr-1" /> Upload<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label></Button>
              </div>
              {form.imagem_capa_url && <img src={form.imagem_capa_url} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
            </div>
            <div><Label>Total de dias</Label><Input type="number" min={1} value={form.total_dias} onChange={e => setForm(f => ({ ...f, total_dias: Math.max(1, parseInt(e.target.value) || 1) }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Ativo</Label></div>
            <Button onClick={saveChallenge} disabled={saving} className="w-full">{saving ? 'Salvando...' : 'Criar Desafio'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir desafio?</AlertDialogTitle>
            <AlertDialogDescription>Todos os dias e progresso serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Days Dialog */}
      <Dialog open={!!managingChallenge} onOpenChange={() => setManagingChallenge(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar dias — {managingChallenge?.titulo}</DialogTitle>
          </DialogHeader>

          {daysLoading ? (
            <div className="flex gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-96 w-72 rounded-xl flex-shrink-0" />)}</div>
          ) : (
            <>
              <div className="flex justify-end gap-2 mb-2">
                <button onClick={() => scrollDays('left')} className="rounded-full border border-border p-1.5 hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => scrollDays('right')} className="rounded-full border border-border p-1.5 hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div ref={carouselRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-4" style={{ scrollbarWidth: 'none' }}>
                {days.map(day => (
                  <div key={day.id} className="flex-shrink-0 w-72 rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Dia {day.numero_dia}</span>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Liberado</Label>
                        <Switch checked={day.liberado} onCheckedChange={v => updateDayField(day.id, 'liberado', v)} />
                      </div>
                    </div>
                    <div><Label className="text-xs">Título</Label><Input value={day.titulo} onChange={e => updateDayField(day.id, 'titulo', e.target.value)} placeholder="Título do dia" /></div>
                    <div><Label className="text-xs">URL do Vídeo</Label><Input value={day.video_url} onChange={e => updateDayField(day.id, 'video_url', e.target.value)} placeholder="YouTube, Vimeo ou direto" /></div>
                    <div>
                      <Label className="text-xs">PDF da Dieta</Label>
                      <div className="flex gap-1 mt-1">
                        <Input value={day.pdf_url} onChange={e => updateDayField(day.id, 'pdf_url', e.target.value)} placeholder="URL do PDF" className="flex-1 text-xs" />
                        <Button variant="outline" size="sm" asChild><label className="cursor-pointer text-xs"><Upload className="h-3 w-3" /><input type="file" accept=".pdf" className="hidden" onChange={e => handleDayPdfUpload(day.id, e)} /></label></Button>
                      </div>
                    </div>
                    <div><Label className="text-xs">Alimentos permitidos</Label><Textarea value={day.alimentos} onChange={e => updateDayField(day.id, 'alimentos', e.target.value)} rows={3} placeholder="Lista de alimentos..." /></div>
                    <div><Label className="text-xs">Receita do dia</Label><Textarea value={day.receita} onChange={e => updateDayField(day.id, 'receita', e.target.value)} rows={3} placeholder="Receita..." /></div>
                    <Button onClick={() => saveDay(day)} disabled={savingDay === day.id} size="sm" className="w-full">
                      <Save className="mr-1 h-3 w-3" /> {savingDay === day.id ? 'Salvando...' : 'Salvar dia'}
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
