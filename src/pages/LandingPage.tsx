import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Menu, X, Instagram, ChevronLeft, ChevronRight, Check, Star, Play, Zap } from 'lucide-react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';

interface Product {
  id: string; nome: string; slug: string; descricao: string; imagem_capa_url: string;
}

function StatCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const n = useAnimatedNumber(isInView ? value : 0, 1800);
  return <span ref={ref}>{n}{suffix}</span>;
}

const testimonials = [
  {
    name: 'Mariana S.',
    role: 'Programa Emagrecimento',
    result: '−9 kg em 10 semanas',
    text: 'Tentei de tudo antes. Funcional, dieta low carb, jejum... Nada ficava. Com a Julia aprendi a comer de verdade. Não passei fome nem um dia.',
  },
  {
    name: 'Camila R.',
    role: 'Programa Detox & Equilíbrio',
    result: '−6 kg + energia de volta',
    text: 'Depois de dois filhos achei que meu corpo nunca mais seria o mesmo. Errei. Em 8 semanas perdi a barriga e recuperei a energia que não tinha mais.',
  },
  {
    name: 'Fernanda L.',
    role: 'NutriIA + Desafios Diários',
    result: '−12 kg em 4 meses',
    text: 'A NutriIA respondeu todas as minhas dúvidas às 23h quando bate a ansiedade. Nunca me senti tão amparada numa dieta. Melhor investimento da minha vida.',
  },
  {
    name: 'Ana P.',
    role: 'Comunidade JP',
    result: '−7 kg + manteve por 1 ano',
    text: 'O que me surpreendeu foi a comunidade. Quando ia desistir, sempre tinha alguém me puxando de volta. Hoje sou eu quem puxa as outras.',
  },
  {
    name: 'Juliana M.',
    role: 'Plano Alimentar Personalizado',
    result: '−5 kg sem academia',
    text: 'Achei que precisava de academia. A Julia me provou que não. Só com alimentação estratégica e os hábitos do app perdi 5kg em 6 semanas.',
  },
];

const outcomes = [
  { icon: '🥗', title: 'Planos alimentares que você realmente consegue seguir', desc: 'Cardápios práticos para rotina real. Sem ingredientes estranhos, sem horários impossíveis.' },
  { icon: '🤖', title: 'IA Nutricionista disponível 24 horas', desc: 'Bateu ansiedade à meia-noite? Tem dúvida no mercado? A NutriIA responde na hora.' },
  { icon: '🔥', title: 'Desafios diários que mantêm você no trilho', desc: 'Pequenas vitórias diárias que se acumulam em resultados que duram.' },
  { icon: '👥', title: 'Comunidade que entende o que você está passando', desc: 'Mulheres na mesma jornada, se apoiando de verdade. Sem julgamento.' },
  { icon: '📊', title: 'Acompanhamento visual do seu progresso', desc: 'Veja cada etapa da sua transformação. XP, streaks e conquistas que te motivam.' },
  { icon: '🎥', title: 'Conteúdo profissional em vídeo', desc: 'Módulos completos com a metodologia JP, do básico ao avançado.' },
];

