import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { ChevronLeft, ChevronRight, Play, BookOpen, Layers, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string; nome: string; slug: string; descricao: string;
  imagem_capa_url: string; texto_imagem_capa: string; cor_destaque: string; is_active: boolean;
}
interface Module {
  id: string; product_id: string; titulo: string; descricao: string;
  ordem: number; texto_destaque_palavra: string; cor_destaque: string;
}
interface LessonProgress {
  id: string; titulo: string; module_id: string; video_url: string; progress: number;
}

export default function AppHome() {
  const { user, profile } = useAuth();
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [continueWatching, setContinueWatching] = useState<LessonProgress[]>([]);
  const [productProgress, setProductProgress] = useState(0);
  const [moduleStats, setModuleStats] = useState({ modules: 0, lessons: 0 });
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: products } = await supabase
        .from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1);

      if (products?.length) {
        setFeaturedProduct(products[0]);
        const { data: mods } = await supabase
          .from('modules').select('*').eq('product_id', products[0].id).order('ordem');
        if (mods) setModules(mods);

        const { data: allLessons } = await supabase
          .from('lessons').select('id, module_id').in('module_id', (mods || []).map(m => m.id));
        const totalLessons = allLessons?.length || 0;
        setModuleStats({ modules: mods?.length || 0, lessons: totalLessons });

        const { data: progress } = await supabase
          .from('rastreamento_progresso').select('lesson_id, concluido')
          .eq('user_id', user.id).eq('concluido', true);
        const completedIds = new Set(progress?.map(p => p.lesson_id) || []);
        const completedInProduct = allLessons?.filter(l => completedIds.has(l.id)).length || 0;
        setProductProgress(totalLessons > 0 ? (completedInProduct / totalLessons) * 100 : 0);
      }

      const { data: inProgress } = await supabase
        .from('rastreamento_progresso').select('lesson_id')
        .eq('user_id', user.id).eq('concluido', false);
      if (inProgress?.length) {
        const { data: lessons } = await supabase
          .from('lessons').select('id, titulo, module_id, video_url')
          .in('id', inProgress.map(p => p.lesson_id)).limit(8);
        if (lessons) setContinueWatching(lessons.map(l => ({ ...l, progress: 50 })));
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally { setLoading(false); }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const renderHighlightedTitle = (titulo: string, palavra: string, cor: string) => {
    if (!palavra) return titulo;
    const parts = titulo.split(new RegExp(`(${palavra})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === palavra.toLowerCase()
        ? <span key={i} style={{ color: cor }}>{part}</span>
        : part
    );
  };

  const moduleColors = ['#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];

  if (loading) {
    return (
      <AppLayout>
        <div className="px-8 py-8 md:px-16 space-y-6">
          <Skeleton className="h-[60vh] w-full rounded-2xl" />
          <div className="flex gap-5">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 w-52 rounded-2xl flex-shrink-0" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Welcome */}
      <div className="px-8 pt-6 md:px-16">
        <h2 className="text-lg text-muted-foreground">
          Olá, <span className="text-foreground font-semibold">{profile?.nome_completo || 'Usuário'}</span>! 👋
        </h2>
      </div>

      {/* Hero */}
      {featuredProduct ? (
        <section className="relative h-[80vh] w-full overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={featuredProduct.imagem_capa_url || '/placeholder.svg'}
              alt={featuredProduct.texto_imagem_capa || featuredProduct.nome}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <div className="relative flex h-full items-center px-8 md:px-16">
            <div className="max-w-xl space-y-6">
              <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                Programa em destaque
              </span>
              <h1 className="font-display text-5xl leading-tight text-foreground md:text-7xl font-semibold">
                {featuredProduct.nome}
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                {featuredProduct.descricao}
              </p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" /> {moduleStats.modules} módulos</span>
                <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {moduleStats.lessons} aulas</span>
              </div>
              <div className="flex gap-3">
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
                  <Link to={`/app/programa/${featuredProduct.slug}`}>
                    <Play className="mr-2 h-5 w-5" /> Continuar programa
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold border-primary text-primary hover:bg-accent">
                  <Link to={`/app/programa/${featuredProduct.slug}`}>Saiba mais</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-card/80 backdrop-blur-sm px-8 py-4 md:px-16 border-t border-border">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-medium">Seu progresso</span>
              <Progress value={productProgress} className="h-2 flex-1" />
              <span className="text-xs text-primary font-bold">{Math.round(productProgress)}%</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex h-[60vh] items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent">
              <Clock className="h-8 w-8 text-accent-foreground" />
            </div>
            <h1 className="font-display text-3xl text-foreground font-semibold">Aguardando liberação de acesso</h1>
            <p className="text-muted-foreground">Seu acesso a um programa ainda não foi liberado. Entre em contato com a nutricionista para mais informações.</p>
          </div>
        </section>
      )}

      {/* Module Carousel */}
      {modules.length > 0 && (
        <section className="px-8 py-12 md:px-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-3xl font-semibold text-foreground">Módulos do Programa</h2>
            <div className="flex gap-2">
              <button onClick={() => scrollCarousel('left')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => scrollCarousel('right')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div ref={carouselRef} className="flex gap-5 overflow-x-auto scroll-smooth pb-4" style={{ scrollbarWidth: 'none' }}>
            {modules.map((mod, i) => {
              const color = mod.cor_destaque || moduleColors[i % moduleColors.length];
              return (
                <Link
                  key={mod.id}
                  to={`/app/programa/${featuredProduct?.slug}#modulo-${mod.id}`}
                  className="group relative flex-shrink-0 overflow-hidden rounded-2xl shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
                  style={{ width: 200, height: 320 }}
                >
                  <div className="absolute inset-0 bg-card" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/5 to-transparent" />

                  <div className="absolute top-4 left-0 right-0 text-center">
                    <span
                      className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-card"
                      style={{ backgroundColor: color }}
                    >
                      Módulo {i + 1}
                    </span>
                  </div>

                  <div className="absolute bottom-14 left-4 right-4">
                    <h3 className="font-display text-xl font-semibold leading-tight text-foreground">
                      {renderHighlightedTitle(mod.titulo, mod.texto_destaque_palavra, color)}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{mod.descricao}</p>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary group-hover:underline">
                      Ver mais →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section className="px-8 py-12 md:px-16">
          <h2 className="mb-6 font-display text-3xl font-semibold text-foreground">Continue de onde parou</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {continueWatching.map((lesson) => (
              <Link
                key={lesson.id}
                to={`/app/aula/${lesson.id}`}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-card transition-all duration-200 hover:shadow-soft hover:-translate-y-0.5"
              >
                <div className="aspect-video bg-secondary flex items-center justify-center">
                  <Play className="h-10 w-10 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-foreground truncate">{lesson.titulo}</h4>
                  <Progress value={lesson.progress} className="mt-3 h-1.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}