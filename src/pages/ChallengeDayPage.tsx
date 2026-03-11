import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Download, CheckCircle, ArrowLeft, Clock, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

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

function VideoPlayer({ url }: { url: string }) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
        <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
        <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="w-full h-full" allowFullScreen />
      </div>
    );
  }
  return (
    <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
      <video src={url} controls className="w-full h-full bg-black" />
    </div>
  );
}

/** Checks if HTML content has meaningful text (not just empty tags) */
function hasContent(html: string | undefined | null): boolean {
  if (!html) return false;
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return stripped.length > 0;
}

/** Renders HTML content with styled prose, sanitized against XSS */
function RichContent({ html, className = '' }: { html: string; className?: string }) {
  const clean = DOMPurify.sanitize(html);
  return (
    <div
      className={`rich-content text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

const mealFields: { key: keyof DayData; label: string; emoji: string }[] = [
  { key: 'cafe_manha', label: 'Café da manhã', emoji: '🌅' },
  { key: 'lanche_manha', label: 'Lanche da manhã', emoji: '☀️' },
  { key: 'almoco', label: 'Almoço', emoji: '🥗' },
  { key: 'lanche_tarde', label: 'Lanche da tarde', emoji: '🌤️' },
  { key: 'jantar', label: 'Jantar', emoji: '🌙' },
  { key: 'ceia', label: 'Ceia', emoji: '🌜' },
];

export default function ChallengeDayPage() {
  const { id, numero } = useParams<{ id: string; numero: string }>();
  const { user } = useAuth();
  const [day, setDay] = useState<DayData | null>(null);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (id && numero) loadDay();
  }, [id, numero]);

  const loadDay = async () => {
    const [dayRes, challengeRes] = await Promise.all([
      supabase.from('desafio_dias').select('*').eq('desafio_id', id).eq('numero_dia', Number(numero)).single(),
      supabase.from('desafios').select('titulo').eq('id', id).single(),
    ]);

    if (dayRes.data) setDay(dayRes.data);
    if (challengeRes.data) setChallengeTitle(challengeRes.data.titulo);

    if (user && id) {
      const { data: prog } = await supabase
        .from('desafio_progresso')
        .select('concluido')
        .eq('desafio_id', id)
        .eq('user_id', user.id)
        .eq('numero_dia', Number(numero))
        .maybeSingle();
      if (prog?.concluido) setCompleted(true);
    }
    setLoading(false);
  };

  const markComplete = async () => {
    if (!user || !id || !numero) return;
    setMarking(true);
    const { error } = await supabase.from('desafio_progresso').upsert({
      desafio_id: id, user_id: user.id, numero_dia: Number(numero), concluido: true,
    }, { onConflict: 'desafio_id,user_id,numero_dia' });

    if (!error) { setCompleted(true); toast.success('Dia marcado como concluído! 🎉'); }
    else toast.error('Erro ao marcar progresso');
    setMarking(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-6 py-8 md:px-16 space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[50vh] w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-4"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>
        </div>
      </AppLayout>
    );
  }

  if (!day || !day.liberado) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <p className="text-muted-foreground">Este dia ainda não está disponível.</p>
          <Button asChild variant="outline"><Link to={`/app/desafios/${id}`}>Voltar ao desafio</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const hasMeals = mealFields.some(m => hasContent(day[m.key] as string));
  const hasRecipe = hasContent(day.titulo_receita) || hasContent(day.ingredientes) || hasContent(day.modo_preparo);

  return (
    <AppLayout>
      <AnimatedPage>
        <div className="px-6 py-8 md:px-16 max-w-4xl mx-auto space-y-8 pb-28">
          {/* Header */}
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-3">
            <Link to={`/app/desafios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> {challengeTitle}
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-xl">
                {day.numero_dia}
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
                  {day.titulo || `Dia ${day.numero_dia}`}
                </h1>
                <Badge className="bg-primary/15 text-primary border-primary/20 mt-1">✓ Liberado</Badge>
              </div>
            </div>
          </motion.div>

          {/* Video */}
          {day.video_url?.trim() && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <VideoPlayer url={day.video_url} />
            </motion.div>
          )}

          {/* Meals Grid */}
          {hasMeals && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">🍽️ Dieta de Hoje</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mealFields.map(({ key, label, emoji }) => {
                  const content = day[key] as string;
                  if (!hasContent(content)) return null;
                  return (
                    <div key={key} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{emoji}</span>
                        <h3 className="font-medium text-foreground text-sm">{label}</h3>
                      </div>
                      <RichContent html={content} />
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* Alimentos Permitidos */}
          {hasContent(day.alimentos) && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-foreground">✅ Alimentos Permitidos Hoje</h2>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <RichContent html={day.alimentos} />
              </div>
            </motion.section>
          )}

          {/* Recipe */}
          {hasRecipe && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">
                <ChefHat className="inline h-5 w-5 mr-1.5" /> Receita do Dia
              </h2>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                {hasContent(day.titulo_receita) && <h3 className="text-lg font-semibold text-foreground">{day.titulo_receita}</h3>}
                {(day.tempo_preparo?.trim() || day.rendimento?.trim()) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {day.tempo_preparo?.trim() && <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {day.tempo_preparo}</span>}
                    {day.rendimento?.trim() && <span>📦 {day.rendimento}</span>}
                  </div>
                )}
                {hasContent(day.ingredientes) && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">Ingredientes</h4>
                    <RichContent html={day.ingredientes} />
                  </div>
                )}
                {hasContent(day.modo_preparo) && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1.5">Modo de Preparo</h4>
                    <RichContent html={day.modo_preparo} />
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* Observações */}
          {hasContent(day.observacoes) && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
                <h2 className="font-display text-lg font-semibold text-foreground">💡 Observações e Dicas</h2>
                <RichContent html={day.observacoes} />
              </div>
            </motion.section>
          )}

          {/* PDF */}
          {day.pdf_url?.trim() && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Button asChild variant="outline" className="w-full" size="lg">
                <a href={day.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-5 w-5" /> Baixar material complementar
                </a>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Fixed bottom button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border z-40">
          <div className="max-w-4xl mx-auto">
            {completed ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-medium">
                <CheckCircle className="h-5 w-5" /> Dia concluído! 🎉
              </div>
            ) : (
              <Button onClick={markComplete} disabled={marking} size="lg" className="w-full text-base">
                <CheckCircle className="mr-2 h-5 w-5" /> {marking ? 'Marcando...' : 'Marcar dia como concluído'}
              </Button>
            )}
          </div>
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}
