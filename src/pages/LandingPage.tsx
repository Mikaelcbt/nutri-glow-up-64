import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Star, Sparkles, Video, Salad, Bot, Trophy, Users, BarChart3,
  Menu, X, ChevronLeft, ChevronRight, Instagram,
} from 'lucide-react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { staggerContainer, fadeInUp, fadeInRight } from '@/components/AnimatedPage';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';

interface Product {
  id: string; nome: string; slug: string; descricao: string; imagem_capa_url: string;
}

/* ─── animated counter that triggers when visible ─── */
function StatCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const n = useAnimatedNumber(isInView ? value : 0, 1800);
  return <span ref={ref}>{n}{suffix}</span>;
}

/* ─── testimonial data ─── */
const testimonials = [
  { name: 'Maria S.', text: 'Perdi 8kg em 2 meses seguindo os programas. A IA nutricionista me ajudou muito!', initials: 'MS' },
  { name: 'Ana P.', text: 'A comunidade faz toda a diferença. Me sinto apoiada em cada passo da jornada.', initials: 'AP' },
  { name: 'Carla R.', text: 'Conteúdo de altíssima qualidade. Os planos alimentares são práticos e deliciosos.', initials: 'CR' },
  { name: 'Juliana M.', text: 'Nunca pensei que conseguiria manter a dieta. Os desafios diários me mantêm motivada!', initials: 'JM' },
  { name: 'Fernanda L.', text: 'A NutriIA responde todas minhas dúvidas na hora. Melhor investimento que fiz!', initials: 'FL' },
];

const features = [
  { icon: Video, title: 'Aulas em vídeo', desc: 'Módulos completos com conteúdo profissional e didático' },
  { icon: Salad, title: 'Planos alimentares', desc: 'Cardápios personalizados para seus objetivos' },
  { icon: Bot, title: 'IA Nutricionista', desc: 'Tire dúvidas 24/7 com inteligência artificial' },
  { icon: Trophy, title: 'Desafios diários', desc: 'Mantenha a motivação com desafios progressivos' },
  { icon: Users, title: 'Comunidade ativa', desc: 'Conecte-se com pessoas na mesma jornada' },
  { icon: BarChart3, title: 'Acompanhamento', desc: 'Monitore seu progresso em tempo real' },
];

