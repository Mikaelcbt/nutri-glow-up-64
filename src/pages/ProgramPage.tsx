import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import AccessRequestModal from '@/components/AccessRequestModal';
import Breadcrumb from '@/components/Breadcrumb';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronRight, Play, CheckCircle2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';

interface Product { id: string; nome: string; slug: string; descricao: string; imagem_capa_url: string; cor_destaque: string; }
interface Module { id: string; titulo: string; descricao: string; ordem: number; texto_destaque_palavra: string; cor_destaque: string; imagem_url?: string; }
interface Lesson { id: string; titulo: string; descricao: string; ordem: number; is_preview: boolean; }

export default function ProgramPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [moduleLessons, setModuleLessons] = useState<Record<string, Lesson[]>>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => { if (slug) loadProduct(); }, [slug, user]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const { data: prod } = await supabase.from('products').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
      if (!prod) { setLoading(false); return; }
      setProduct(prod);

      // Check access
      if (isAdmin) {
        setHasAccess(true);
      } else if (user) {
        const { data: assoc } = await supabase
          .from('associacoes').select('id').eq('user_id', user.id).eq('product_id', prod.id).eq('status', 'ativo').limit(1);
        setHasAccess((assoc?.length ?? 0) > 0);
      }

      const { data: mods } = await supabase.from('modules').select('*').eq('product_id', prod.id).order('ordem');
      if (mods) {
        setModules(mods);
        const modIds = mods.map(m => m.id);
        const { data: allLessons } = await supabase.from('lessons').select('id, module_id').in('module_id', modIds);
        if (user && allLessons) {
          const { data: progress } = await supabase.from('rastreamento_progresso').select('lesson_id').eq('user_id', user.id).eq('concluido', true);
          const completed = new Set<string>(progress?.map(p => p.lesson_id as string) || []);
          setCompletedLessons(completed);
          const total = allLessons.length;
          const done = allLessons.filter(l => completed.has(l.id)).length;
          setOverallProgress(total > 0 ? (done / total) * 100 : 0);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleModule = async (moduleId: string) => {
    if (expandedModule === moduleId) { setExpandedModule(null); return; }
    setExpandedModule(moduleId);
    if (!moduleLessons[moduleId]) {
      const { data: lessons } = await supabase.from('lessons').select('*').eq('module_id', moduleId).order('ordem');
      if (lessons) setModuleLessons(prev => ({ ...prev, [moduleId]: lessons }));
    }
  };

  const canAccessLesson = (lesson: Lesson) => isAdmin || hasAccess || lesson.is_preview;

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 px-8 py-8 md:px-16">
          <Skeleton className="h-[350px] w-full rounded-2xl shimmer" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl shimmer" />)}
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Programa não encontrado.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AnimatedPage>
        <Breadcrumb items={[{ label: 'Início', href: '/app' }, { label: product.nome }]} />

        {/* Header */}
        <section className="relative overflow-hidden" style={{ height: 350 }}>
          <motion.img src={product.imagem_capa_url || '/placeholder.svg'} alt={product.nome} className="h-full w-full object-cover" initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <motion.div className="absolute bottom-8 left-8 md:left-16 space-y-4" variants={staggerContainer} initial="initial" animate="animate">
            <motion.h1 variants={fadeInUp} className="font-display text-5xl md:text-6xl font-semibold text-foreground">{product.nome}</motion.h1>
            <motion.p variants={fadeInUp} className="max-w-xl text-muted-foreground">{product.descricao}</motion.p>
            {hasAccess ? (
              <motion.div variants={fadeInUp} className="flex items-center gap-4 max-w-md">
                <Progress value={overallProgress} className="h-2 flex-1" />
                <span className="text-sm text-primary font-bold">{Math.round(overallProgress)}%</span>
              </motion.div>
            ) : (
              <motion.div variants={fadeInUp} className="flex items-center gap-3">
                <Button onClick={() => setShowRequestModal(true)} className="active:scale-[0.97] transition-transform">
                  Solicitar acesso
                </Button>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Acesso restrito</span>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* Modules */}
        <section className="px-8 py-12 md:px-16">
          <motion.h2 variants={fadeInUp} initial="initial" animate="animate" className="mb-8 font-display text-3xl font-semibold text-foreground">Módulos</motion.h2>
          <div className="space-y-4">
            {modules.map((mod, i) => {
              const moduleAccessible = hasAccess || isAdmin;
              return (
                <motion.div key={mod.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-all duration-300 hover:shadow-soft"
                >
                  <button onClick={() => toggleModule(mod.id)} className="flex w-full items-center justify-between p-5 text-left hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-card" style={{ backgroundColor: mod.cor_destaque || '#22C55E' }}>
                        {moduleAccessible ? i + 1 : <Lock className="h-4 w-4" />}
                      </span>
                      <div>
                        <h3 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                          {mod.titulo}
                          {!moduleAccessible && <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">🔒 Bloqueado</span>}
                        </h3>
                        <p className="text-sm text-muted-foreground">{mod.descricao}</p>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: expandedModule === mod.id ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedModule === mod.id && moduleLessons[mod.id] && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="border-t border-border p-5 bg-secondary/30">
                          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                            {moduleLessons[mod.id].map((lesson, li) => {
                              const accessible = canAccessLesson(lesson);
                              return (
                                <motion.div key={lesson.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: li * 0.05 }}>
                                  {accessible ? (
                                    <Link to={`/app/aula/${lesson.id}`}
                                      className="group flex-shrink-0 w-56 rounded-xl bg-card border border-border overflow-hidden hover:shadow-soft hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 block"
                                    >
                                      <div className="aspect-video bg-secondary flex items-center justify-center relative">
                                        <Play className="h-8 w-8 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
                                        {completedLessons.has(lesson.id) && (
                                          <div className="absolute top-2 right-2"><CheckCircle2 className="h-5 w-5 text-primary" /></div>
                                        )}
                                        {lesson.is_preview && !hasAccess && (
                                          <div className="absolute top-2 left-2"><span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-semibold">Preview</span></div>
                                        )}
                                      </div>
                                      <div className="p-3">
                                        <h4 className="text-sm font-semibold truncate text-foreground">{lesson.titulo}</h4>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lesson.descricao}</p>
                                      </div>
                                    </Link>
                                  ) : (
                                    <div className="flex-shrink-0 w-56 rounded-xl bg-card border border-border overflow-hidden opacity-60 cursor-not-allowed">
                                      <div className="aspect-video bg-secondary flex items-center justify-center">
                                        <Lock className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                      <div className="p-3">
                                        <h4 className="text-sm font-semibold truncate text-foreground">{lesson.titulo}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">🔒 Acesso restrito</p>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        <AccessRequestModal open={showRequestModal} onClose={() => setShowRequestModal(false)} programName={product.nome} />
      </AnimatedPage>
    </AppLayout>
  );
}
