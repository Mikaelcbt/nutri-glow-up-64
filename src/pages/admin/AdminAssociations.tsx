import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Loader2, Check, X, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Product { id: string; nome: string; }
interface UserProfile { id: string; nome_completo: string; email: string; }
interface Association { id: string; user_id: string; product_id: string; status: string; data_inicio: string; }

export default function AdminAssociations() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: prods }, { data: profiles }, { data: assocs }] = await Promise.all([
      supabase.from('products').select('id, nome').order('nome'),
      supabase.from('profiles').select('id, nome_completo, email').order('nome_completo'),
      supabase.from('associacoes').select('id, user_id, product_id, status, data_inicio'),
    ]);
    setProducts(prods ?? []);
    setUsers(profiles ?? []);
    setAssociations(assocs ?? []);
    setLoading(false);
  };

  const getAssoc = (userId: string, productId: string) =>
    associations.find(a => a.user_id === userId && a.product_id === productId);

  const toggleAccess = async (userId: string, productId: string) => {
    const key = `${userId}-${productId}`;
    setToggling(key);
    const existing = getAssoc(userId, productId);

    try {
      if (existing && existing.status === 'ativo') {
        // Revoke
        const { error } = await supabase.from('associacoes')
          .update({ status: 'inativo', data_fim: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Acesso revogado');
      } else if (existing) {
        // Reactivate
        const { error } = await supabase.from('associacoes')
          .update({ status: 'ativo', data_inicio: new Date().toISOString(), data_fim: null })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Acesso reativado');
      } else {
        // Grant new
        const { error } = await supabase.from('associacoes')
          .insert({ user_id: userId, product_id: productId, status: 'ativo', data_inicio: new Date().toISOString() });
        if (error) throw error;
        toast.success('Acesso concedido');
      }
      // Reload associations
      const { data: assocs } = await supabase.from('associacoes').select('id, user_id, product_id, status, data_inicio');
      setAssociations(assocs ?? []);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar acesso');
    } finally {
      setToggling(null);
    }
  };

  const filtered = users.filter(u =>
    u.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl tracking-wide mb-8">GESTÃO DE ACESSOS</h1>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>
        <span className="text-sm text-muted-foreground self-center">{filtered.length} usuários</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-primary" /> Ativo</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-muted" /> Sem acesso</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-destructive" /> Revogado</span>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid gap-0 bg-secondary/80 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}
        >
          <div>Usuário</div>
          {products.map(p => <div key={p.id} className="text-center">{p.nome}</div>)}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {filtered.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.5) }}
              className="grid gap-0 p-4 items-center hover:bg-secondary/30 transition-colors"
              style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}
            >
              <div>
                <p className="text-sm font-semibold text-foreground truncate">{user.nome_completo || 'Sem nome'}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email || 'Sem e-mail'}</p>
              </div>
              {products.map(prod => {
                const assoc = getAssoc(user.id, prod.id);
                const isActive = assoc?.status === 'ativo';
                const isRevoked = assoc?.status === 'inativo';
                const key = `${user.id}-${prod.id}`;
                const isToggling = toggling === key;

                return (
                  <div key={prod.id} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => toggleAccess(user.id, prod.id)}
                      disabled={isToggling}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-90 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                          : isRevoked
                            ? 'bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                    {assoc?.data_inicio && isActive && (
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(assoc.data_inicio).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