const faqs = [
  {
    q: 'Preciso ter experiência com dietas?',
    a: 'Não. A maioria das nossas alunas começou sem nenhuma base. Os programas são estruturados do zero — você aprende a lógica por trás da alimentação saudável, não só o que comer.',
  },
  {
    q: 'Quanto tempo por dia preciso dedicar?',
    a: 'De 15 a 30 minutos por dia é suficiente para aulas, hábitos e desafios. O app foi construído para rotinas reais, não para quem tem horas livres.',
  },
  {
    q: 'Os planos alimentares são personalizados?',
    a: 'Cada programa tem planos alimentares desenvolvidos por Julia para perfis específicos de objetivo. A NutriIA complementa com ajustes personalizados para seu caso.',
  },
  {
    q: 'Funciona para quem tem filhos e pouco tempo?',
    a: 'Foi para essas mulheres que o app foi criado. Receitas rápidas, planos realistas e uma comunidade que entende a sua realidade.',
  },
  {
    q: 'Como funciona o acesso aos programas?',
    a: 'Você cria uma conta gratuita e solicita acesso ao programa desejado. A equipe JP libera o conteúdo e você começa imediatamente.',
  },
];

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const testimonialPaused = useRef(false);
  const testimonialInterval = useRef<ReturnType<typeof setInterval>>();

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

  useEffect(() => {
    testimonialInterval.current = setInterval(() => {
      if (!testimonialPaused.current) {
        setCurrentTestimonial(p => (p + 1) % testimonials.length);
      }
    }, 5000);
    return () => clearInterval(testimonialInterval.current);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="bg-[#060d07] overflow-x-hidden">

      {/* ─── NAVBAR ─── */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-[#060d07]/96 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
        }`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 md:px-10 h-16">
          <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare" className="h-8 object-contain brightness-0 invert opacity-80" />

          <div className="hidden md:flex items-center gap-10">
            {[['Como funciona', 'como-funciona'], ['Resultados', 'resultados'], ['Programas', 'programas']].map(([label, id]) => (
              <button key={id} onClick={() => scrollToSection(id)}
                className="text-[10px] font-medium tracking-[0.3em] uppercase text-white/35 hover:text-white/70 transition-colors duration-200">
                {label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/login"
              className="text-[10px] font-medium tracking-[0.3em] uppercase text-white/35 hover:text-white/70 transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link to="/register"
              className="inline-flex items-center gap-2 bg-primary text-white text-[10px] font-semibold tracking-[0.2em] uppercase px-5 py-3 hover:bg-primary/90 transition-colors">
              Começar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(o => !o)}>
            {mobileMenuOpen ? <X className="h-5 w-5 text-white/50" /> : <Menu className="h-5 w-5 text-white/50" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="md:hidden bg-[#060d07] border-b border-white/5 px-6 pb-6 pt-2 space-y-3"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {[['Como funciona', 'como-funciona'], ['Resultados', 'resultados'], ['Programas', 'programas']].map(([label, id]) => (
                <button key={id} onClick={() => scrollToSection(id)}
                  className="block w-full text-left py-2 text-[10px] font-medium tracking-[0.3em] uppercase text-white/40">
                  {label}
                </button>
              ))}
              <div className="flex gap-3 pt-2">
                <Link to="/login" className="flex-1 text-center py-3 border border-white/8 text-[10px] font-medium tracking-widest uppercase text-white/40">Entrar</Link>
                <Link to="/register" className="flex-1 text-center py-3 bg-primary text-white text-[10px] font-semibold tracking-widest uppercase">Começar</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col justify-end overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 72% 38%, rgba(34,197,94,0.07) 0%, transparent 65%), #060d07'
        }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }} />
        <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[8%] right-[-18%] w-[55vw] h-[55vw] rounded-full border border-white/[0.035]" />
          <div className="absolute top-[14%] right-[-12%] w-[42vw] h-[42vw] rounded-full border border-primary/[0.04]" />
          <div className="absolute top-[22%] right-[-5%] w-[28vw] h-[28vw] rounded-full border border-primary/[0.06]" />
          <div className="absolute top-[30%] right-[4%] w-[12vw] h-[12vw] rounded-full bg-primary/[0.04] blur-2xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-10 lg:px-24 pb-20 md:pb-28 pt-32">
          <motion.p
            className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            Nutrição que transforma de verdade
          </motion.p>

          <motion.h1
            className="font-display font-light text-white leading-[0.9] mb-8"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            Chega de<br />
            dieta que<br />
            <em className="not-italic" style={{ color: 'hsl(145 60% 52%)' }}>não dura.</em>
          </motion.h1>

          <motion.div
            className="h-px bg-white/8 mb-8 max-w-[6rem]"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.75, duration: 0.6 }}
          />

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-24 items-start">
            <motion.div
              className="max-w-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7 }}
            >
              <p className="text-white/40 text-base leading-relaxed mb-8">
                Programas de nutrição com planos alimentares reais, IA disponível 24h e uma comunidade que te mantém no caminho — até quando a vontade some.
              </p>

              {/* Social proof micro */}
              <div className="flex items-center gap-3 mb-8">
                <div className="flex -space-x-2">
                  {['M', 'C', 'F', 'A', 'J'].map((l, i) => (
                    <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border border-white/10 flex items-center justify-center text-[9px] font-bold text-primary/90">
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {Array(5).fill(0).map((_, i) => <Star key={i} className="h-2.5 w-2.5 fill-[hsl(43_72%_52%)] text-[hsl(43_72%_52%)]" />)}
                  </div>
                  <p className="text-[10px] text-white/30 tracking-wide">+200 alunas transformadas</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-7 py-4 hover:bg-primary/90 transition-colors group">
                  Quero começar agora
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <button onClick={() => scrollToSection('resultados')}
                  className="inline-flex items-center justify-center gap-2 border border-white/8 text-white/40 text-sm font-medium px-7 py-4 hover:border-white/20 hover:text-white/70 transition-all">
                  Ver resultados reais
                </button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="flex items-start gap-8 lg:gap-12 pt-1 flex-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.8 }}
            >
              {[
                { v: 200, s: '+', l: 'Alunas\ntransformadas' },
                { v: 98, s: '%', l: 'Taxa de\nsatisfação' },
                { v: 8, s: ' kg', l: 'Perda média\nem 10 semanas' },
              ].map((stat, i) => (
                <div key={i} className={`${i > 0 ? 'pl-8 lg:pl-12 border-l border-white/[0.07]' : ''}`}>
                  <p className="font-display text-[2.6rem] font-light text-white leading-none mb-1.5">
                    <StatCounter value={stat.v} suffix={stat.s} />
                  </p>
                  <p className="text-[9px] text-white/25 uppercase tracking-[0.25em] whitespace-pre-line leading-relaxed">{stat.l}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#060d07] to-transparent" />
      </section>

      {/* ─── PROBLEMA — a dor real ─── */}
      <section id="como-funciona" className="py-28 px-6 md:px-10 lg:px-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div>
              <p className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-6">O que está te impedindo</p>
              <h2 className="font-display font-light text-white mb-8" style={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: '1.05' }}>
                Você já tentou.<br />
                <span className="text-white/30">E não funcionou.</span>
              </h2>
              <div className="space-y-5">
                {[
                  'Dietas que cortam tudo que você gosta',
                  'Planilhas complicadas que ninguém segue',
                  'Resultados rápidos que desaparecem em meses',
                  'Profissional que não te responde quando você precisa',
                  'Falta de apoio quando a motivação acaba',
                ].map((pain, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-4"
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex-shrink-0 mt-1 h-4 w-4 rounded-full border border-white/10 flex items-center justify-center">
                      <X className="h-2 w-2 text-white/20" />
                    </div>
                    <p className="text-white/35 text-sm leading-relaxed">{pain}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-6">Como a JP NutriCare funciona</p>
              {[
                { n: '01', t: 'Crie sua conta e escolha um programa', d: 'Em menos de 2 minutos você tem acesso ao conteúdo completo desenhado para seu objetivo.' },
                { n: '02', t: 'Siga os planos. Use a IA quando tiver dúvida.', d: 'Planos alimentares práticos + NutriIA disponível 24h para qualquer dúvida que aparecer.' },
                { n: '03', t: 'Construa consistência com hábitos diários', d: 'Desafios, streak e comunidade te mantêm motivada muito além da empolgação inicial.' },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  className="flex gap-6 p-6 border border-white/[0.05] hover:border-primary/15 transition-colors duration-300"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span className="font-display text-[3rem] font-light text-white/[0.05] select-none flex-shrink-0 leading-none w-12">{step.n}</span>
                  <div>
                    <h3 className="text-white/75 font-medium text-sm mb-2">{step.t}</h3>
                    <p className="text-white/25 text-sm leading-relaxed">{step.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── OUTCOMES — O que você vai conseguir ─── */}
      <section className="py-28 px-6 md:px-10 lg:px-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-5">Tudo em um lugar</p>
            <h2 className="font-display font-light text-white" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', lineHeight: '1.02' }}>
              Cada detalhe pensado<br />para você ir até o fim.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
            {outcomes.map((o, i) => (
              <motion.div
                key={i}
                className="bg-[#060d07] p-8 hover:bg-[#0a1509]/60 transition-colors duration-500 group"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <span className="text-3xl mb-5 block">{o.icon}</span>
                <h3 className="text-white/70 font-medium text-[0.95rem] mb-3 group-hover:text-white/90 transition-colors leading-snug">{o.title}</h3>
                <p className="text-white/22 text-sm leading-relaxed">{o.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RESULTADOS / DEPOIMENTOS ─── */}
      <section id="resultados" className="py-28 px-6 md:px-10 lg:px-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-5">Resultados reais</p>
            <h2 className="font-display font-light text-white" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', lineHeight: '1.02' }}>
              Não é promessa.<br />
              <span className="text-white/30">São histórias reais.</span>
            </h2>
          </motion.div>

          <div
            className="max-w-3xl"
            onMouseEnter={() => { testimonialPaused.current = true; }}
            onMouseLeave={() => { testimonialPaused.current = false; }}
          >
            <div className="font-display leading-none text-primary/8 select-none mb-2"
              style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }} aria-hidden>
              "
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                {/* Result badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 mb-6">
                  <Zap className="h-3 w-3 text-primary fill-primary" />
                  <span className="text-[10px] font-semibold text-primary/80 tracking-wide">{testimonials[currentTestimonial].result}</span>
                </div>

                <p className="font-display font-light text-white/80 leading-[1.15] mb-10"
                  style={{ fontSize: 'clamp(1.3rem, 2.8vw, 2.2rem)' }}>
                  {testimonials[currentTestimonial].text}
                </p>
                <div className="flex items-center gap-5">
                  <div className="h-px flex-1 bg-white/[0.05]" />
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/50 text-sm font-medium">{testimonials[currentTestimonial].name}</p>
                    <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mt-1">{testimonials[currentTestimonial].role}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setCurrentTestimonial(p => (p - 1 + testimonials.length) % testimonials.length)}
                      className="h-8 w-8 border border-white/[0.07] flex items-center justify-center hover:border-white/18 transition-colors">
                      <ChevronLeft className="h-3.5 w-3.5 text-white/35" />
                    </button>
                    <button
                      onClick={() => setCurrentTestimonial(p => (p + 1) % testimonials.length)}
                      className="h-8 w-8 border border-white/[0.07] flex items-center justify-center hover:border-white/18 transition-colors">
                      <ChevronRight className="h-3.5 w-3.5 text-white/35" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setCurrentTestimonial(i)}
                  className="h-px transition-all duration-500"
                  style={{
                    width: i === currentTestimonial ? '32px' : '12px',
                    background: i === currentTestimonial ? 'hsl(145 60% 52%)' : 'rgba(255,255,255,0.12)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROGRAMAS ─── */}
      {products.length > 0 && (
        <section id="programas" className="py-28 px-6 md:px-10 lg:px-24 border-t border-white/[0.04]">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="mb-16 flex items-end justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div>
                <p className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-5">Programas</p>
                <h2 className="font-display font-light text-white" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.8rem)', lineHeight: '1.02' }}>
                  Escolha o seu<br />ponto de partida
                </h2>
              </div>
              <Link to="/register"
                className="hidden md:inline-flex items-center gap-2 text-[9px] text-white/22 tracking-[0.3em] uppercase hover:text-white/50 transition-colors">
                Criar conta gratuita <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04]">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  className="group relative overflow-hidden bg-[#060d07] hover:bg-[#0a1509]/80 transition-colors duration-500 flex flex-col"
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09 }}
                >
                  <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    {p.imagem_capa_url ? (
                      <img src={p.imagem_capa_url} alt={p.nome}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04] opacity-65 group-hover:opacity-80" />
                    ) : (
                      <div className="w-full h-full bg-primary/[0.04] flex items-center justify-center">
                        <Play className="h-12 w-12 text-primary/15" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060d07] via-[#060d07]/20 to-transparent" />
                  </div>
                  <div className="p-7 flex-1 flex flex-col">
                    <h3 className="font-display text-[1.5rem] font-light text-white mb-3 leading-tight">{p.nome}</h3>
                    <p className="text-white/28 text-sm leading-relaxed line-clamp-2 mb-5 flex-1">{p.descricao}</p>
                    <Link to="/register"
                      className="inline-flex items-center gap-2 text-primary/60 text-[10px] font-medium tracking-[0.25em] uppercase group-hover:text-primary group-hover:gap-3 transition-all">
                      Solicitar acesso <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── O QUE VOCÊ RECEBE ─── */}
      <section className="py-28 px-6 md:px-10 lg:px-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-6">Incluso em todos os programas</p>
              <h2 className="font-display font-light text-white mb-10" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: '1.05' }}>
                Tudo que você precisa.<br />
                Nada que vai te complicar.
              </h2>
              <div className="space-y-4">
                {[
                  'Acesso completo às aulas em vídeo',
                  'Planos alimentares prontos para usar',
                  'NutriIA disponível 24h para tirar dúvidas',
                  'Desafios diários com sistema de streak',
                  'Comunidade de apoio ativa',
                  'Progresso visual e conquistas gamificadas',
                  'Materiais complementares para download',
                  'Atualizações de conteúdo sem custo extra',
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <p className="text-white/50 text-sm">{item}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right — quote destaque */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="border border-white/[0.06] p-10 md:p-12 relative overflow-hidden">
                <div className="absolute inset-0" style={{
                  background: 'radial-gradient(ellipse 80% 80% at 80% 20%, rgba(34,197,94,0.05) 0%, transparent 60%)'
                }} />
                <div className="relative">
                  <div className="font-display text-primary/10 leading-none select-none mb-4" style={{ fontSize: '6rem' }}>"</div>
                  <p className="font-display font-light text-white/60 leading-[1.2] mb-8" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.7rem)' }}>
                    Minha missão é que cada aluna chegue em cada semana se sentindo mais no controle da própria saúde — não menos.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/[0.05]" />
                    <div className="text-right">
                      <p className="text-white/45 text-sm font-medium">Julia Pereira</p>
                      <p className="text-white/18 text-[9px] tracking-widest uppercase mt-0.5">Nutricionista • CRN</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-28 px-6 md:px-10 lg:px-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[38%_1fr] gap-16 lg:gap-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-6">Dúvidas frequentes</p>
              <h2 className="font-display font-light text-white mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: '1.05' }}>
                Tem dúvida?<br />
                A gente tem resposta.
              </h2>
              <p className="text-white/25 text-sm leading-relaxed">
                Se sua dúvida não estiver aqui, a NutriIA responde assim que você entrar na plataforma.
              </p>
            </motion.div>

            <div className="space-y-0 divide-y divide-white/[0.04]">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                >
                  <button
                    className="w-full flex items-start justify-between gap-6 py-7 text-left group"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-white/55 text-sm font-medium group-hover:text-white/80 transition-colors leading-snug">{faq.q}</span>
                    <span className={`text-white/20 text-lg flex-shrink-0 mt-0.5 transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="text-white/28 text-sm leading-relaxed pb-7 pr-10">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="py-24 px-6 md:px-10 lg:px-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="relative overflow-hidden border border-white/[0.06] p-10 md:p-16 lg:p-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 60% 80% at 90% 50%, rgba(34,197,94,0.06) 0%, transparent 60%)'
            }} />
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-primary/[0.07]" />
            <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full border border-white/[0.04]" />

            <div className="relative z-10 max-w-2xl">
              <p className="text-[10px] font-medium tracking-[0.38em] text-primary/45 uppercase mb-6">Sua próxima versão começa aqui</p>
              <h2 className="font-display font-light text-white mb-4" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)', lineHeight: '1.02' }}>
                Em 10 semanas,<br />
                você vai se reconhecer.
              </h2>
              <p className="text-white/28 text-sm leading-relaxed mb-3 max-w-md">
                Não é sobre perfeição. É sobre consistência com o suporte certo. Junte-se às alunas que decidiram parar de tentar sozinhas.
              </p>

              {/* Mini proof */}
              <div className="flex items-center gap-3 mb-10">
                <div className="flex -space-x-2">
                  {['M', 'C', 'F', 'A'].map((l, i) => (
                    <div key={i} className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border border-black/20 flex items-center justify-center text-[8px] font-bold text-primary/90">
                      {l}
                    </div>
                  ))}
                </div>
                <p className="text-white/25 text-[11px]">+200 alunas já começaram</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register"
                  className="inline-flex items-center justify-center gap-3 bg-primary text-white font-semibold text-sm px-8 py-4 hover:bg-primary/90 transition-colors group">
                  Criar conta gratuita
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/login"
                  className="inline-flex items-center justify-center text-white/25 text-sm hover:text-white/50 transition-colors">
                  Já tenho conta — entrar
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 px-6 md:px-10 lg:px-24 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <img src="/images/logo-jp-nutricare.png" alt="JP NutriCare"
            className="h-7 object-contain brightness-0 invert opacity-30" />

          <div className="flex gap-7 text-[9px] font-medium tracking-[0.28em] uppercase text-white/16">
            <button onClick={() => scrollToSection('programas')} className="hover:text-white/35 transition-colors">Programas</button>
            <button onClick={() => scrollToSection('como-funciona')} className="hover:text-white/35 transition-colors">Como funciona</button>
            <Link to="/login" className="hover:text-white/35 transition-colors">Entrar</Link>
            <Link to="/register" className="hover:text-white/35 transition-colors">Criar conta</Link>
          </div>

          <div className="flex items-center gap-4">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
              className="h-7 w-7 border border-white/[0.07] flex items-center justify-center hover:border-white/16 transition-colors">
              <Instagram className="h-3 w-3 text-white/25" />
            </a>
            <p className="text-[9px] text-white/12 tracking-widest">© {new Date().getFullYear()} JP NutriCare</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
