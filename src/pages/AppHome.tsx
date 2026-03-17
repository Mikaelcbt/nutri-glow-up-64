import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import AccessRequestModal from '@/components/AccessRequestModal';
import { ChevronLeft, ChevronRight, Play, BookOpen, Layers, Clock, Lock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AnimatedPage, staggerContainer, fadeInUp } from '@/components/AnimatedPage';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import HabitsChecklist from '@/components/HabitsChecklist';
import WaterReminderBanner from '@/components/WaterReminderBanner';

interface Product {
  id: string; nome: string; slug: string; descricao: string;
  imagem_capa_url: string; texto_imagem_capa: string; cor_destaque: string; is_active: boolean;
  modules?: { id: string; titulo: string; descricao: string; ordem: number; texto_destaque_palavra: string; cor_destaque: string; lessons: { id: string }[] }[];
}

// Floating particles component
function FloatingParticles() {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${10 + Math.random() * 80}%`,
    top: `${10 + Math.random() * 80}%`,
    delay: `${Math.random() * 4}s`,
    size: 3 + Math.random() * 4,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{ left: p.left, top: p.top, animationDelay: p.delay, width: p.size, height: p.size }}
        />
      ))}
    </div>
  );
}

export default function AppHome() {
  const { user, profile } = useAuth();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [featuredHasAccess, setFeaturedHasAccess] = useState(false);
  const [productProgress, setProductProgress] = useState(0);
  const [moduleStats, setModuleStats] = useState({ modules: 0, lessons: 0 });
  const [loading, setLoading] = useState(true);
  const [requestModal, setRequestModal] = useState<string | null>(null);
  const myProgsRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const isAdmin = profile?.role === 'admin';

  const animatedModules = useAnimatedNumber(moduleStats.modules);
  const animatedLessons = useAnimatedNumber(moduleStats.lessons);

  const { scrollY } = useScroll();
  const heroImageY = useTransform(scrollY, [0, 600], [0, 150]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res1 = await supabase
        .from('products')
        .select('*, modules(*, lessons(id))')
        .eq('is_active', true);

      let products: any[] | null = null;
      if (res1.error) {
        const res2 = await supabase.from('products').select('*').eq('is_active', true);
        products = res2.data;
      } else {
        products = res1.data;
      }

      if (!products?.length) {
        setAllProducts([]);
        setLoading(false);
        return;
      }

      setAllProducts(products);

      const { data: assocs } = await supabase
        .from('associacoes').select('product_id, status')
        .eq('user_id', user.id).eq('status', 'ativo');

      const map: Record<string, boolean> = {};
      (assocs ?? []).forEach(a => { map[a.product_id] = true; });
      setAccessMap(map);

      // Compute progress for each product user has access to
      const progMap: Record<string, number> = {};
      const accessibleProducts = products.filter(p => map[p.id] || isAdmin);
      for (const p of accessibleProducts) {
        const mods = p.modules || [];
        const totalLessons = mods.reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0);
        if (totalLessons > 0) {
          const allLessonIds = mods.flatMap((m: any) => (m.lessons || []).map((l: any) => l.id));
          const { data: progress } = await supabase
            .from('rastreamento_progresso').select('lesson_id')
            .eq('user_id', user.id).eq('concluido', true).in('lesson_id', allLessonIds);
          progMap[p.id] = ((progress?.length || 0) / totalLessons) * 100;
        } else {
          progMap[p.id] = 0;
        }
      }
      setProgressMap(progMap);

      // Featured product
      const withAccess = accessibleProducts;
      const featured = withAccess[0] || products[0];
      const hasAccess = isAdmin || !!map[featured.id];
      setFeaturedProduct(featured);
      setFeaturedHasAccess(hasAccess);
      setProductProgress(progMap[featured.id] || 0);

      const featuredModules = featured.modules || [];
      const totalLessons = featuredModules.reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0);
      setModuleStats({ modules: featuredModules.length, lessons: totalLessons });

    } catch (err) {
      console.error('[AppHome] Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollMyProgs = (d: 'left' | 'right') => {
    myProgsRef.current?.scrollBy({ left: d === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const myPrograms = allProducts.filter(p => isAdmin || accessMap[p.id]);
  const WHATSAPP_URL = 'https://wa.me/5500000000000?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20programa';

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 md:px-16 space-y-6">
          <Skeleton className="h-[50vh] md:h-[60vh] w-full rounded-2xl shimmer" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 shimmer" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-64 rounded-2xl flex-shrink-0 shimmer" />)}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 rounded-2xl shimmer" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AnimatedPage>
        {/* Greeting */}
        <motion.div className="px-4 pt-4 md:px-16 md:pt-6" variants={fadeInUp}>
          <h2 className="text-base md:text-lg text-muted-foreground">
            {getGreeting()}, <span className="text-foreground font-semibold">{profile?.nome_completo || 'Usuário'}</span>! 👋
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Continue sua jornada de transformação.</p>
        </motion.div>

        {/* ===== HERO ===== */}
        {featuredProduct ? (
          <section ref={heroRef} className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden">
            <motion.div className="absolute inset-0" style={{ y: heroImageY }} initial={{ scale: 1.05, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }}>
              <img src={featuredProduct.imagem_capa_url || '/placeholder.svg'} alt={featuredProduct.nome} className="h-[calc(100%+150px)] w-full object-cover object-center" />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top left, hsl(142 76% 93% / 0.3), transparent 50%)' }} />
            <FloatingParticles />

            <div className="relative flex h-full items-center px-4 md:px-16">
              <motion.div className="max-w-xl space-y-4 md:space-y-6" variants={staggerContainer} initial="initial" animate="animate">
                <motion.span variants={fadeInUp} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 md:px-4 md:py-1.5 text-[10px] md:text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                  {featuredHasAccess ? '✦ Programa em destaque' : 'Programa disponível'}
                </motion.span>
                <motion.h1 variants={fadeInUp} className="font-display text-3xl leading-tight text-foreground md:text-7xl font-semibold">{featuredProduct.nome}</motion.h1>
                <motion.p variants={fadeInUp} className="text-sm leading-relaxed text-muted-foreground md:text-lg line-clamp-3 md:line-clamp-none">{featuredProduct.descricao}</motion.p>
                <motion.div variants={fadeInUp} className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Layers className="h-4 w-4" /> {animatedModules} módulos</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> {animatedLessons} aulas</span>
                </motion.div>
                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3">
                  {featuredHasAccess ? (
                    <>
                      <Button asChild size="lg" className="btn-ripple h-12 px-6 md:px-8 text-sm md:text-base font-semibold bg-gradient-to-r from-primary to-[hsl(142_72%_37%)] shadow-green-glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                        <Link to={`/app/programa/${featuredProduct.slug}`}><Play className="mr-2 h-5 w-5" /> Continuar programa</Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="h-12 px-6 md:px-8 text-sm md:text-base font-semibold border-primary text-primary hover:bg-accent transition-all duration-300">
                        <Link to={`/app/programa/${featuredProduct.slug}`}>Saiba mais</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="lg" onClick={() => setRequestModal(featuredProduct.nome)} className="btn-ripple h-12 px-6 md:px-8 text-sm md:text-base font-semibold bg-gradient-to-r from-primary to-[hsl(142_72%_37%)] shadow-green-glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                        Solicitar acesso
                      </Button>
                      <Button asChild variant="outline" size="lg" className="h-12 px-6 md:px-8 text-sm md:text-base font-semibold transition-all duration-300">
                        <Link to={`/app/programa/${featuredProduct.slug}`}>Ver detalhes</Link>
                      </Button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            </div>

            {featuredHasAccess && (
              <motion.div className="absolute bottom-0 left-0 right-0 glass-card px-8 py-4 md:px-16 border-t border-white/30" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground font-medium">Seu progresso</span>
                  <motion.div className="flex-1" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.6 }} style={{ transformOrigin: 'left' }}>
                    <Progress value={productProgress} className="h-2" />
                  </motion.div>
                  <span className="text-xs text-primary font-bold">{Math.round(productProgress)}%</span>
                </div>
              </motion.div>
            )}

            {!featuredHasAccess && (
              <motion.div className="absolute bottom-0 left-0 right-0 glass-card px-8 py-4 md:px-16 border-t border-white/30" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
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

        {/* ===== HÁBITOS DE HOJE ===== */}
        <WaterReminderBanner />
        <HabitsChecklist />

        {/* ===== MEUS PROGRAMAS (carrossel) ===== */}
        <motion.section className="px-4 py-8 md:px-16 md:py-12" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="mb-4 md:mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">Meus Programas</h2>
            {myPrograms.length > 1 && (
              <div className="flex gap-2">
                <button onClick={() => scrollMyProgs('left')} className="rounded-full border border-border p-2 text-foreground hover:bg-accent hover:border-primary/30 transition-all duration-300"><ChevronLeft className="h-5 w-5" /></button>
                <button onClick={() => scrollMyProgs('right')} className="rounded-full border border-border p-2 text-foreground hover:bg-accent hover:border-primary/30 transition-all duration-300"><ChevronRight className="h-5 w-5" /></button>
              </div>
            )}
          </div>

          {myPrograms.length > 0 ? (
            <div ref={myProgsRef} className="flex gap-4 md:gap-5 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory md:snap-none" style={{ scrollbarWidth: 'none' }}>
              {myPrograms.map((p, i) => {
                const prog = progressMap[p.id] || 0;
                const modCount = p.modules?.length || 0;
                const lessonCount = p.modules?.reduce((s, m: any) => s + (m.lessons?.length || 0), 0) || 0;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                    className="flex-shrink-0 snap-center" style={{ width: 'clamp(240px, 65vw, 300px)' }}
                  >
                    <Link to={`/app/programa/${p.slug}`} className="group block glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-green-glow hover:border-primary/30">
                      <div className="relative overflow-hidden">
                        {p.imagem_capa_url ? (
                          <img src={p.imagem_capa_url} alt={p.nome} className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="h-36 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/80 to-transparent" />
                      </div>
                      <div className="p-4 space-y-3">
                        <h3 className="font-display text-lg font-semibold text-foreground line-clamp-1">{p.nome}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {modCount} módulos</span>
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {lessonCount} aulas</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="text-primary font-bold">{Math.round(prog)}%</span>
                          </div>
                          <Progress value={prog} className="h-1.5" />
                        </div>
                        <Button size="sm" className="w-full btn-ripple bg-gradient-to-r from-primary to-[hsl(142_72%_37%)] shadow-sm hover:shadow-green-glow transition-all duration-300">
                          <Play className="mr-2 h-4 w-4" /> Continuar
                        </Button>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div className="rounded-2xl border border-dashed border-border p-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">Você ainda não tem programas.</p>
              <p className="text-sm text-muted-foreground mt-1">Explore abaixo!</p>
            </motion.div>
          )}
        </motion.section>

        {/* ===== EXPLORE OS PROGRAMAS (carrossel Netflix) ===== */}
        <motion.section className="px-4 py-8 md:px-16 md:py-12" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <div className="mb-4 md:mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">Explore os Programas</h2>
            {allProducts.length > 3 && (
              <div className="hidden md:flex gap-2">
                <button onClick={() => exploreRef.current?.scrollBy({ left: -220, behavior: 'smooth' })} className="rounded-full border border-border p-2 text-foreground hover:bg-accent hover:border-primary/30 transition-all duration-300"><ChevronLeft className="h-5 w-5" /></button>
                <button onClick={() => exploreRef.current?.scrollBy({ left: 220, behavior: 'smooth' })} className="rounded-full border border-border p-2 text-foreground hover:bg-accent hover:border-primary/30 transition-all duration-300"><ChevronRight className="h-5 w-5" /></button>
              </div>
            )}
          </div>
          <div ref={exploreRef} className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory md:snap-none" style={{ scrollbarWidth: 'none' }}>
            {allProducts.map((p, i) => {
              const hasAccess = isAdmin || !!accessMap[p.id];
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="flex-shrink-0 snap-center" style={{ width: '190px' }}
                >
                  {hasAccess ? (
                    <Link to={`/app/programa/${p.slug}`} className="group block overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.3)]" style={{ height: '280px', borderRadius: '12px' }}>
                      <div className="relative h-full w-full">
                        {p.imagem_capa_url ? (
                          <img src={p.imagem_capa_url} alt={p.nome} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)' }}>
                          <h3 className="text-white font-bold leading-tight line-clamp-2" style={{ fontSize: '16px' }}>{p.nome}</h3>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <button onClick={() => setRequestModal(p.nome)} className="group block overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.3)] text-left w-full" style={{ height: '280px', borderRadius: '12px' }}>
                      <div className="relative h-full w-full">
                        {p.imagem_capa_url ? (
                          <img src={p.imagem_capa_url} alt={p.nome} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                          <Lock className="h-10 w-10 text-white" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)' }}>
                          <h3 className="text-white font-bold leading-tight line-clamp-2" style={{ fontSize: '16px' }}>{p.nome}</h3>
                        </div>
                      </div>
                    </button>
                  )
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="border-t border-border bg-card/50 px-4 py-6 md:px-16 mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© 2026 JP NutriCare. Todos os direitos reservados.</span>
            <span>v1.0.0</span>
          </div>
        </footer>

        <AccessRequestModal open={!!requestModal} onClose={() => setRequestModal(null)} programName={requestModal || undefined} />
      </AnimatedPage>
    </AppLayout>
  );
}
