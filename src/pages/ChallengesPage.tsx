import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Calendar, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Challenge {
  id: string;
  titulo: string;
  descricao: string;
  imagem_capa_url: string;
  total_dias: number;
  is_active: boolean;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    const { data, error } = await supabase
      .from('desafios')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) setChallenges(data);
    setLoading(false);
  };

  return (
    <AppLayout>
      <AnimatedPage>
        <div className="px-8 py-8 md:px-16">
          <motion.div variants={fadeInUp} className="mb-8">
            <h1 className="font-display text-4xl font-semibold text-foreground">Desafios</h1>
            <p className="text-muted-foreground mt-2">Participe dos desafios e transforme seus hábitos!</p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">Nenhum desafio disponível no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {challenges.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={`/app/desafios/${c.id}`}
                    className="group block rounded-2xl border border-border bg-card overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden">
                      {c.imagem_capa_url ? (
                        <img src={c.imagem_capa_url} alt={c.titulo} className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="h-44 w-full bg-accent flex items-center justify-center">
                          <Trophy className="h-10 w-10 text-accent-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 space-y-3">
                      <h3 className="font-display text-xl font-semibold text-foreground">{c.titulo}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{c.descricao}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{c.total_dias} dias</span>
                      </div>
                      <Button size="sm" className="w-full">Ver desafio</Button>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}
