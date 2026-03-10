import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Loader2, Users, Package, BookOpen, Link as LinkIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DailySignup { date: string; count: number; }
interface RecentUser { id: string; nome_completo: string; criado_em: string; }

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ users: 0, products: 0, lessons: 0, associations: 0 });
  const [dailySignups, setDailySignups] = useState<DailySignup[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, productsRes, lessonsRes, assocsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase.from('associacoes').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
      ]);

      setMetrics({
        users: usersRes.count || 0,
        products: productsRes.count || 0,
        lessons: lessonsRes.count || 0,
        associations: assocsRes.count || 0,
      });

      // Recent users
      const { data: recent } = await supabase.from('profiles')
        .select('id, nome_completo, criado_em')
        .order('criado_em', { ascending: false }).limit(5);
      setRecentUsers(recent || []);

      // Daily signups last 7 days
      const { data: allProfiles } = await supabase.from('profiles')
        .select('criado_em').order('criado_em', { ascending: false }).limit(500);
      
      if (allProfiles) {
        const now = new Date();
        const days: DailySignup[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const count = allProfiles.filter(p => p.criado_em?.startsWith(dateStr)).length;
          days.push({ date: dateStr.slice(5), count });
        }
        setDailySignups(days);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const cards = [
    { label: 'Total de alunos', value: metrics.users, icon: Users, color: 'text-primary' },
    { label: 'Programas ativos', value: metrics.products, icon: Package, color: 'text-primary' },
    { label: 'Aulas criadas', value: metrics.lessons, icon: BookOpen, color: 'text-primary' },
    { label: 'Acessos ativos', value: metrics.associations, icon: LinkIcon, color: 'text-primary' },
  ];

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-foreground mb-8">Dashboard</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <p className="font-display text-3xl font-semibold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Novos cadastros (últimos 7 dias)</h3>
          {dailySignups.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailySignups}>
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(142, 72%, 46%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          )}
        </div>

        {/* Recent users */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Últimos cadastros</h3>
          <div className="space-y-3">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {(u.nome_completo || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.nome_completo || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : ''}
                  </p>
                </div>
              </div>
            ))}
            {!recentUsers.length && <p className="text-sm text-muted-foreground">Nenhum usuário.</p>}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}