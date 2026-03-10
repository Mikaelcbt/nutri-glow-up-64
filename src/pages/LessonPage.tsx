import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, Play, Trophy, PartyPopper } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface LessonData {
  id: string; titulo: string; descricao: string; conteudo: string;
  video_url: string; ordem: number; module_id: string;
}
interface SiblingLesson { id: string; titulo: string; ordem: number; }

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [siblings, setSiblings] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });
  const [moduleLessons, setModuleLessons] = useState<SiblingLesson[]>([]);
  const [moduleName, setModuleName] = useState('');
  const [productSlug, setProductSlug] = useState('');
  const [showModuleComplete, setShowModuleComplete] = useState(false);
  const [showProgramComplete, setShowProgramComplete] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => { if (id) loadLesson(); }, [id, user]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (autoAdvanceTimer) clearInterval(autoAdvanceTimer); };
  }, [autoAdvanceTimer]);

  const loadLesson = async () => {
    setLesson(null);
    setShowModuleComplete(false);
    setShowProgramComplete(false);
    setCountdown(5);
    if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    try {
      const { data, error } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();
      if (error) { toast.error('Erro ao carregar aula: ' + error.message); return; }
      if (!data) return;
      setLesson(data);

      // Get module name and product slug
      const { data: mod } = await supabase.from('modules').select('id, titulo, product_id').eq('id', data.module_id).maybeSingle();
      if (mod) {
        setModuleName(mod.titulo);
        const { data: prod } = await supabase.from('products').select('slug').eq('id', mod.product_id).maybeSingle();
        if (prod) setProductSlug(prod.slug);
      }

      if (user) {
        const { data: prog } = await supabase.from('rastreamento_progresso')
          .select('concluido').eq('user_id', user.id).eq('lesson_id', data.id).maybeSingle();
        setCompleted(prog?.concluido || false);
        if (!prog) {
          await supabase.from('rastreamento_progresso').upsert(
            { user_id: user.id, lesson_id: data.id, concluido: false },
            { onConflict: 'user_id,lesson_id' }
          );
        }
      }

      const { data: allLessons } = await supabase.from('lessons')
        .select('id, titulo, ordem').eq('module_id', data.module_id).order('ordem');
      if (allLessons) {
        setModuleLessons(allLessons);
        const idx = allLessons.findIndex(l => l.id === data.id);
        setSiblings({
          prev: idx > 0 ? allLessons[idx - 1].id : null,
          next: idx < allLessons.length - 1 ? allLessons[idx + 1].id : null,
        });
      }
    } catch (err) { console.error(err); }
  };

  const markComplete = async () => {
    if (!user || !lesson) return;
    setMarking(true);
    try {
      const { error } = await supabase.from('rastreamento_progresso').upsert(
        { user_id: user.id, lesson_id: lesson.id, concluido: true, concluido_em: new Date().toISOString() },
        { onConflict: 'user_id,lesson_id' }
      );
      if (error) { toast.error('Erro ao salvar progresso: ' + error.message); return; }
      setCompleted(true);
      toast.success('Aula concluída! 🎉');

      // Check module completion
      const allLessonIds = moduleLessons.map(l => l.id);
      const { data: progress } = await supabase.from('rastreamento_progresso')
        .select('lesson_id').eq('user_id', user.id).eq('concluido', true)
        .in('lesson_id', allLessonIds);
      const completedCount = (progress?.length || 0);
      
      if (completedCount >= allLessonIds.length) {
        // All lessons in module completed
        // Check if all program modules are complete
        const { data: mod } = await supabase.from('modules').select('product_id').eq('id', lesson.module_id).maybeSingle();
        if (mod) {
          const { data: allMods } = await supabase.from('modules').select('id').eq('product_id', mod.product_id);
          const allModIds = allMods?.map(m => m.id) || [];
          const { data: allProgramLessons } = await supabase.from('lessons').select('id').in('module_id', allModIds);
          const allProgramLessonIds = allProgramLessons?.map(l => l.id) || [];
          const { data: allProg } = await supabase.from('rastreamento_progresso')
            .select('lesson_id').eq('user_id', user.id).eq('concluido', true).in('lesson_id', allProgramLessonIds);
          
          if ((allProg?.length || 0) >= allProgramLessonIds.length) {
            setShowProgramComplete(true);
          } else {
            setShowModuleComplete(true);
          }
        }
      } else if (siblings.next) {
        // Auto advance countdown
        let c = 5;
        setCountdown(c);
        const timer = window.setInterval(() => {
          c--;
          setCountdown(c);
          if (c <= 0) {
            clearInterval(timer);
            navigate(`/app/aula/${siblings.next}`);
          }
        }, 1000);
        setAutoAdvanceTimer(timer);
      }
    } finally { setMarking(false); }
  };

  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  const isDirectVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

  if (!lesson) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Breadcrumb items={[
        { label: 'Início', href: '/app' },
        ...(productSlug ? [{ label: 'Programa', href: `/app/programa/${productSlug}` }] : []),
        ...(moduleName ? [{ label: moduleName }] : []),
        { label: lesson.titulo },
      ]} />

      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 max-w-4xl mx-auto px-4 py-8 lg:px-8">
          {lesson.video_url && (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-card mb-8 shadow-soft border border-border">
              {isDirectVideo(lesson.video_url) ? (
                <video src={lesson.video_url} controls className="h-full w-full" />
              ) : (
                <iframe src={getEmbedUrl(lesson.video_url)} className="h-full w-full" allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture" />
              )}
            </div>
          )}

          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-4xl font-semibold text-foreground">{lesson.titulo}</h1>
              <p className="mt-2 text-muted-foreground">{lesson.descricao}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                onClick={markComplete} disabled={completed || marking}
                variant={completed ? 'outline' : 'default'}
                className={`flex-shrink-0 ${completed ? 'border-primary text-primary' : ''}`}
              >
                {marking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                  : <><CheckCircle className="mr-2 h-4 w-4" /> {completed ? 'Concluída ✓' : 'Marcar como concluída'}</>}
              </Button>
              {autoAdvanceTimer && countdown > 0 && siblings.next && (
                <span className="text-xs text-muted-foreground">
                  Próxima aula em {countdown}s...{' '}
                  <button onClick={() => { if (autoAdvanceTimer) clearInterval(autoAdvanceTimer); setAutoAdvanceTimer(null); }} className="text-primary underline">cancelar</button>
                </span>
              )}
            </div>
          </div>

          {lesson.conteudo && (
            <div className="prose max-w-none mb-12 prose-headings:font-display prose-a:text-primary prose-headings:text-foreground text-foreground">
              <ReactMarkdown>{lesson.conteudo}</ReactMarkdown>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-6">
            {siblings.prev ? (
              <Button asChild variant="outline">
                <Link to={`/app/aula/${siblings.prev}`}><ChevronLeft className="mr-2 h-4 w-4" /> Aula anterior</Link>
              </Button>
            ) : <div />}
            {siblings.next ? (
              <Button asChild>
                <Link to={`/app/aula/${siblings.next}`}>Próxima aula <ChevronRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : <div />}
          </div>
        </div>

        <aside className="w-80 border-l border-border bg-card p-4 hidden lg:block">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Aulas do módulo</h3>
          <div className="space-y-1">
            {moduleLessons.map((l) => (
              <Link
                key={l.id}
                to={`/app/aula/${l.id}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  l.id === lesson.id ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Play className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{l.titulo}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      {/* Module complete modal */}
      <Dialog open={showModuleComplete} onOpenChange={setShowModuleComplete}>
        <DialogContent className="bg-card border-border text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl flex items-center justify-center gap-2">
              <PartyPopper className="h-8 w-8 text-primary" /> Módulo concluído!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base mt-2">
              Parabéns! Você completou todas as aulas deste módulo. Continue assim! 🎉
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowModuleComplete(false)} className="mt-4">Continuar</Button>
        </DialogContent>
      </Dialog>

      {/* Program complete modal */}
      <Dialog open={showProgramComplete} onOpenChange={setShowProgramComplete}>
        <DialogContent className="bg-card border-border text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-primary" /> Programa concluído!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base mt-2">
              Incrível! Você completou todas as aulas do programa! Parabéns pela dedicação! 🏆
            </DialogDescription>
          </DialogHeader>
          <Button asChild className="mt-4">
            <Link to="/app">Voltar ao início</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}