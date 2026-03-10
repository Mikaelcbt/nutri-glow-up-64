import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RichEditor from '@/components/RichEditor';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload } from 'lucide-react';

interface DayData {
  id: string;
  desafio_id: string;
  numero_dia: number;
  titulo: string;
  video_url: string;
  pdf_url: string;
  alimentos: string;
  liberado: boolean;
  cafe_manha: string;
  lanche_manha: string;
  almoco: string;
  lanche_tarde: string;
  jantar: string;
  ceia: string;
  observacoes: string;
  titulo_receita: string;
  ingredientes: string;
  modo_preparo: string;
  tempo_preparo: string;
  rendimento: string;
}

export default function AdminChallengeDayEdit() {
  const { id, numero } = useParams<{ id: string; numero: string }>();
  const navigate = useNavigate();
  const [day, setDay] = useState<DayData | null>(null);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && numero) loadDay();
  }, [id, numero]);

  const loadDay = async () => {
    setLoading(true);
    const [chRes, dayRes] = await Promise.all([
      supabase.from('desafios').select('titulo').eq('id', id!).single(),
      supabase.from('desafio_dias').select('*').eq('desafio_id', id!).eq('numero_dia', parseInt(numero!)).single(),
    ]);
    if (chRes.data) setChallengeTitle(chRes.data.titulo);
    if (dayRes.error || !dayRes.data) { toast.error('Dia não encontrado'); navigate(`/admin/desafios/${id}/dias`); return; }
    setDay(dayRes.data as DayData);
    setLoading(false);
  };

  const update = (field: keyof DayData, value: string | boolean) => {
    setDay(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !day) return;
    const path = `pdfs/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('desafios').upload(path, file);
    if (error) { toast.error('Erro no upload: ' + error.message); return; }
    const { data: urlData } = supabase.storage.from('desafios').getPublicUrl(path);
    update('pdf_url', urlData.publicUrl);
    toast.success('PDF enviado!');
  };

  const save = async () => {
    if (!day) return;
    setSaving(true);
    const { error } = await supabase.from('desafio_dias').update({
      titulo: day.titulo,
      video_url: day.video_url || '',
      pdf_url: day.pdf_url || '',
      alimentos: day.alimentos || '',
      liberado: day.liberado,
      cafe_manha: day.cafe_manha || '',
      lanche_manha: day.lanche_manha || '',
      almoco: day.almoco || '',
      lanche_tarde: day.lanche_tarde || '',
      jantar: day.jantar || '',
      ceia: day.ceia || '',
      observacoes: day.observacoes || '',
      titulo_receita: day.titulo_receita || '',
      ingredientes: day.ingredientes || '',
      modo_preparo: day.modo_preparo || '',
      tempo_preparo: day.tempo_preparo || '',
      rendimento: day.rendimento || '',
    }).eq('id', day.id);

    if (error) toast.error('Erro ao salvar: ' + error.message);
    else toast.success(`Dia ${day.numero_dia} salvo com sucesso!`);
    setSaving(false);
  };

  const getYouTubeId = (url: string) => {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    return m?.[1] || null;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!day) return null;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/desafios/${id}/dias`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Dia {day.numero_dia}</h1>
            <p className="text-sm text-muted-foreground">{challengeTitle}</p>
          </div>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="dieta">Dieta do Dia</TabsTrigger>
            <TabsTrigger value="receita">Receita do Dia</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div>
              <Label>Título do dia</Label>
              <Input value={day.titulo} onChange={e => update('titulo', e.target.value)} placeholder="Ex: Detox inicial" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={day.liberado} onCheckedChange={v => update('liberado', v)} />
              <Label>Liberado para alunos</Label>
            </div>
            <div>
              <Label>URL do Vídeo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input value={day.video_url || ''} onChange={e => update('video_url', e.target.value)} placeholder="YouTube, Vimeo ou link direto" />
              {day.video_url && getYouTubeId(day.video_url) && (
                <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe src={`https://www.youtube.com/embed/${getYouTubeId(day.video_url)}`} className="w-full h-full" allowFullScreen />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dieta" className="space-y-5 mt-4">
            <RichEditor label="Café da manhã" emoji="🌅" content={day.cafe_manha || ''} onChange={v => update('cafe_manha', v)} />
            <RichEditor label="Lanche da manhã" emoji="☀️" content={day.lanche_manha || ''} onChange={v => update('lanche_manha', v)} />
            <RichEditor label="Almoço" emoji="🥗" content={day.almoco || ''} onChange={v => update('almoco', v)} />
            <RichEditor label="Lanche da tarde" emoji="🌤️" content={day.lanche_tarde || ''} onChange={v => update('lanche_tarde', v)} />
            <RichEditor label="Jantar" emoji="🌙" content={day.jantar || ''} onChange={v => update('jantar', v)} />
            <RichEditor label="Ceia" emoji="🌜" content={day.ceia || ''} onChange={v => update('ceia', v)} />

            <div className="border-t border-border pt-4">
              <RichEditor label="Alimentos permitidos hoje" emoji="✅" content={day.alimentos || ''} onChange={v => update('alimentos', v)} />
            </div>
            <RichEditor label="Observações e dicas do dia" emoji="💡" content={day.observacoes || ''} onChange={v => update('observacoes', v)} />

            <div>
              <Label>PDF complementar <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <div className="flex gap-2 mt-1">
                <Input value={day.pdf_url || ''} onChange={e => update('pdf_url', e.target.value)} placeholder="URL do PDF" className="flex-1 text-sm" />
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer"><Upload className="h-4 w-4 mr-1" /> PDF<input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} /></label>
                </Button>
              </div>
              {day.pdf_url && <p className="text-xs text-muted-foreground mt-1 truncate">📄 {day.pdf_url.split('/').pop()}</p>}
            </div>
          </TabsContent>

          <TabsContent value="receita" className="space-y-5 mt-4">
            <div>
              <Label>Título da receita</Label>
              <Input value={day.titulo_receita || ''} onChange={e => update('titulo_receita', e.target.value)} placeholder="Ex: Sopa detox de legumes" />
            </div>
            <RichEditor label="Ingredientes" emoji="📝" content={day.ingredientes || ''} onChange={v => update('ingredientes', v)} />
            <RichEditor label="Modo de preparo" emoji="👨‍🍳" content={day.modo_preparo || ''} onChange={v => update('modo_preparo', v)} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tempo de preparo</Label>
                <Input value={day.tempo_preparo || ''} onChange={e => update('tempo_preparo', e.target.value)} placeholder="Ex: 30 minutos" />
              </div>
              <div>
                <Label>Rendimento</Label>
                <Input value={day.rendimento || ''} onChange={e => update('rendimento', e.target.value)} placeholder="Ex: 4 porções" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom save button */}
        <Button onClick={save} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </AdminLayout>
  );
}
