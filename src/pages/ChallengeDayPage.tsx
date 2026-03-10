import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Download, CheckCircle, ArrowLeft, UtensilsCrossed, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

function VideoPlayer({ url }: { url: string }) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden">
        <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden">
        <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="w-full h-full" allowFullScreen />
      </div>
    );
  }
  return (
    <div className="aspect-video rounded-xl overflow-hidden">
      <video src={url} controls className="w-full h-full bg-black" />
    </div>
  );
}

export default function ChallengeDayPage() {
  const { id, numero } = useParams<{ id: string; numero: string }>();
  const { user } = useAuth();
  const [day, setDay] = useState<DayData | null>(null);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

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
    const { error } = await supabase.from('desafio_progresso').upsert({
      desafio_id: id,
      user_id: user.id,
      numero_dia: Number(numero),
      concluido: true,
    }, { onConflict: 'desafio_id,user_id,numero_dia' });

    if (!error) {
      setCompleted(true);
      toast.success('Dia marcado como concluído! 🎉');
    } else {
      toast.error('Erro ao marcar progresso');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-8 py-8 md:px-16 space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[50vh] w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
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

  return (
    <AppLayout>
      <AnimatedPage>
        <div className="px-8 py-8 md:px-16 max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-2">
            <Link to={`/app/desafios/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> {challengeTitle}
            </Link>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
              Dia {day.numero_dia} — {day.titulo || `Dia ${day.numero_dia}`}
            </h1>
          </motion.div>

          {/* Video */}
          {day.video_url && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <VideoPlayer url={day.video_url} />
            </motion.div>
          )}

          {/* PDF Download */}
          {day.pdf_url && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
            >
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">PDF da Dieta</p>
                <p className="text-sm text-muted-foreground">Baixe o plano alimentar do dia</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={day.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Download
                </a>
              </Button>
            </motion.div>
          )}

          {/* Alimentos */}
          {day.alimentos && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="p-6 rounded-xl border border-border bg-card space-y-3"
            >
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold text-foreground">Alimentos Permitidos</h2>
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-line">{day.alimentos}</div>
            </motion.div>
          )}

          {/* Receita */}
          {day.receita && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="p-6 rounded-xl border border-border bg-card space-y-3"
            >
              <h2 className="font-display text-xl font-semibold text-foreground">🍽️ Receita do Dia</h2>
              <div className="text-sm text-muted-foreground whitespace-pre-line">{day.receita}</div>
            </motion.div>
          )}

          {/* Mark Complete */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {completed ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-primary/10 text-primary">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Dia concluído!</span>
              </div>
            ) : (
              <Button onClick={markComplete} size="lg" className="w-full">
                <CheckCircle className="mr-2 h-5 w-5" /> Marcar dia como concluído
              </Button>
            )}
          </motion.div>
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}
