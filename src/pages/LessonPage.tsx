import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import AccessRequestModal from '@/components/AccessRequestModal';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, Play, Trophy, PartyPopper, Lock, List } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';
import { useIsMobile } from '@/hooks/use-mobile';

interface LessonData {
  id: string; titulo: string; descricao: string; conteudo: string;
  video_url: string; ordem: number; module_id: string; is_preview: boolean;
}
interface SiblingLesson { id: string; titulo: string; ordem: number; }

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [completed, setCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  const [siblings, setSiblings] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });
  const [moduleLessons, setModuleLessons] = useState<SiblingLesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [moduleName, setModuleName] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [productSlug, setProductSlug] = useState('');
  const [productName, setProductName] = useState('');
  const [nextModuleId, setNextModuleId] = useState<string | null>(null);
  const [showModuleComplete, setShowModuleComplete] = useState(false);
  const [showProgramComplete, setShowProgramComplete] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [showCheckAnim, setShowCheckAnim] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

      const { data: mod } = await supabase.from('modules').select('id, titulo, product_id, ordem').eq('id', data.module_id).maybeSingle();
      if (mod) {
        setModuleName(mod.titulo);
        setModuleId(mod.id);
        const { data: prod } = await supabase.from('products').select('slug, nome').eq('id', mod.product_id).maybeSingle();
        if (prod) { setProductSlug(prod.slug); setProductName(prod.nome); }

        // Next module
        const { data: nextMod } = await supabase.from('modules').select('id').eq('product_id', mod.product_id).gt('ordem', mod.ordem).order('ordem').limit(1);
        setNextModuleId(nextMod?.[0]?.id || null);

        if (isAdmin || data.is_preview) { setHasAccess(true); }
        else if (user) {
          const { data: assoc } = await supabase.from('associacoes').select('id').eq('user_id', user.id).eq('product_id', mod.product_id).eq('status', 'ativo').limit(1);
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

      // Fetch completed lessons for sidebar
      if (user && allLessons?.length) {
        const ids = allLessons.map(l => l.id);
        const { data: prog } = await supabase.from('rastreamento_progresso').select('lesson_id').eq('user_id', user.id).eq('concluido', true).in('lesson_id', ids);
        setCompletedLessons(new Set(prog?.map(p => p.lesson_id as string) || []));
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
      setCompletedLessons(prev => new Set(prev).add(lesson.id));
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

  const completedCountInModule = moduleLessons.filter(l => completedLessons.has(l.id)).length;
  const moduleProgressPct = moduleLessons.length > 0 ? (completedCountInModule / moduleLessons.length) * 100 : 0;

  if (!lesson) {
    return <AppLayout><div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></AppLayout>;
  }

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

  // Sidebar content (shared between desktop aside and mobile accordion)
  const lessonSidebarList = (
    <div className="space-y-1">
      {moduleLessons.map((l, i) => {
        const isCompleted = completedLessons.has(l.id);
        const isCurrent = l.id === lesson.id;
        return (
          <Link
            key={l.id}
            to={`/app/aula/${l.id}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${isCurrent ? 'bg-accent text-accent-foreground font-medium border border-primary/20' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
          >
            <div className={`relative flex h-[48px] w-[64px] flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isCompleted ? 'bg-primary/20' : 'bg-muted'}`}>
              {isCompleted ? <CheckCircle className="h-4 w-4 text-primary" /> : <span>{i + 1}</span>}
            </div>
            <span className="truncate flex-1">{l.titulo}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <AppLayout>
      <AnimatedPage>
        <Breadcrumb items={[
          { label: 'Início', href: '/app' },
          ...(productSlug ? [{ label: productName || 'Programa', href: `/app/programa/${productSlug}` }] : []),
          ...(moduleName ? [{ label: moduleName, href: `/app/modulo/${moduleId}` }] : []),
          { label: lesson.titulo },
        ]} />

        <div className="flex flex-col lg:flex-row">
          {/* === MAIN COLUMN === */}
          <motion.div className="flex-1 px-4 py-6 lg:px-8 lg:py-8 pb-28 md:pb-8" variants={staggerContainer} initial="initial" animate="animate">
            {/* Video Player */}
            {lesson.video_url && (
              <motion.div variants={fadeInUp} className="relative w-full overflow-hidden rounded-xl md:rounded-2xl bg-card mb-6 shadow-soft border border-border">
                {/* Progress bar on top */}
                <Progress value={moduleProgressPct} className="h-1 rounded-none" />
                <div className="aspect-video">
                  {isDirectVideo(lesson.video_url) ? (
                    <video src={lesson.video_url} controls className="h-full w-full" />
                  ) : (
                    <iframe src={getEmbedUrl(lesson.video_url)} className="h-full w-full" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" />
                  )}
                </div>
              </motion.div>
            )}

            {/* Navigation buttons row */}
            <motion.div variants={fadeInUp} className="hidden md:flex items-center gap-3 mb-6">
              {siblings.prev ? (
                <Button asChild variant="secondary" className="active:scale-[0.97] transition-transform">
                  <Link to={`/app/aula/${siblings.prev}`}><ChevronLeft className="mr-1 h-4 w-4" /> Anterior</Link>
                </Button>
              ) : <div />}

              <div className="relative">
                <Button onClick={markComplete} disabled={completed || marking}
                  className={`active:scale-[0.97] transition-transform ${completed ? 'bg-primary text-primary-foreground' : 'btn-ripple bg-gradient-to-r from-primary to-[hsl(142_72%_37%)]'}`}
                >
                  {marking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><CheckCircle className="mr-2 h-4 w-4" /> {completed ? 'Concluída ✓' : 'Marcar concluída'}</>}
                </Button>
                <AnimatePresence>
                  {showCheckAnim && (
                    <motion.div className="absolute -top-8 left-1/2 -translate-x-1/2" initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1.2, y: -20 }} exit={{ opacity: 0, scale: 0, y: -40 }} transition={{ duration: 0.6 }}>
                      <CheckCircle className="h-8 w-8 text-primary" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {siblings.next ? (
                <Button asChild variant="secondary" className="active:scale-[0.97] transition-transform">
                  <Link to={`/app/aula/${siblings.next}`}>Próxima <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              ) : <div />}

              {autoAdvanceTimer && countdown > 0 && siblings.next && (
                <motion.span className="text-xs text-muted-foreground ml-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Próxima em {countdown}s...{' '}
                  <button onClick={() => { if (autoAdvanceTimer) clearInterval(autoAdvanceTimer); setAutoAdvanceTimer(null); }} className="text-primary underline">cancelar</button>
                </motion.span>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1 variants={fadeInUp} className="font-display text-2xl md:text-4xl font-semibold text-foreground mb-2">{lesson.titulo}</motion.h1>
            {lesson.descricao && <motion.p variants={fadeInUp} className="text-muted-foreground mb-6">{lesson.descricao}</motion.p>}

            {/* Markdown content */}
            {lesson.conteudo && (
              <motion.div variants={fadeInUp} className="prose max-w-none mb-8 prose-headings:font-display prose-a:text-primary prose-headings:text-foreground text-foreground text-sm md:text-base">
                <ReactMarkdown>{lesson.conteudo}</ReactMarkdown>
              </motion.div>
            )}

            {/* Mobile: Accordion lesson list */}
            {isMobile && (
              <Collapsible open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full mb-4 justify-between">
                    <span className="flex items-center gap-2"><List className="h-4 w-4" /> Aulas do módulo ({completedCountInModule}/{moduleLessons.length})</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen ? 'rotate-90' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mb-6">
                  {lessonSidebarList}
                </CollapsibleContent>
              </Collapsible>
            )}
          </motion.div>

          {/* === RIGHT SIDEBAR (desktop only) === */}
          <aside className="w-[320px] border-l border-border bg-secondary/30 hidden lg:flex lg:flex-col lg:min-h-[calc(100vh-64px)]">
            <div className="p-4 border-b border-border">
              <h3 className="font-display text-base font-semibold text-foreground truncate">{moduleName}</h3>
              <span className="text-xs text-muted-foreground">{moduleLessons.length} aulas • {completedCountInModule} concluídas</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {moduleLessons.map((l, i) => {
                const isCompleted = completedLessons.has(l.id);
                const isCurrent = l.id === lesson.id;
                return (
                  <motion.div key={l.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Link
                      to={`/app/aula/${l.id}`}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${isCurrent ? 'bg-accent text-accent-foreground font-medium border border-primary/20' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
                    >
                      <div className={`relative flex h-[44px] w-[58px] flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isCompleted ? 'bg-primary/20' : 'bg-muted'}`}>
                        {isCompleted ? <CheckCircle className="h-4 w-4 text-primary" /> : <span>{i + 1}</span>}
                      </div>
                      <span className="truncate flex-1 text-xs">{l.titulo}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom button */}
            {nextModuleId && (
              <div className="p-3 border-t border-border">
                <Button asChild className="w-full h-11 font-semibold btn-ripple bg-gradient-to-r from-primary to-[hsl(142_72%_37%)] shadow-green-glow">
                  <Link to={`/app/modulo/${nextModuleId}`}>
                    Próximo módulo <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </aside>
        </div>

        {/* Mobile fixed bottom bar */}
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-background/90 backdrop-blur-lg border-t border-border z-30 md:hidden">
          <div className="flex items-center gap-2">
            {siblings.prev ? (
              <Button asChild variant="secondary" size="sm" className="flex-1 h-11 text-xs">
                <Link to={`/app/aula/${siblings.prev}`}><ChevronLeft className="mr-1 h-4 w-4" /> Anterior</Link>
              </Button>
            ) : <div className="flex-1" />}
            <Button
              onClick={markComplete}
              disabled={completed || marking}
              size="sm"
              className={`flex-1 h-11 text-xs font-semibold ${completed ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-r from-primary to-[hsl(142_72%_37%)]'}`}
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
