import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Progress } from '@/components/ui/progress';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [programs, setPrograms] = useState<{ nome: string; progress: number }[]>([]);

  useEffect(() => {
    if (user) loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;

    const { data: assocs } = await supabase
      .from('associacoes')
      .select('product_id')
      .eq('user_id', user.id)
      .eq('status', 'ativo');

    if (!assocs?.length) return;

    const results: { nome: string; progress: number }[] = [];

    for (const assoc of assocs) {
      const { data: product } = await supabase
        .from('products')
        .select('id, nome')
        .eq('id', assoc.product_id)
        .maybeSingle();

      if (!product) continue;

      const { data: mods } = await supabase
        .from('modules')
        .select('id')
        .eq('product_id', product.id);

      const modIds = mods?.map(m => m.id) || [];
      if (!modIds.length) { results.push({ nome: product.nome, progress: 0 }); continue; }

      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', modIds);

      const totalLessons = lessons?.length || 0;
      if (!totalLessons) { results.push({ nome: product.nome, progress: 0 }); continue; }

      const { data: prog } = await supabase
        .from('rastreamento_progresso')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('concluido', true)
        .in('lesson_id', lessons!.map(l => l.id));

      const done = prog?.length || 0;
      results.push({ nome: product.nome, progress: (done / totalLessons) * 100 });
    }

    setPrograms(results);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center mb-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <h1 className="font-display text-3xl">{profile?.nome_completo || 'Usuário'}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <h2 className="font-display text-2xl mb-6 tracking-wide">MEUS PROGRAMAS</h2>
        {programs.length > 0 ? (
          <div className="space-y-4">
            {programs.map((p, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{p.nome}</h3>
                  <span className="text-sm text-primary font-semibold">{Math.round(p.progress)}%</span>
                </div>
                <Progress value={p.progress} className="h-2" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhum programa ativo.</p>
        )}
      </div>
    </AppLayout>
  );
}
