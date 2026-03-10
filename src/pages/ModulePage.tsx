import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, CheckCircle2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';

interface ModuleData {
  id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  imagem_url: string | null;
  cor_destaque: string;
  product_id: string;
}

interface ProductData {
  id: string;
  nome: string;
  slug: string;
  imagem_capa_url: string;
}

interface LessonItem {
  id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  is_preview: boolean;
}

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

  useEffect(() => {
    if (id && user) loadModule();
  }, [id, user]);

  const loadModule = async () => {
    setLoading(true);
    try {
      const { data: modData } = await supabase
        .from('modules').select('*').eq('id', id).maybeSingle();
      if (!modData) { setLoading(false); return; }
      setMod(modData);

      // Fetch product
      const { data: prod } = await supabase
        .from('products').select('id, nome, slug, imagem_capa_url').eq('id', modData.product_id).maybeSingle();
      setProduct(prod);

      // Check access
      if (isAdmin) {
        setHasAccess(true);
      } else if (user) {
        const { data: assoc } = await supabase
          .from('associacoes').select('id').eq('user_id', user.id).eq('product_id', modData.product_id).eq('status', 'ativo').limit(1);
        setHasAccess((assoc?.length ?? 0) > 0);
      }

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons').select('*').eq('module_id', modData.id).order('ordem');
      setLessons(lessonsData || []);

      // Fetch progress
      if (user && lessonsData?.length) {
        const lessonIds = lessonsData.map(l => l.id);
        const { data: progress } = await supabase
          .from('rastreamento_progresso').select('lesson_id').eq('user_id', user.id).eq('concluido', true).in('lesson_id', lessonIds);
        setCompletedSet(new Set(progress?.map(p => p.lesson_id as string) || []));
      }
    } catch (err) {
      console.error('[ModulePage]', err);
    } finally {
      setLoading(false);
    }
  };

  const firstIncompleteLesson = lessons.find(l => !completedSet.has(l.id));
  const heroImage = mod?.imagem_url || product?.imagem_capa_url || '/placeholder.svg';
  const completedCount = lessons.filter(l => completedSet.has(l.id)).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 px-8 py-8 md:px-16">
          <Skeleton className="h-[300px] w-full rounded-2xl" />
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
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

        {/* Hero */}
        <section className="relative h-[300px] md:h-[360px] w-full overflow-hidden">
          <motion.img
            src={heroImage}
            alt={mod.titulo}
            className="h-full w-full object-cover"
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <motion.div
            className="absolute bottom-8 left-8 md:left-16 right-8 space-y-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-card"
              style={{ backgroundColor: mod.cor_destaque || 'hsl(var(--primary))' }}
            >
              Módulo {mod.ordem}
            </motion.span>
            <motion.h1 variants={fadeInUp} className="font-display text-4xl md:text-5xl font-semibold text-foreground">
              {mod.titulo}
            </motion.h1>
            {mod.descricao && (
              <motion.p variants={fadeInUp} className="max-w-xl text-muted-foreground">
                {mod.descricao}
              </motion.p>
            )}
            <motion.div variants={fadeInUp} className="flex items-center gap-4">
              {hasAccess && firstIncompleteLesson ? (
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold active:scale-[0.97] transition-transform">
                  <Link to={`/app/aula/${firstIncompleteLesson.id}`}>
                    <Play className="mr-2 h-5 w-5" />
                    {completedCount > 0 ? 'Continuar assistindo' : 'Começar módulo'}
                  </Link>
                </Button>
              ) : hasAccess && lessons.length > 0 ? (
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold active:scale-[0.97] transition-transform">
                  <Link to={`/app/aula/${lessons[0].id}`}>
                    <CheckCircle2 className="mr-2 h-5 w-5 text-primary" /> Módulo concluído — Rever
                  </Link>
                </Button>
              ) : null}
              <span className="text-sm text-muted-foreground">
                {completedCount}/{lessons.length} aulas concluídas
              </span>
            </motion.div>
          </motion.div>
        </section>

        {/* Lesson Playlist */}
        <section className="px-8 py-10 md:px-16">
          <h2 className="mb-6 font-display text-2xl font-semibold text-foreground">Aulas</h2>
          <div className="space-y-3">
            {lessons.map((lesson, i) => {
              const completed = completedSet.has(lesson.id);
              const accessible = isAdmin || hasAccess || lesson.is_preview;

              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {accessible ? (
                    <Link
                      to={`/app/aula/${lesson.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-soft hover:border-primary/30 transition-all duration-200"
                    >
                      {/* Thumbnail with number */}
                      <div
                        className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg text-lg font-bold text-card"
                        style={{ backgroundColor: mod.cor_destaque || 'hsl(var(--primary))' }}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {lesson.titulo}
                        </h3>
                        {lesson.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{lesson.descricao}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {completed && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                            Concluído
                          </Badge>
                        )}
                        {lesson.is_preview && !hasAccess && (
                          <Badge variant="outline" className="text-xs">Preview</Badge>
                        )}
                        <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 opacity-50 cursor-not-allowed">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{lesson.titulo}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">🔒 Acesso restrito</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            {lessons.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhuma aula cadastrada neste módulo.</p>
            )}
          </div>
        </section>
      </AnimatedPage>
    </AppLayout>
  );
}