const steps = [
  { emoji: '🎯', title: 'Escolha seu programa', desc: 'Navegue pelos programas e encontre o ideal para seus objetivos' },
  { emoji: '📚', title: 'Acesse o conteúdo', desc: 'Módulos em vídeo, planos alimentares e materiais completos' },
  { emoji: '🏆', title: 'Transforme-se', desc: 'Acompanhe seu progresso e celebre cada conquista' },
];

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const testimonialInterval = useRef<ReturnType<typeof setInterval>>();
  const testimonialPaused = useRef(false);

  // hero parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setProducts(data);
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // testimonial autoplay
  useEffect(() => {
    testimonialInterval.current = setInterval(() => {
      if (!testimonialPaused.current) {
        setCurrentTestimonial(p => (p + 1) % testimonials.length);
      }
    }, 4000);
    return () => clearInterval(testimonialInterval.current);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── NAVBAR ─── */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-card/95 backdrop-blur-md shadow-sm border-b border-border' : 'bg-transparent'
        }`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare" className="h-9 object-contain" />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('como-funciona')} className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">Como funciona</button>
            <button onClick={() => scrollToSection('programas')} className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">Programas</button>
            <button onClick={() => scrollToSection('depoimentos')} className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">Depoimentos</button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Começar agora</Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(o => !o)}>
            {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="md:hidden bg-card border-b border-border px-6 pb-6 pt-2 space-y-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <button onClick={() => scrollToSection('como-funciona')} className="block w-full text-left py-2 text-sm font-medium text-foreground/80">Como funciona</button>
              <button onClick={() => scrollToSection('programas')} className="block w-full text-left py-2 text-sm font-medium text-foreground/80">Programas</button>
              <button onClick={() => scrollToSection('depoimentos')} className="block w-full text-left py-2 text-sm font-medium text-foreground/80">Depoimentos</button>
              <div className="flex gap-3 pt-2">
                <Button asChild variant="outline" size="sm" className="flex-1 border-primary text-primary">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link to="/register">Começar agora</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ─── HERO (dark cinematográfico) ─── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden" style={{ backgroundColor: '#0d1a0f' }}>
        {/* subtle dot texture */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1a0f] via-[#0d1a0f]/95 to-[#0d1a0f]/80" />
        </motion.div>

        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-32 lg:py-0 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left content */}
          <motion.div
            className="flex-1 space-y-7 text-center lg:text-left"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.span variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/25 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Plataforma de Nutrição Premium
            </motion.span>

            <motion.h1 variants={fadeInUp} className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.08] text-white">
              Transforme seu{' '}
              <span className="text-primary relative inline-block">
                corpo
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8C40 2 100 2 198 8" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                </svg>
              </span>{' '}
              e sua{' '}
              <span className="text-primary">vida</span>{' '}
              com nutrição de verdade
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-base sm:text-lg text-white/60 max-w-xl leading-relaxed mx-auto lg:mx-0">
              Programas completos com acompanhamento especializado, planos alimentares personalizados e IA nutricionista exclusiva
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <Button asChild size="lg" className="h-13 px-8 text-base font-semibold shadow-lg shadow-primary/25">
                <Link to="/register"><ArrowRight className="mr-2 h-5 w-5" /> Começar agora</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 px-8 text-base font-semibold border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
                <button onClick={() => scrollToSection('programas')}>Ver programas</button>
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeInUp} className="flex items-center gap-4 pt-4 justify-center lg:justify-start">
              <div className="flex -space-x-2.5">
                {['M', 'A', 'C', 'J'].map((letter, i) => (
                  <div key={i} className="h-9 w-9 rounded-full bg-primary/20 border-2 border-[#0d1a0f] flex items-center justify-center text-xs font-bold text-primary">
                    {letter}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-xs text-white/50">Mais de 200 alunas transformadas</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Phone mockup */}
          <motion.div
            className="flex-shrink-0 relative"
            variants={fadeInRight}
            initial="initial"
            animate="animate"
          >
            <div className="relative w-[260px] sm:w-[300px] lg:w-[320px]">
              <img
                src="/images/app-mockup.png"
                alt="JP NutriCare App"
                className="w-full drop-shadow-2xl"
              />
              {/* Glow effect */}
              <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-primary rounded-full scale-75" />
            </div>
          </motion.div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0d2b1a] to-transparent" />
      </section>

      {/* ─── NUMBERS ─── */}
      <section className="py-20 px-6" style={{ backgroundColor: '#0d2b1a' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { value: 200, suffix: '+', label: 'Alunas transformadas' },
            { value: 98, suffix: '%', label: 'Taxa de satisfação' },
            { value: 15, suffix: '+', label: 'Programas disponíveis' },
            { value: 24, suffix: '/7', label: 'Suporte via IA' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <p className="font-display text-4xl sm:text-5xl font-bold text-primary">
                <StatCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-sm text-white/50 mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section id="como-funciona" className="py-24 px-6 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Sua jornada em <span className="text-primary">3 passos</span> simples
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className="relative rounded-2xl border border-border bg-card p-8 text-center hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-md">
                  {i + 1}
                </div>
                <p className="text-4xl mb-4 mt-2">{step.emoji}</p>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#f8f9f6' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Tudo que você precisa em <span className="text-primary">um só lugar</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-300 group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROGRAMAS ─── */}
      {products.length > 0 && (
        <section id="programas" className="py-24 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-4">Nossos programas</span>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">Programas que <span className="text-primary">transformam</span></h2>
              <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">Desenvolvidos por especialistas em nutrição para resultados reais</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/8 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="relative overflow-hidden">
                    {p.imagem_capa_url ? (
                      <img src={p.imagem_capa_url} alt={p.nome} className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-56 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Salad className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
                  </div>
                  <div className="p-6 space-y-3">
                    <h3 className="font-display text-2xl font-semibold text-foreground">{p.nome}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{p.descricao}</p>
                    <Link to="/register" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
                      Começar programa <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── DEPOIMENTOS (carrossel) ─── */}
      <section id="depoimentos" className="py-24 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              O que nossas <span className="text-primary">alunas</span> dizem
            </h2>
          </motion.div>

          <div
            className="relative"
            onMouseEnter={() => { testimonialPaused.current = true; }}
            onMouseLeave={() => { testimonialPaused.current = false; }}
          >
            {/* Cards container */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTestimonial}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-card text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {testimonials[currentTestimonial].initials}
                    </div>
                  </div>
                  <div className="flex justify-center gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground text-base sm:text-lg leading-relaxed italic mb-6 max-w-lg mx-auto">
                    "{testimonials[currentTestimonial].text}"
                  </p>
                  <p className="text-sm font-semibold text-primary">{testimonials[currentTestimonial].name}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={() => setCurrentTestimonial(p => (p - 1 + testimonials.length) % testimonials.length)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <ChevronLeft className="h-5 w-5 text-foreground/60" />
            </button>
            <button
              onClick={() => setCurrentTestimonial(p => (p + 1) % testimonials.length)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <ChevronRight className="h-5 w-5 text-foreground/60" />
            </button>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentTestimonial ? 'w-6 bg-primary' : 'w-2 bg-border hover:bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="relative py-24 px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d2b1a 0%, hsl(var(--primary)) 100%)' }}>
        {/* Decorative leaves */}
        <div className="absolute top-8 left-8 text-5xl opacity-15 rotate-12">🌿</div>
        <div className="absolute bottom-8 right-8 text-5xl opacity-15 -rotate-12">🍃</div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.h2
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Pronta para transformar sua vida?
          </motion.h2>
          <motion.p
            className="text-white/70 text-lg mb-10 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Junte-se a centenas de mulheres que já mudaram seus corpos e sua saúde
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button asChild size="lg" className="h-14 px-10 text-lg font-semibold bg-white text-primary hover:bg-white/90 shadow-xl">
              <Link to="/register">Começar minha transformação <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-16 px-6" style={{ backgroundColor: '#0d1a0f' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-3">
              <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare" className="h-10 object-contain brightness-0 invert" />
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
              <button onClick={() => scrollToSection('programas')} className="hover:text-primary transition-colors">Programas</button>
              <button onClick={() => scrollToSection('como-funciona')} className="hover:text-primary transition-colors">Como funciona</button>
              <Link to="/login" className="hover:text-primary transition-colors">Entrar</Link>
              <Link to="/register" className="hover:text-primary transition-colors">Criar conta</Link>
            </div>

            <div className="flex items-center gap-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/30 transition-all">
                <Instagram className="h-4 w-4 text-white/60" />
              </a>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-white/30">© {new Date().getFullYear()} JP NutriCare. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
