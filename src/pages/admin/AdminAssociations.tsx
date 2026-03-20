import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search, Loader2, Check, X, Calendar, ChevronRight,
  Shield, ShieldOff, Eye, UserCog, Mail, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Product { id: string; nome: string; }
interface AuthInfo { email: string; created_at: string; last_sign_in_at: string | null; }
interface UserProfile { id: string; nome_completo: string; criado_em?: string; }
interface Association { id: string; user_id: string; product_id: string; status: string; data_inicio: string; }

export default function AdminAssociations() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [authInfoMap, setAuthInfoMap] = useState<Record<string, AuthInfo>>({});
  const [associations, setAssociations] = useState<Association[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [grantProductId, setGrantProductId] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: prods }, { data: profiles }, { data: assocs }] = await Promise.all([
      supabase.from('products').select('id, nome').order('nome'),
      supabase.from('profiles').select('id, nome_completo, criado_em').order('nome_completo'),
      supabase.from('associacoes').select('id, user_id, product_id, status, data_inicio'),
    ]);
    setProducts(prods ?? []);
    setUsers(profiles ?? []);
    setAssociations(assocs ?? []);

    // Fetch emails from edge function
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (token) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'zpubzpnzdyhqrvoahkwj';
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/admin-list-users`,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (res.ok) {
          const json = await res.json();
          setAuthInfoMap(json.users || {});
        }
      }
    } catch {
      // Edge function may not be deployed yet — emails will show as fallback
    }

    setLoading(false);
  };

  const getAssoc = (userId: string, productId: string) =>
    associations.find(a => a.user_id === userId && a.product_id === productId);

  const getUserAssocs = (userId: string) =>
    associations.filter(a => a.user_id === userId);

  const getUserStatus = (userId: string): 'ativo' | 'revogado' | 'sem_acesso' => {
    const userAssocs = getUserAssocs(userId);
    if (userAssocs.length === 0) return 'sem_acesso';
    if (userAssocs.some(a => a.status === 'ativo')) return 'ativo';
    return 'revogado';
  };

  const statusConfig = {
    ativo: { label: 'Ativo', className: 'bg-primary/15 text-primary border-primary/30' },
    revogado: { label: 'Revogado', className: 'bg-destructive/15 text-destructive border-destructive/30' },
    sem_acesso: { label: 'Sem acesso', className: 'bg-muted text-muted-foreground border-border' },
  };

  const toggleAccess = async (userId: string, productId: string) => {
    const key = `${userId}-${productId}`;
    setToggling(key);
    const existing = getAssoc(userId, productId);

    try {
      if (existing && existing.status === 'ativo') {
        const { error } = await supabase.from('associacoes')
          .update({ status: 'inativo', data_fim: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Acesso revogado');
      } else if (existing) {
        const { error } = await supabase.from('associacoes')
          .update({ status: 'ativo', data_inicio: new Date().toISOString(), data_fim: null })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Acesso reativado');
      } else {
        const { error } = await supabase.from('associacoes')
          .insert({ user_id: userId, product_id: productId, status: 'ativo', data_inicio: new Date().toISOString() });
        if (error) throw error;
        toast.success('Acesso concedido');
      }
      const { data: assocs } = await supabase.from('associacoes').select('id, user_id, product_id, status, data_inicio');
      setAssociations(assocs ?? []);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar acesso');
    } finally {
      setToggling(null);
    }
  };

  const grantAccess = async (userId: string) => {
    if (!grantProductId) return;
    await toggleAccess(userId, grantProductId);
    setGrantProductId('');
  };

  const getEmail = (userId: string) => authInfoMap[userId]?.email || null;
  const getCreatedAt = (userId: string) => authInfoMap[userId]?.created_at || null;
  const getLastSignIn = (userId: string) => authInfoMap[userId]?.last_sign_in_at || null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatDateTime = (d: string | null | undefined) => {
    if (!d) return 'Nunca';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filtered = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const email = getEmail(u.id) || '';
    return u.nome_completo?.toLowerCase().includes(term) || email.toLowerCase().includes(term);
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl tracking-wide mb-8">GESTÃO DE ACESSOS</h1>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
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
        <div
          className="grid gap-0 bg-secondary/80 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ gridTemplateColumns: `minmax(320px, 2fr) 100px repeat(${products.length}, 1fr) 80px` }}
        >
          <div>Usuário</div>
          <div className="text-center">Status</div>
          {products.map(p => <div key={p.id} className="text-center">{p.nome}</div>)}
          <div className="text-center">Ações</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {filtered.map((user, i) => {
            const status = getUserStatus(user.id);
            const cfg = statusConfig[status];
            const email = getEmail(user.id);
            const createdAt = getCreatedAt(user.id) || user.criado_em;

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="grid gap-0 p-4 items-center hover:bg-secondary/30 transition-colors"
                style={{ gridTemplateColumns: `minmax(320px, 2fr) 100px repeat(${products.length}, 1fr) 80px` }}
              >
                {/* User info */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.nome_completo || 'Sem nome'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" />
                    {email || 'Carregando...'}
                  </p>
                  {createdAt && (
                    <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-2.5 w-2.5 shrink-0" />
                      Cadastro: {formatDate(createdAt)}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex justify-center">
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${cfg.className}`}>
                    {cfg.label}
                  </Badge>
                </div>

                {/* Product access toggles */}
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
                        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                            : isRevoked
                              ? 'bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {isToggling
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : isActive
                            ? <Check className="h-4 w-4" />
                            : <X className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  );
                })}

                {/* Actions */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors active:scale-95"
                  >
                    <UserCog className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <UserCog className="h-5 w-5 text-primary" />
                  Gerenciar Usuário
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-2">
                {/* User info card */}
                <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-2">
                  <p className="font-semibold text-foreground">
                    {selectedUser.nome_completo || 'Sem nome'}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {getEmail(selectedUser.id) || '—'}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Cadastro: {formatDate(getCreatedAt(selectedUser.id) || selectedUser.criado_em)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Último acesso: {formatDateTime(getLastSignIn(selectedUser.id))}
                    </span>
                  </div>
                  <div className="pt-1">
                    <Badge variant="outline" className={`text-[10px] ${statusConfig[getUserStatus(selectedUser.id)].className}`}>
                      {statusConfig[getUserStatus(selectedUser.id)].label}
                    </Badge>
                  </div>
                </div>

                {/* Current access */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    Acessos do usuário
                  </h3>
                  <div className="space-y-2">
                    {products.map(prod => {
                      const assoc = getAssoc(selectedUser.id, prod.id);
                      const isActive = assoc?.status === 'ativo';
                      const isRevoked = assoc?.status === 'inativo';
                      const key = `${selectedUser.id}-${prod.id}`;
                      const isToggling = toggling === key;

                      return (
                        <div
                          key={prod.id}
                          className="flex items-center justify-between rounded-lg border border-border p-3 bg-background"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{prod.nome}</p>
                            {assoc?.data_inicio && isActive && (
                              <p className="text-[10px] text-muted-foreground">
                                Desde {formatDate(assoc.data_inicio)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                isActive
                                  ? 'bg-primary/15 text-primary border-primary/30'
                                  : isRevoked
                                    ? 'bg-destructive/15 text-destructive border-destructive/30'
                                    : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {isActive ? 'Ativo' : isRevoked ? 'Revogado' : 'Sem acesso'}
                            </Badge>
                            <Button
                              size="sm"
                              variant={isActive ? 'destructive' : 'default'}
                              disabled={isToggling}
                              onClick={() => toggleAccess(selectedUser.id, prod.id)}
                              className="h-7 text-xs gap-1"
                            >
                              {isToggling ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isActive ? (
                                <><ShieldOff className="h-3 w-3" /> Revogar</>
                              ) : (
                                <><Shield className="h-3 w-3" /> Liberar</>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick grant */}
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    Liberar acesso rápido
                  </h3>
                  <div className="flex gap-2">
                    <Select value={grantProductId} onValueChange={setGrantProductId}>
                      <SelectTrigger className="flex-1 bg-background">
                        <SelectValue placeholder="Selecione um produto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter(p => getAssoc(selectedUser.id, p.id)?.status !== 'ativo')
                          .map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => grantAccess(selectedUser.id)}
                      disabled={!grantProductId || !!toggling}
                      className="gap-1"
                    >
                      {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Liberar
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
