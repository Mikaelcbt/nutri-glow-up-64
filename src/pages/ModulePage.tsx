import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, CheckCircle2, Lock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';

interface ModuleData {
  id: string; titulo: string; descricao: string; ordem: number;
  imagem_url: string | null; cor_destaque: string; product_id: string;
}
interface ProductData { id: string; nome: string; slug: string; imagem_capa_url: string; }
interface LessonItem { id: string; titulo: string; descricao: string; ordem: number; is_preview: boolean; video_url?: string; }

export default function ModulePage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [mod, setMod] = useState<ModuleData | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => { if (id && user) loadModule(); }, [id, user]);

  const loadModule = async () => {
    setLoading(true);
    try {
      const { data: modData } = await supabase.from('modules').select('*').eq('id', id).maybeSingle();
      if (!modData) { setLoading(false); return; }
      setMod(modData);

      const { data: prod } = await supabase.from('products').select('id, nome, slug, imagem_capa_url').eq('id', modData.product_id).maybeSingle();
      setProduct(prod);

      if (isAdmin) { setHasAccess(true); }
      else if (user) {
        const { data: assoc } = await supabase.from('associacoes').select('id').eq('user_id', user.id).eq('product_id', modData.product_id).eq('status', 'ativo').limit(1);
        setHasAccess((assoc?.length ?? 0) > 0);
      }

      const { data: lessonsData } = await supabase.from('lessons').select('*').eq('module_id', modData.id).order('ordem');
      setLessons(lessonsData || []);

      if (user && lessonsData?.length) {
        const lessonIds = lessonsData.map(l => l.id);
        const { data: progress } = await supabase.from('rastreamento_progresso').select('lesson_id').eq('user_id', user.id).eq('concluido', true).in('lesson_id', lessonIds);
        setCompletedSet(new Set(progress?.map(p => p.lesson_id as string) || []));
      }
    } catch (err) { console.error('[ModulePage]', err); }
    finally { setLoading(false); }
  };

  const firstIncompleteLesson = lessons.find(l => !completedSet.has(l.id));
  const heroImage = mod?.imagem_url || product?.imagem_capa_url || '/placeholder.svg';
  const completedCount = lessons.filter(l => completedSet.has(l.id)).length;
  const progressPct = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col lg:flex-row gap-6 px-4 py-6 md:px-16">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-[300px] w-full rounded-2xl shimmer" />
            <Skeleton className="h-8 w-64 shimmer" />
            <Skeleton className="h-12 w-48 shimmer" />
          </div>
          <div className="w-full lg:w-[380px] space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl shimmer" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!mod) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Módulo não encontrado.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AnimatedPage>
        <Breadcrumb items={[
          { label: 'Início', href: '/app' },
          ...(product ? [{ label: product.nome, href: `/app/programa/${product.slug}` }] : []),
          { label: mod.titulo },
        ]} />

        <div className="flex flex-col lg:flex-row gap-0">
          {/* === LEFT COLUMN: Hero + Info === */}
          <motion.div className="flex-1 px-4 py-6 lg:px-8 lg:py-8" variants={staggerContainer} initial="initial" animate="animate">
            {/* Hero Image */}
            <motion.div variants={fadeInUp} className="relative rounded-2xl overflow-hidden mb-6">
              <img src={heroImage} alt={mod.titulo} className="w-full h-[220px] md:h-[340px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <motion.span
                variants={fadeInUp}
                className="absolute top-4 left-4 inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-card"
                style={{ backgroundColor: mod.cor_destaque || 'hsl(var(--primary))' }}
              >
                Módulo {mod.ordem}
              </motion.span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-3">
              {mod.titulo}
            </motion.h1>
            {mod.descricao && (
              <motion.p variants={fadeInUp} className="text-muted-foreground mb-4 max-w-xl">{mod.descricao}</motion.p>
            )}

            {/* Progress bar */}
            <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-6">
              <Progress value={progressPct} className="h-2 flex-1 max-w-xs" />
              <span className="text-sm text-muted-foreground font-medium">{completedCount}/{lessons.length} aulas concluídas</span>
            </motion.div>

            {/* CTA Button */}
            <motion.div variants={fadeInUp}>
              {hasAccess && firstIncompleteLesson ? (
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold btn-ripple bg-gradient-to-r from-primary to-[hsl(142_72%_37%)] shadow-green-glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <Link to={`/app/aula/${firstIncompleteLesson.id}`}>
                    <Play className="mr-2 h-5 w-5" />
                    {completedCount > 0 ? 'Continuar' : 'Começar módulo'}
                  </Link>
                </Button>
              ) : hasAccess && lessons.length > 0 ? (
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold active:scale-[0.97] transition-transform">
                  <Link to={`/app/aula/${lessons[0].id}`}>
                    <CheckCircle2 className="mr-2 h-5 w-5 text-primary" /> Módulo concluído — Rever
                  </Link>
                </Button>
              ) : null}
            </motion.div>
          </motion.div>

          {/* === RIGHT COLUMN: Lesson Sidebar === */}
          <div className="w-full lg:w-[380px] lg:border-l border-border bg-secondary/30 lg:min-h-[calc(100vh-64px)]">
            <div className="p-4 lg:p-5 border-b border-border">
              <h3 className="font-display text-lg font-semibold text-foreground">{mod.titulo}</h3>
              <span className="text-sm text-muted-foreground">{lessons.length} aulas</span>
            </div>

            <div className="p-2 lg:p-3 space-y-1 overflow-y-auto lg:max-h-[calc(100vh-220px)]">
              {lessons.map((lesson, i) => {
                const completed = completedSet.has(lesson.id);
                const accessible = isAdmin || hasAccess || lesson.is_preview;
                const isCurrent = firstIncompleteLesson?.id === lesson.id;

                return (
                  <motion.div key={lesson.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    {accessible ? (
                      <Link
                        to={`/app/aula/${lesson.id}`}
                        className={`group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ${isCurrent ? 'bg-accent border border-primary/20' : 'hover:bg-accent/50'}`}
                      >
                        {/* Thumbnail with number */}
                        <div className={`relative flex h-[60px] w-[80px] flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${completed ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <span className="text-lg">{i + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">{lesson.titulo}</h4>
                          {completed && (
                            <Badge variant="secondary" className="text-[10px] mt-1 bg-primary/10 text-primary border-0 px-1.5 py-0">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Concluída
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl p-3 opacity-50 cursor-not-allowed">
                        <div className="flex h-[60px] w-[80px] flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Lock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm truncate">{lesson.titulo}</h4>
                          <span className="text-[10px] text-muted-foreground">🔒 Bloqueada</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {lessons.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma aula cadastrada.</p>
              )}
            </div>

            {/* Fixed bottom button */}
            {hasAccess && firstIncompleteLesson && (
              <div className="p-3 lg:p-4 border-t border-border">
                <Button asChild className="w-full h-11 font-semibold btn-ripple bg-gradient-to-r from-primary to-[hsl(142_72%_37%)] shadow-green-glow">
                  <Link to={`/app/aula/${firstIncompleteLesson.id}`}>
                    Próxima aula <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}
