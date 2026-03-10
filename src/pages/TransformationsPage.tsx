import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, ArrowLeftRight, Upload, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';

interface Transformation {
  id: string; user_id: string; foto_antes_url: string; foto_depois_url: string;
  descricao: string; criado_em: string; nome_completo: string;
}

export default function TransformationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Transformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [fotoBefore, setFotoBefore] = useState<File | null>(null);
  const [fotoAfter, setFotoAfter] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadTransformations(); }, []);

  const loadTransformations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('transformacoes').select('*').eq('aprovado', true).order('criado_em', { ascending: false });
      if (error) throw error;
      if (!data?.length) { setItems([]); return; }
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, nome_completo').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.nome_completo || 'Usuário']) || []);
      setItems(data.map(t => ({ ...t, nome_completo: profileMap.get(t.user_id) || 'Usuário' })));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar transformações');
    } finally { setLoading(false); }
  };

  const uploadPhoto = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from('transformacoes').upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('transformacoes').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const submit = async () => {
    if (!user || !fotoBefore || !fotoAfter) { toast.error('Envie as duas fotos'); return; }
    setSubmitting(true);
    try {
      const [beforeUrl, afterUrl] = await Promise.all([
        uploadPhoto(fotoBefore, 'antes'),
        uploadPhoto(fotoAfter, 'depois'),
      ]);
      const { error } = await supabase.from('transformacoes').insert({
        user_id: user.id, foto_antes_url: beforeUrl, foto_depois_url: afterUrl,
        descricao: descricao.trim(), aprovado: false,
      });
      if (error) throw error;
      toast.success('Transformação enviada! Aguarde aprovação.');
      setOpen(false); setDescricao(''); setFotoBefore(null); setFotoAfter(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar');
    } finally { setSubmitting(false); }
  };

  return (
    <AppLayout>
      <AnimatedPage>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="flex items-center justify-between mb-8">
            <h1 className="font-display text-3xl font-semibold text-foreground">Antes & Depois</h1>
            <Button onClick={() => setOpen(true)} className="active:scale-[0.97] transition-transform"><Plus className="mr-2 h-4 w-4" /> Enviar minha transformação</Button>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-2xl shimmer" />)}
            </div>
          ) : items.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-muted-foreground">
              <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-border" />
              <p>Nenhuma transformação aprovada ainda.</p>
            </motion.div>
          ) : (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={staggerContainer} initial="initial" animate="animate">
              {items.map(t => (
                <motion.div
                  key={t.id}
                  variants={fadeInUp}
                  className="rounded-2xl border border-border bg-card shadow-card overflow-hidden hover:shadow-soft hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex">
                    <div className="flex-1 relative">
                      <img src={t.foto_antes_url} alt="Antes" className="h-48 w-full object-cover" />
                      <span className="absolute bottom-2 left-2 rounded-full bg-card/80 px-2 py-0.5 text-xs font-medium">Antes</span>
                    </div>
                    <div className="flex-1 relative">
                      <img src={t.foto_depois_url} alt="Depois" className="h-48 w-full object-cover" />
                      <span className="absolute bottom-2 right-2 rounded-full bg-primary/80 px-2 py-0.5 text-xs font-medium text-primary-foreground">Depois</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-foreground">{t.nome_completo}</p>
                    {t.descricao && <p className="text-sm text-muted-foreground mt-1">{t.descricao}</p>}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-display text-2xl">Enviar transformação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">{fotoBefore ? fotoBefore.name : 'Foto ANTES'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoBefore(e.target.files?.[0] || null)} />
                </label>
                <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">{fotoAfter ? fotoAfter.name : 'Foto DEPOIS'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoAfter(e.target.files?.[0] || null)} />
                </label>
              </div>
              <Textarea placeholder="Conte sobre sua transformação..." value={descricao}
                onChange={(e) => setDescricao(e.target.value)} className="bg-secondary border-border" />
              <Button onClick={submit} disabled={submitting || !fotoBefore || !fotoAfter} className="w-full active:scale-[0.97] transition-transform">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Enviar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </AnimatedPage>
    </AppLayout>
  );
}
