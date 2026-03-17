import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import AccessRequestModal from '@/components/AccessRequestModal';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, Play, Trophy, PartyPopper, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';

interface LessonData {
  id: string; titulo: string; descricao: string; conteudo: string;
  video_url: string; ordem: number; module_id: string; is_preview: boolean;
}
interface SiblingLesson { id: string; titulo: string; ordem: number; }

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [siblings, setSiblings] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });
  const [moduleLessons, setModuleLessons] = useState<SiblingLesson[]>([]);
  const [moduleName, setModuleName] = useState('');
  const [productSlug, setProductSlug] = useState('');
  const [productName, setProductName] = useState('');
  const [showModuleComplete, setShowModuleComplete] = useState(false);
  const [showProgramComplete, setShowProgramComplete] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [showCheckAnim, setShowCheckAnim] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => { if (id) loadLesson(); }, [id, user]);
  useEffect(() => { return () => { if (autoAdvanceTimer) clearInterval(autoAdvanceTimer); }; }, [autoAdvanceTimer]);

  const loadLesson = async () => {
    setLesson(null); setShowModuleComplete(false); setShowProgramComplete(false);
    setShowCheckAnim(false); setCountdown(5); setAccessChecked(false);
    if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    try {
      const { data, error } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();
      if (error) { toast.error('Erro ao carregar aula: ' + error.message); return; }
      if (!data) return;
      setLesson(data);

      const { data: mod } = await supabase.from('modules').select('id, titulo, product_id').eq('id', data.module_id).maybeSingle();
      if (mod) {
        setModuleName(mod.titulo);
        const { data: prod } = await supabase.from('products').select('slug, nome').eq('id', mod.product_id).maybeSingle();
        if (prod) { setProductSlug(prod.slug); setProductName(prod.nome); }

        // Check access
        if (isAdmin || data.is_preview) {
          setHasAccess(true);
        } else if (user) {
          const { data: assoc } = await supabase
            .from('associacoes').select('id').eq('user_id', user.id).eq('product_id', mod.product_id).eq('status', 'ativo').limit(1);
          setHasAccess((assoc?.length ?? 0) > 0);
        }
        setAccessChecked(true);
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
        setSiblings({ prev: idx > 0 ? allLessons[idx - 1].id : null, next: idx < allLessons.length - 1 ? allLessons[idx + 1].id : null });
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
      setCompleted(true); setShowCheckAnim(true);
      setTimeout(() => setShowCheckAnim(false), 2000);
      toast.success('Aula concluída! 🎉');

      const allLessonIds = moduleLessons.map(l => l.id);
      const { data: progress } = await supabase.from('rastreamento_progresso')
        .select('lesson_id').eq('user_id', user.id).eq('concluido', true).in('lesson_id', allLessonIds);

      if ((progress?.length || 0) >= allLessonIds.length) {
        const { data: mod } = await supabase.from('modules').select('product_id').eq('id', lesson.module_id).maybeSingle();
        if (mod) {
          const { data: allMods } = await supabase.from('modules').select('id').eq('product_id', mod.product_id);
          const { data: allProgramLessons } = await supabase.from('lessons').select('id').in('module_id', (allMods ?? []).map(m => m.id));
          const { data: allProg } = await supabase.from('rastreamento_progresso')
            .select('lesson_id').eq('user_id', user.id).eq('concluido', true).in('lesson_id', (allProgramLessons ?? []).map(l => l.id));
          if ((allProg?.length || 0) >= (allProgramLessons?.length || 0)) {
            setShowProgramComplete(true);
          } else {
            setShowModuleComplete(true);
          }
        }
      } else if (siblings.next) {
        let c = 5; setCountdown(c);
        const timer = window.setInterval(() => { c--; setCountdown(c); if (c <= 0) { clearInterval(timer); navigate(`/app/aula/${siblings.next}`); } }, 1000);
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
    return <AppLayout><div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></AppLayout>;
  }

  // Blocked screen
  if (accessChecked && !hasAccess) {
    return (
      <AppLayout>
        <AnimatedPage>
          <div className="flex h-[70vh] items-center justify-center px-4">
            <motion.div className="text-center space-y-6 max-w-md" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">{lesson.titulo}</h1>
              <p className="text-muted-foreground">Você não tem acesso a esta aula. Solicite acesso ao programa para desbloquear todo o conteúdo.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setShowRequestModal(true)} className="active:scale-[0.97] transition-transform">Solicitar acesso</Button>
                <Button asChild variant="outline" className="active:scale-[0.97] transition-transform">
                  <Link to={productSlug ? `/app/programa/${productSlug}` : '/app'}>Voltar ao programa</Link>
                </Button>
              </div>
            </motion.div>
          </div>
          <AccessRequestModal open={showRequestModal} onClose={() => setShowRequestModal(false)} programName={productName} />
        </AnimatedPage>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AnimatedPage>
        <Breadcrumb items={[
          { label: 'Início', href: '/app' },
          ...(productSlug ? [{ label: 'Programa', href: `/app/programa/${productSlug}` }] : []),
          ...(moduleName ? [{ label: moduleName }] : []),
          { label: lesson.titulo },
        ]} />

        <div className="flex flex-col lg:flex-row">
          <motion.div className="flex-1 max-w-4xl mx-auto px-4 py-6 lg:px-8 lg:py-8 pb-28 md:pb-8" variants={staggerContainer} initial="initial" animate="animate">
            {lesson.video_url && (
              <motion.div variants={fadeInUp} className="aspect-video w-full overflow-hidden rounded-xl md:rounded-2xl bg-card mb-6 md:mb-8 shadow-soft border border-border">
                {isDirectVideo(lesson.video_url) ? (
                  <video src={lesson.video_url} controls className="h-full w-full" />
                ) : (
                  <iframe src={getEmbedUrl(lesson.video_url)} className="h-full w-full" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" />
                )}
              </motion.div>
            )}

            <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 md:mb-8">
              <div>
                <h1 className="font-display text-2xl md:text-4xl font-semibold text-foreground">{lesson.titulo}</h1>
                <p className="mt-2 text-sm md:text-base text-muted-foreground">{lesson.descricao}</p>
              </div>
              {/* Desktop mark complete button */}
              <div className="hidden md:flex flex-col items-end gap-2 relative">
                <Button onClick={markComplete} disabled={completed || marking} variant={completed ? 'outline' : 'default'}
                  className={`flex-shrink-0 active:scale-[0.97] transition-transform ${completed ? 'border-primary text-primary' : ''}`}
                >
                  {marking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><CheckCircle className="mr-2 h-4 w-4" /> {completed ? 'Concluída ✓' : 'Marcar como concluída'}</>}
                </Button>
                <AnimatePresence>
                  {showCheckAnim && (
                    <motion.div className="absolute -top-8 right-0" initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1.2, y: -20 }} exit={{ opacity: 0, scale: 0, y: -40 }} transition={{ duration: 0.6 }}>
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {autoAdvanceTimer && countdown > 0 && siblings.next && (
                  <motion.span className="text-xs text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Próxima aula em {countdown}s...{' '}
                    <button onClick={() => { if (autoAdvanceTimer) clearInterval(autoAdvanceTimer); setAutoAdvanceTimer(null); }} className="text-primary underline">cancelar</button>
                  </motion.span>
                )}
              </div>
            </motion.div>

            {lesson.conteudo && (
              <motion.div variants={fadeInUp} className="prose max-w-none mb-8 md:mb-12 prose-headings:font-display prose-a:text-primary prose-headings:text-foreground text-foreground text-sm md:text-base">
                <ReactMarkdown>{lesson.conteudo}</ReactMarkdown>
              </motion.div>
            )}

            {/* Desktop navigation */}
            <motion.div variants={fadeInUp} className="hidden md:flex items-center justify-between border-t border-border pt-6">
              {siblings.prev ? <Button asChild variant="outline" className="active:scale-[0.97]"><Link to={`/app/aula/${siblings.prev}`}><ChevronLeft className="mr-2 h-4 w-4" /> Aula anterior</Link></Button> : <div />}
              {siblings.next ? <Button asChild className="active:scale-[0.97]"><Link to={`/app/aula/${siblings.next}`}>Próxima aula <ChevronRight className="ml-2 h-4 w-4" /></Link></Button> : <div />}
            </motion.div>
          </motion.div>

          <aside className="w-80 border-l border-border bg-card p-4 hidden lg:block">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Aulas do módulo</h3>
            <div className="space-y-1">
              {moduleLessons.map((l, i) => (
                <motion.div key={l.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={`/app/aula/${l.id}`}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${l.id === lesson.id ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                  >
                    <Play className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{l.titulo}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </aside>
        </div>

        {/* Mobile fixed bottom bar for lesson navigation */}
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-background/90 backdrop-blur-lg border-t border-border z-30 md:hidden">
          <div className="flex items-center gap-2">
            {siblings.prev ? (
              <Button asChild variant="outline" size="sm" className="flex-1 h-11 text-xs">
                <Link to={`/app/aula/${siblings.prev}`}><ChevronLeft className="mr-1 h-4 w-4" /> Anterior</Link>
              </Button>
            ) : <div className="flex-1" />}
            <Button
              onClick={markComplete}
              disabled={completed || marking}
              size="sm"
              className={`flex-1 h-11 text-xs font-semibold ${completed ? 'bg-accent text-accent-foreground' : 'bg-gradient-to-r from-primary to-[hsl(142_72%_37%)]'}`}
            >
              {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : completed ? '✓ Concluída' : <><CheckCircle className="mr-1 h-4 w-4" /> Concluir</>}
            </Button>
            {siblings.next ? (
              <Button asChild size="sm" className="flex-1 h-11 text-xs">
                <Link to={`/app/aula/${siblings.next}`}>Próxima <ChevronRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            ) : <div className="flex-1" />}
          </div>
        </div>

        <Dialog open={showModuleComplete} onOpenChange={setShowModuleComplete}>
          <DialogContent className="bg-card border-border text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-3xl flex items-center justify-center gap-2"><PartyPopper className="h-8 w-8 text-primary" /> Módulo concluído!</DialogTitle>
                <DialogDescription className="text-muted-foreground text-base mt-2">Parabéns! Você completou todas as aulas deste módulo. 🎉</DialogDescription>
              </DialogHeader>
              <Button onClick={() => setShowModuleComplete(false)} className="mt-4 active:scale-[0.97]">Continuar</Button>
            </motion.div>
          </DialogContent>
        </Dialog>

        <Dialog open={showProgramComplete} onOpenChange={setShowProgramComplete}>
          <DialogContent className="bg-card border-border text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 15 }}>
              <DialogHeader>
                <DialogTitle className="font-display text-3xl flex items-center justify-center gap-2"><Trophy className="h-8 w-8 text-primary" /> Programa concluído!</DialogTitle>
                <DialogDescription className="text-muted-foreground text-base mt-2">Incrível! Você completou todas as aulas do programa! 🏆</DialogDescription>
              </DialogHeader>
              <Button asChild className="mt-4 active:scale-[0.97]"><Link to="/app">Voltar ao início</Link></Button>
            </motion.div>
          </DialogContent>
        </Dialog>
      </AnimatedPage>
    </AppLayout>
  );
}
