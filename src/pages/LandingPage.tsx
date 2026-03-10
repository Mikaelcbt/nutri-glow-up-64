import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ChevronRight, BookOpen, Users, Award, ArrowRight } from 'lucide-react';
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <motion.div
            className="flex-1 space-y-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.span variants={fadeInUp} className="inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              Plataforma de nutrição
            </motion.span>
            <motion.h1 variants={fadeInUp} className="font-display text-5xl lg:text-7xl font-semibold leading-tight text-foreground">
              Transforme seu <span className="text-primary">corpo</span> e sua <span className="text-primary">saúde</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Programas completos de nutrição com acompanhamento especializado, planos alimentares personalizados e uma comunidade de apoio.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex gap-3 pt-2">
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold active:scale-[0.97] transition-transform">
                <Link to="/register"><ArrowRight className="mr-2 h-5 w-5" /> Começar agora</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold border-primary text-primary hover:bg-accent active:scale-[0.97] transition-transform">
                <Link to="/login">Já tenho conta</Link>
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
            className="flex-1 max-w-md"
            variants={fadeInRight}
            initial="initial"
            animate="animate"
          >
            <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-accent p-8 shadow-soft">
              <img src="/icon-512.png" alt="JP NutriCare" className="w-full rounded-2xl" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Programs */}
      {products.length > 0 && (
        <section className="py-20 px-6 bg-secondary/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="font-display text-4xl font-semibold text-foreground">O que você vai aprender</h2>
              <p className="text-muted-foreground mt-3">Programas completos desenvolvidos por especialistas</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="rounded-2xl border border-border bg-card overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]"
                >
                  {p.imagem_capa_url && (
                    <img src={p.imagem_capa_url} alt={p.nome} className="h-48 w-full object-cover" />
                  )}
                  <div className="p-6">
                    <h3 className="font-display text-xl font-semibold text-foreground">{p.nome}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.descricao}</p>
                    <Link to="/register" className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline">
                      Começar <ChevronRight className="h-4 w-4" />
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
