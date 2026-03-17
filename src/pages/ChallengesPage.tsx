import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { AnimatedPage, fadeInUp, staggerContainer } from '@/components/AnimatedPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Calendar, Trophy, Unlock, ArrowRight } from 'lucide-react';
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
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasedCount, setReleasedCount] = useState<Record<string, number>>({});
  const [progressCount, setProgressCount] = useState<Record<string, number>>({});

  useEffect(() => {
    loadChallenges();
  }, [user]);

  const loadChallenges = async () => {
    const { data, error } = await supabase
      .from('desafios')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading challenges:', error);
      setLoading(false);
      return;
    }
    
    const challengeList = data || [];
    setChallenges(challengeList);

    if (challengeList.length > 0) {
      const ids = challengeList.map(c => c.id);
      const { data: daysData } = await supabase
        .from('desafio_dias')
        .select('desafio_id, liberado')
        .in('desafio_id', ids);

      const released: Record<string, number> = {};
      (daysData || []).forEach(d => {
        if (d.liberado) {
          released[d.desafio_id] = (released[d.desafio_id] || 0) + 1;
        }
      });
      setReleasedCount(released);

      if (user) {
        const { data: progData } = await supabase
          .from('desafio_progresso')
          .select('desafio_id')
          .eq('user_id', user.id)
          .eq('concluido', true)
          .in('desafio_id', ids);

        const prog: Record<string, number> = {};
        (progData || []).forEach(p => {
          prog[p.desafio_id] = (prog[p.desafio_id] || 0) + 1;
        });
        setProgressCount(prog);
      }
    }

    setLoading(false);
  };

  return (
    <AppLayout>
      <AnimatedPage>
        <div className="px-4 py-6 md:px-16 md:py-8">
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="mb-6 md:mb-8">
            <h1 className="font-display text-2xl md:text-4xl font-semibold text-foreground">Desafios</h1>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">Participe dos desafios e transforme seus hábitos!</p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 rounded-2xl shimmer" />)}
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">Nenhum desafio disponível no momento.</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {challenges.map((c, i) => {
                const released = releasedCount[c.id] || 0;
                const completed = progressCount[c.id] || 0;
                const progressPct = c.total_dias > 0 ? Math.round((completed / c.total_dias) * 100) : 0;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4, ease: [0, 0, 0.2, 1] }}
                  >
                    <Link
                      to={`/app/desafios/${c.id}`}
                      className="group block rounded-2xl border border-border bg-card overflow-hidden shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(34,197,94,0.12)] hover:border-primary/30"
                    >
                      {/* Cover image */}
                      <div className="relative h-52 overflow-hidden">
                        {c.imagem_capa_url ? (
                          <img src={c.imagem_capa_url} alt={c.titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-primary/20 via-accent to-primary/10 flex items-center justify-center">
                            <Trophy className="h-14 w-14 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        
                        {/* Badge */}
                        {released > 0 && (
                          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground shadow-md">
                            <Unlock className="h-3 w-3 mr-1" />
                            {released} dias liberados
                          </Badge>
                        )}

                        {/* Title overlay on image */}
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="font-display text-2xl font-bold text-white drop-shadow-lg leading-tight">{c.titulo}</h3>
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">{c.descricao}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{c.total_dias} dias</span>
                        </div>
                        {completed > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{completed}/{c.total_dias} concluídos</span>
                              <span className="font-semibold text-primary">{progressPct}%</span>
                            </div>
                            <Progress value={progressPct} className="h-1.5" />
                          </div>
                        )}
                        <Button size="sm" className="w-full btn-ripple group-hover:shadow-md transition-shadow">
                          Ver desafio <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </AnimatedPage>
    </AppLayout>
  );
}
