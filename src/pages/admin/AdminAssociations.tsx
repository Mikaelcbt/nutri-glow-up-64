import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, UserPlus, UserMinus, Loader2 } from 'lucide-react';

interface Product { id: string; nome: string; }
interface Association {
  id: string;
  user_id: string;
  product_id: string;
  status: string;
  data_inicio: string;
  data_fim: string | null;
}

interface FoundUser {
  id: string;
  nome_completo: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
};

export default function AdminAssociations() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUsers, setFoundUsers] = useState<FoundUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [pageError, setPageError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    void loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    setPageError('');

    try {
      const { data, error } = await supabase.from('products').select('id, nome').order('nome');
      if (error) throw error;
      setProducts(data ?? []);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao carregar produtos.');
      console.error('Erro ao carregar produtos:', error);
      setPageError(message);
      setProducts([]);
      toast.error(message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const searchUser = async () => {
    if (!searchTerm.trim()) {
      const message = 'Digite um nome ou e-mail para buscar.';
      setPageError(message);
      toast.error(message);
      return;
    }

    setSearching(true);
    setPageError('');

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .ilike('nome_completo', `%${searchTerm.trim()}%`)
        .limit(10);

      if (error) throw error;

      if (!profiles?.length) {
        setFoundUsers([]);
        setSelectedUser(null);
        setAssociations([]);
        toast.error('Nenhum usuário encontrado.');
        return;
      }

      const users: FoundUser[] = profiles.map((profile) => ({
        id: profile.id,
        nome_completo: profile.nome_completo || 'Sem nome',
      }));

      setFoundUsers(users);

      if (users.length === 1) {
        await selectUser(users[0]);
      } else {
        setSelectedUser(null);
        setAssociations([]);
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao buscar usuário.');
      console.error('Erro ao buscar usuário:', error);
      setPageError(message);
      setFoundUsers([]);
      setSelectedUser(null);
      setAssociations([]);
      toast.error(message);
    } finally {
      setSearching(false);
    }
  };

  const selectUser = async (user: FoundUser) => {
    setSelectedUser(user);
    await loadUserAssociations(user.id);
  };

  const loadUserAssociations = async (userId: string) => {
    setPageError('');

    try {
      const { data, error } = await supabase
        .from('associacoes')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setAssociations(data ?? []);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao carregar associações do usuário.');
      console.error('Erro ao carregar associações:', error);
      setPageError(message);
      setAssociations([]);
      toast.error(message);
    }
  };

  const grantAccess = async () => {
    if (!selectedUser || !selectedProduct) {
      const message = 'Selecione um usuário e um produto antes de conceder acesso.';
      setPageError(message);
      toast.error(message);
      return;
    }

    setGranting(true);
    setPageError('');

    try {
      const { data, error } = await supabase
        .from('associacoes')
        .upsert({
          user_id: selectedUser.id,
          product_id: selectedProduct,
          status: 'ativo',
          data_inicio: new Date().toISOString(),
          data_fim: null,
        }, { onConflict: 'user_id,product_id' })
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Não foi possível conceder acesso. Verifique a permissão de admin no RLS.');

      toast.success('Acesso concedido com sucesso!');
      await loadUserAssociations(selectedUser.id);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao conceder acesso.');
      console.error('Erro ao conceder acesso:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setGranting(false);
    }
  };

  const revokeAccess = async (assocId: string) => {
    if (!selectedUser) return;

    setRevokingId(assocId);
    setPageError('');

    try {
      const { data, error } = await supabase
        .from('associacoes')
        .update({ status: 'inativo', data_fim: new Date().toISOString() })
        .eq('id', assocId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Não foi possível revogar o acesso. Verifique a permissão de admin no RLS.');

      toast.success('Acesso revogado com sucesso!');
      await loadUserAssociations(selectedUser.id);
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao revogar acesso.');
      console.error('Erro ao revogar acesso:', error);
      setPageError(message);
      toast.error(message);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl tracking-wide mb-8">ASSOCIAÇÕES</h1>

      {pageError && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void searchUser()}
          className="max-w-sm bg-secondary border-border"
        />
        <Button onClick={() => void searchUser()} disabled={searching}>
          {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Buscar
        </Button>
      </div>

      {foundUsers.length > 1 && !selectedUser && (
        <div className="mb-6 space-y-2">
          <p className="text-sm text-muted-foreground">Selecione um usuário:</p>
          {foundUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => void selectUser(user)}
              className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors"
            >
              <span className="font-semibold">{user.nome_completo}</span>
              <span className="block text-xs text-muted-foreground mt-1">{user.email || `ID: ${user.id}`}</span>
            </button>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">{selectedUser.nome_completo}</h3>
            <p className="text-xs text-muted-foreground">{selectedUser.email || `ID: ${selectedUser.id}`}</p>
          </div>

          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conceder acesso a:</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-64 bg-secondary border-border" disabled={loadingProducts}><SelectValue placeholder={loadingProducts ? 'Carregando produtos...' : 'Selecione um produto'} /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {products.map((product) => <SelectItem key={product.id} value={product.id}>{product.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantAccess} disabled={!selectedProduct || granting}>
              {granting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Conceder
            </Button>
          </div>

          <div>
            <h4 className="font-display text-xl mb-3">ACESSOS ATUAIS</h4>
            <div className="space-y-2">
              {associations.map((association) => {
                const productName = products.find((product) => product.id === association.product_id)?.nome || association.product_id;
                const isRevoking = revokingId === association.id;

                return (
                  <div key={association.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <span className="font-semibold">{productName}</span>
                      <span className={`ml-3 text-xs px-2 py-0.5 rounded ${association.status === 'ativo' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                        {association.status}
                      </span>
                    </div>
                    {association.status === 'ativo' && (
                      <Button variant="ghost" size="sm" onClick={() => void revokeAccess(association.id)} disabled={isRevoking} className="text-destructive hover:text-destructive">
                        {isRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                );
              })}
              {!associations.length && <p className="text-sm text-muted-foreground">Nenhum acesso.</p>}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
