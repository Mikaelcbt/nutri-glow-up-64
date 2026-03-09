import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { ChevronLeft, ChevronRight, Play, BookOpen, Clock, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Product {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  imagem_capa_url: string;
  texto_imagem_capa: string;
  cor_destaque: string;
  is_active: boolean;
}

interface Module {
  id: string;
  product_id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  texto_destaque_palavra: string;
  cor_destaque: string;
}

interface LessonProgress {
  id: string;
  titulo: string;
  module_id: string;
  module_titulo?: string;
  video_url: string;
  progress: number;
}

export default function AppHome() {
  const { user } = useAuth();
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [continueWatching, setContinueWatching] = useState<LessonProgress[]>([]);
  const [productProgress, setProductProgress] = useState(0);
  const [moduleStats, setModuleStats] = useState({ modules: 0, lessons: 0 });
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Get user's active associations
    const { data: associations } = await supabase
      .from('associacoes')
      .select('product_id')
      .eq('user_id', user.id)
      .eq('status', 'ativo');

    if (!associations?.length) return;

    const productIds = associations.map(a => a.product_id);

    // Get featured product (first active association)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true)
      .limit(1);

    if (products?.length) {
      setFeaturedProduct(products[0]);

      // Load modules for featured product
      const { data: mods } = await supabase
        .from('modules')
        .select('*')
        .eq('product_id', products[0].id)
        .order('ordem');
      if (mods) setModules(mods);

      // Get all lessons count for this product
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, module_id')
        .in('module_id', (mods || []).map(m => m.id));

      const totalLessons = allLessons?.length || 0;
      setModuleStats({ modules: mods?.length || 0, lessons: totalLessons });

      // Get user progress
      const { data: progress } = await supabase
        .from('rastreamento_progresso')
        .select('lesson_id, concluido')
        .eq('user_id', user.id)
        .eq('concluido', true);

      const completedLessonIds = new Set(progress?.map(p => p.lesson_id) || []);
      const completedInProduct = allLessons?.filter(l => completedLessonIds.has(l.id)).length || 0;
      setProductProgress(totalLessons > 0 ? (completedInProduct / totalLessons) * 100 : 0);
    }

    // Continue watching - lessons started but not completed
    const { data: inProgressLessons } = await supabase
      .from('rastreamento_progresso')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('concluido', false);

    if (inProgressLessons?.length) {
      const lessonIds = inProgressLessons.map(p => p.lesson_id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, titulo, module_id, video_url')
        .in('id', lessonIds)
        .limit(8);

      if (lessons) {
        setContinueWatching(lessons.map(l => ({ ...l, progress: 50 })));
      }
    }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 220;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
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

  return (
    <AppLayout>
      {/* Hero */}
      {featuredProduct ? (
        <section className="relative h-[90vh] w-full overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src={featuredProduct.imagem_capa_url || '/placeholder.svg'}
              alt={featuredProduct.texto_imagem_capa || featuredProduct.nome}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="relative flex h-full items-center px-8 md:px-16">
            <div className="max-w-xl space-y-6">
              <span className="inline-block rounded bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                Programa em destaque
              </span>
              <h1 className="font-display text-5xl leading-tight md:text-7xl">
                {featuredProduct.nome}
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                {featuredProduct.descricao}
              </p>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Layers className="h-4 w-4" /> {moduleStats.modules} módulos</span>
                <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {moduleStats.lessons} aulas</span>
              </div>

              <div className="flex gap-3">
                <Button asChild className="h-12 px-8 font-display text-lg tracking-wider">
                  <Link to={`/app/programa/${featuredProduct.slug}`}>
                    <Play className="mr-2 h-5 w-5" /> CONTINUAR ASSISTINDO
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 px-8 font-display text-lg tracking-wider border-muted-foreground/30 text-foreground hover:bg-secondary">
                  <Link to={`/app/programa/${featuredProduct.slug}`}>
                    MAIS INFORMAÇÕES
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Progress bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-8 py-4 md:px-16">
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">Seu progresso</span>
              <Progress value={productProgress} className="h-2 flex-1" />
              <span className="text-xs text-primary font-semibold">{Math.round(productProgress)}%</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex h-[60vh] items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="font-display text-4xl text-foreground">Bem-vindo ao JP NutriCare</h1>
            <p className="text-muted-foreground">Você ainda não tem programas ativos. Aguarde a liberação do acesso.</p>
          </div>
        </section>
      )}

      {/* Module Carousel */}
      {modules.length > 0 && (
        <section className="px-8 py-12 md:px-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-3xl tracking-wide">MÓDULOS</h2>
            <div className="flex gap-2">
              <button onClick={() => scrollCarousel('left')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => scrollCarousel('right')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div ref={carouselRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-4" style={{ scrollbarWidth: 'none' }}>
            {modules.map((mod, i) => (
              <Link
                key={mod.id}
                to={`/app/programa/${featuredProduct?.slug}#modulo-${mod.id}`}
                className="group relative flex-shrink-0 overflow-hidden rounded-lg transition-all duration-300 hover:-translate-y-2 hover:scale-105"
                style={{ width: 200, height: 320 }}
              >
                {/* Background */}
                <div className="absolute inset-0 bg-secondary" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                {/* Watermark */}
                <div className="absolute top-3 left-0 right-0 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-[3px] text-foreground/20">JP NUTRICARE</span>
                </div>

                {/* Badge */}
                <div className="absolute top-1/3 left-0 right-0 text-center">
                  <span
                    className="inline-block rounded px-3 py-1 text-xs font-bold uppercase tracking-wider"
                    style={{ backgroundColor: mod.cor_destaque || '#39d98a', color: '#0e0e0e' }}
                  >
                    MÓDULO {i + 1}
                  </span>
                </div>

                {/* Title */}
                <div className="absolute bottom-12 left-3 right-3">
                  <h3 className="font-display text-xl leading-tight">
                    {renderHighlightedTitle(mod.titulo, mod.texto_destaque_palavra, mod.cor_destaque || '#39d98a')}
                  </h3>
                </div>

                {/* Footer */}
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary group-hover:underline">
                    + VER MAIS INFORMAÇÕES
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section className="px-8 py-12 md:px-16">
          <h2 className="mb-6 font-display text-3xl tracking-wide">CONTINUE ASSISTINDO</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {continueWatching.map((lesson) => (
              <Link
                key={lesson.id}
                to={`/app/aula/${lesson.id}`}
                className="group relative overflow-hidden rounded-lg bg-card transition-all hover:ring-1 hover:ring-primary/50"
              >
                <div className="aspect-video bg-secondary flex items-center justify-center">
                  <Play className="h-10 w-10 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-semibold text-foreground truncate">{lesson.titulo}</h4>
                  <Progress value={lesson.progress} className="mt-2 h-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
