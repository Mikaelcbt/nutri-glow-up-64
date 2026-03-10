import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ChevronRight, BookOpen, Users, Award, ArrowRight, Star, Sparkles, Heart, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp, fadeInRight } from '@/components/AnimatedPage';

interface Product {
  id: string; nome: string; slug: string; descricao: string; imagem_capa_url: string;
}

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setProducts(data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <span className="font-display text-2xl font-semibold text-foreground">JP NutriCare</span>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
            <Button asChild size="sm" className="active:scale-[0.97] transition-transform"><Link to="/register">Começar agora</Link></Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/images/foto-nutricionista.jpeg"
            alt="JP NutriCare — Nutricionista"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/70 to-foreground/30" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto w-full px-6 py-24 flex flex-col lg:flex-row items-center gap-12">
          <motion.div
            className="flex-1 space-y-7"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.span variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Plataforma de nutrição
            </motion.span>
            <motion.h1 variants={fadeInUp} className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] text-primary-foreground">
              Transforme seu{' '}
              <span className="text-primary relative inline-block">
                corpo
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8C40 2 100 2 198 8" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
                </svg>
              </span>{' '}
              e sua{' '}
              <span className="text-primary">saúde</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg text-primary-foreground/75 max-w-lg leading-relaxed">
              Programas completos de nutrição com acompanhamento especializado, planos alimentares personalizados e uma comunidade de apoio.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild size="lg" className="h-13 px-8 text-base font-semibold active:scale-[0.97] transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30">
                <Link to="/register"><ArrowRight className="mr-2 h-5 w-5" /> Começar agora</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-13 px-8 text-base font-semibold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 active:scale-[0.97] transition-all backdrop-blur-sm">
                <Link to="/login">Já tenho conta</Link>
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeInUp} className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                {['M', 'A', 'C'].map((letter, i) => (
                  <div key={i} className="h-9 w-9 rounded-full bg-primary/30 backdrop-blur-sm border-2 border-primary-foreground/20 flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {letter}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-xs text-primary-foreground/60">+200 alunos transformados</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Logo card floating on right */}
          <motion.div
            className="hidden lg:block flex-shrink-0"
            variants={fadeInRight}
            initial="initial"
            animate="animate"
          >
            <div className="relative">
              <div className="w-56 h-56 rounded-3xl bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-6 shadow-2xl flex items-center justify-center">
                <img src="/icon-512.png" alt="JP NutriCare" className="w-full rounded-2xl" />
              </div>
              <motion.div
                className="absolute -bottom-5 -left-5 rounded-2xl bg-card/95 backdrop-blur-sm border border-border p-3 shadow-soft"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-accent flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">98%</p>
                    <p className="text-[10px] text-muted-foreground">Aprovação</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="absolute -top-5 -right-5 rounded-2xl bg-card/95 backdrop-blur-sm border border-border p-3 shadow-soft"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">+200</p>
                    <p className="text-[10px] text-muted-foreground">Alunos</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Programs */}
      {products.length > 0 && (
        <section className="py-24 px-6 bg-secondary/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground mb-4">Nossos programas</span>
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground">O que você vai aprender</h2>
              <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">Programas completos desenvolvidos por especialistas em nutrição</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="group rounded-2xl border border-border bg-card overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="relative overflow-hidden">
                    {p.imagem_capa_url ? (
                      <img src={p.imagem_capa_url} alt={p.nome} className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-56 w-full bg-accent flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-accent-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
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

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            className="font-display text-4xl font-semibold text-foreground mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Como funciona
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: 'Crie sua conta', desc: 'Registre-se em poucos segundos e aguarde a liberação do seu programa.' },
              { icon: BookOpen, title: 'Acesse o conteúdo', desc: 'Módulos em vídeo, materiais de apoio e planos alimentares completos.' },
              { icon: Award, title: 'Transforme-se', desc: 'Acompanhe seu progresso, compartilhe resultados e alcance seus objetivos.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-4 p-6"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <step.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-secondary/50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            className="font-display text-4xl font-semibold text-foreground mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Depoimentos
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Maria S.', text: 'Programa incrível! Em 3 meses consegui atingir meus objetivos.' },
              { name: 'Ana P.', text: 'A comunidade faz toda a diferença. Me sinto super motivada!' },
              { name: 'Carla R.', text: 'Conteúdo de altíssima qualidade. Recomendo demais.' },
            ].map((t, i) => (
              <motion.div
                key={i}
                className="rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-soft hover:-translate-y-1 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="text-sm text-foreground italic mb-4">"{t.text}"</p>
                <p className="text-xs font-semibold text-primary">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-xl font-semibold text-foreground">JP NutriCare</span>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} JP NutriCare. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
            <Button asChild size="sm" className="active:scale-[0.97] transition-transform"><Link to="/register">Criar conta</Link></Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
