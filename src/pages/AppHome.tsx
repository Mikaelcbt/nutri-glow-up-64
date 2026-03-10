import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import AccessRequestModal from '@/components/AccessRequestModal';
import { ChevronLeft, ChevronRight, Play, BookOpen, Layers, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { AnimatedPage, staggerContainer, fadeInUp, fadeInRight } from '@/components/AnimatedPage';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';

interface Product {
  id: string; nome: string; slug: string; descricao: string;
  imagem_capa_url: string; texto_imagem_capa: string; cor_destaque: string; is_active: boolean;
}
interface Module {
  id: string; product_id: string; titulo: string; descricao: string;
  ordem: number; texto_destaque_palavra: string; cor_destaque: string;
}

export default function AppHome() {
  const { user, profile } = useAuth();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [featuredHasAccess, setFeaturedHasAccess] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [productProgress, setProductProgress] = useState(0);
  const [moduleStats, setModuleStats] = useState({ modules: 0, lessons: 0 });
  const [loading, setLoading] = useState(true);
  const [requestModal, setRequestModal] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isAdmin = profile?.role === 'admin';

  const animatedModules = useAnimatedNumber(moduleStats.modules);
  const animatedLessons = useAnimatedNumber(moduleStats.lessons);

  useEffect(() => { if (user) { console.log('[AppHome] user ready, loading data...', user.id); loadData(); } }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // All active products — visible to all authenticated users
      const { data: products, error: prodErr } = await supabase
        .from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });

      console.log('[AppHome] products query:', { products, error: prodErr, userId: user.id });

      if (prodErr) {
        console.error('[AppHome] Erro ao buscar produtos:', prodErr);
        setAllProducts([]);
        setLoading(false);
        return;
      }

      if (!products?.length) { setAllProducts([]); setLoading(false); return; }
      setAllProducts(products);

      // User associations
      const { data: assocs, error: assocErr } = await supabase
        .from('associacoes').select('product_id, status')
        .eq('user_id', user.id).eq('status', 'ativo');

      if (assocErr) console.error('[AppHome] Erro ao buscar associações:', assocErr);
      console.log('[AppHome] associations:', { assocs });

      const map: Record<string, boolean> = {};
      (assocs ?? []).forEach(a => { map[a.product_id] = true; });
      setAccessMap(map);

      // Featured: first product with access, or first product overall
      const withAccess = products.filter(p => map[p.id] || isAdmin);
      const featured = withAccess[0] || products[0];
      const hasAccess = isAdmin || !!map[featured.id];
      setFeaturedProduct(featured);
      setFeaturedHasAccess(hasAccess);

      // Modules & stats for featured
      const { data: mods } = await supabase
        .from('modules').select('*').eq('product_id', featured.id).order('ordem');
      if (mods) setModules(mods);

      const { data: allLessons } = await supabase
        .from('lessons').select('id, module_id').in('module_id', (mods || []).map(m => m.id));
      const totalLessons = allLessons?.length || 0;
      setModuleStats({ modules: mods?.length || 0, lessons: totalLessons });

      // Progress
      if (hasAccess && totalLessons > 0) {
        const { data: progress } = await supabase
          .from('rastreamento_progresso').select('lesson_id')
          .eq('user_id', user.id).eq('concluido', true);
        const completedIds = new Set(progress?.map(p => p.lesson_id) || []);
        const done = allLessons?.filter(l => completedIds.has(l.id)).length || 0;
        setProductProgress((done / totalLessons) * 100);
      } else {
        setProductProgress(0);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const scrollCarousel = (d: 'left' | 'right') => {
    carouselRef.current?.scrollBy({ left: d === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const renderHighlightedTitle = (titulo: string, palavra: string, cor: string) => {
    if (!palavra) return titulo;
    const parts = titulo.split(new RegExp(`(${palavra})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === palavra.toLowerCase() ? <span key={i} style={{ color: cor }}>{part}</span> : part
    );
  };

  const moduleColors = ['#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];

  if (loading) {
    return (
      <AppLayout>
        <div className="px-8 py-8 md:px-16 space-y-6">
          <Skeleton className="h-[60vh] w-full rounded-2xl shimmer" />
          <div className="flex gap-5">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-80 w-52 rounded-2xl flex-shrink-0 shimmer" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AnimatedPage>
        <motion.div className="px-8 pt-6 md:px-16" variants={fadeInUp}>
          <h2 className="text-lg text-muted-foreground">
            Olá, <span className="text-foreground font-semibold">{profile?.nome_completo || 'Usuário'}</span>! 👋
          </h2>
        </motion.div>

        {/* Hero */}
        {featuredProduct ? (
          <section className="relative h-[80vh] w-full overflow-hidden">
            <motion.div className="absolute inset-0" initial={{ scale: 1.05, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }}>
              <img src={featuredProduct.imagem_capa_url || '/placeholder.svg'} alt={featuredProduct.nome} className="h-full w-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </motion.div>

            <div className="relative flex h-full items-center px-8 md:px-16">
              <motion.div className="max-w-xl space-y-6" variants={staggerContainer} initial="initial" animate="animate">
                <motion.span variants={fadeInUp} className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                  {featuredHasAccess ? 'Programa em destaque' : 'Programa disponível'}
                </motion.span>
                <motion.h1 variants={fadeInUp} className="font-display text-5xl leading-tight text-foreground md:text-7xl font-semibold">{featuredProduct.nome}</motion.h1>
                <motion.p variants={fadeInUp} className="text-base leading-relaxed text-muted-foreground md:text-lg">{featuredProduct.descricao}</motion.p>
                <motion.div variants={fadeInUp} className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" /> {animatedModules} módulos</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {animatedLessons} aulas</span>
                </motion.div>
                <motion.div variants={fadeInUp} className="flex gap-3">
                  {featuredHasAccess ? (
                    <>
                      <Button asChild size="lg" className="h-12 px-8 text-base font-semibold active:scale-[0.97] transition-transform">
                        <Link to={`/app/programa/${featuredProduct.slug}`}><Play className="mr-2 h-5 w-5" /> Continuar programa</Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold border-primary text-primary hover:bg-accent active:scale-[0.97] transition-transform">
                        <Link to={`/app/programa/${featuredProduct.slug}`}>Saiba mais</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="lg" onClick={() => setRequestModal(featuredProduct.nome)} className="h-12 px-8 text-base font-semibold active:scale-[0.97] transition-transform">
                        Solicitar acesso
                      </Button>
                      <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold active:scale-[0.97] transition-transform">
                        <Link to={`/app/programa/${featuredProduct.slug}`}>Ver detalhes</Link>
                      </Button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            </div>

            {featuredHasAccess && (
              <motion.div className="absolute bottom-0 left-0 right-0 bg-card/80 backdrop-blur-sm px-8 py-4 md:px-16 border-t border-border" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground font-medium">Seu progresso</span>
                  <Progress value={productProgress} className="h-2 flex-1" />
                  <span className="text-xs text-primary font-bold">{Math.round(productProgress)}%</span>
                </div>
              </motion.div>
            )}

            {!featuredHasAccess && (
              <motion.div className="absolute bottom-0 left-0 right-0 bg-card/80 backdrop-blur-sm px-8 py-4 md:px-16 border-t border-border" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span className="text-xs font-medium">Sem acesso — solicite para começar sua jornada</span>
                </div>
              </motion.div>
            )}
          </section>
        ) : (
          <section className="flex h-[60vh] items-center justify-center px-4">
            <motion.div className="text-center space-y-4 max-w-md" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent">
                <Clock className="h-8 w-8 text-accent-foreground" />
              </div>
              <h1 className="font-display text-3xl text-foreground font-semibold">Nenhum programa disponível</h1>
              <p className="text-muted-foreground">Ainda não há programas cadastrados. Em breve novos conteúdos estarão disponíveis!</p>
            </motion.div>
          </section>
        )}

        {/* All Programs Grid */}
        {allProducts.length > 1 && (
          <motion.section className="px-8 py-12 md:px-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="mb-6 font-display text-3xl font-semibold text-foreground">Todos os Programas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProducts.map((p, i) => {
                const hasAccess = isAdmin || !!accessMap[p.id];
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="group rounded-2xl border border-border bg-card overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden">
                      {p.imagem_capa_url ? (
                        <img src={p.imagem_capa_url} alt={p.nome} className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-44 w-full bg-accent flex items-center justify-center"><BookOpen className="h-10 w-10 text-accent-foreground/40" /></div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${hasAccess ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {hasAccess ? '✓ Acesso ativo' : 'Sem acesso'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <h3 className="font-display text-xl font-semibold text-foreground">{p.nome}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao}</p>
                      {hasAccess ? (
                        <Button asChild size="sm" className="w-full active:scale-[0.97] transition-transform">
                          <Link to={`/app/programa/${p.slug}`}><Play className="mr-2 h-4 w-4" /> Continuar</Link>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full active:scale-[0.97] transition-transform" onClick={() => setRequestModal(p.nome)}>
                          Solicitar acesso
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Module Carousel */}
        {modules.length > 0 && (
          <motion.section className="px-8 py-12 md:px-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-3xl font-semibold text-foreground">Módulos do Programa</h2>
              <div className="flex gap-2">
                <button onClick={() => scrollCarousel('left')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-all"><ChevronLeft className="h-5 w-5" /></button>
                <button onClick={() => scrollCarousel('right')} className="rounded-full border border-border p-2 text-foreground hover:bg-secondary transition-all"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
            <div ref={carouselRef} className="flex gap-5 overflow-x-auto scroll-smooth pb-4" style={{ scrollbarWidth: 'none' }}>
              {modules.map((mod, i) => {
                const color = mod.cor_destaque || moduleColors[i % moduleColors.length];
                return (
                  <motion.div key={mod.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                    <Link to={`/app/programa/${featuredProduct?.slug}#modulo-${mod.id}`}
                      className="group relative flex-shrink-0 overflow-hidden rounded-2xl shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-soft block"
                      style={{ width: 200, height: 320 }}
                    >
                      <div className="absolute inset-0 bg-card" />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/5 to-transparent" />
                      <div className="absolute top-4 left-0 right-0 text-center">
                        <span className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-card" style={{ backgroundColor: color }}>
                          Módulo {i + 1}
                        </span>
                      </div>
                      <div className="absolute bottom-14 left-4 right-4">
                        <h3 className="font-display text-xl font-semibold leading-tight text-foreground">
                          {renderHighlightedTitle(mod.titulo, mod.texto_destaque_palavra, color)}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{mod.descricao}</p>
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary group-hover:underline">Ver mais →</span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        <AccessRequestModal open={!!requestModal} onClose={() => setRequestModal(null)} programName={requestModal || undefined} />
      </AnimatedPage>
    </AppLayout>
  );
}
