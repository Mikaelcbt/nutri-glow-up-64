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
  email: string;
}

export default function AdminAssociations() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUsers, setFoundUsers] = useState<FoundUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    supabase.from('products').select('id, nome').order('nome').then(({ data, error }) => {
      if (error) toast.error('Erro: ' + error.message);
      if (data) setProducts(data);
    });
  }, []);

  const searchUser = async () => {
    if (!searchTerm.trim()) { toast.error('Digite um nome ou e-mail para buscar'); return; }
    setSearching(true);
    
    try {
      // Search profiles by nome_completo
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .ilike('nome_completo', `%${searchTerm}%`)
        .limit(10);

      if (error) { toast.error('Erro na busca: ' + error.message); return; }

      if (!profiles?.length) {
        toast.error('Nenhum usuário encontrado');
        setFoundUsers([]);
        setSelectedUser(null);
        setAssociations([]);
        return;
      }

      // Map profiles with user metadata for email display
      const users: FoundUser[] = profiles.map(p => ({
        id: p.id,
        nome_completo: p.nome_completo || 'Sem nome',
        email: '', // Will be shown from profile data
      }));

      setFoundUsers(users);
      
      // Auto-select if only one result
      if (users.length === 1) {
        selectUser(users[0]);
      } else {
        setSelectedUser(null);
        setAssociations([]);
      }
    } finally {
      setSearching(false);
    }
  };

  const selectUser = (user: FoundUser) => {
    setSelectedUser(user);
    loadUserAssociations(user.id);
  };

  const loadUserAssociations = async (userId: string) => {
    const { data, error } = await supabase
      .from('associacoes')
      .select('*')
      .eq('user_id', userId);
    if (error) toast.error('Erro: ' + error.message);
    if (data) setAssociations(data);
  };

  const grantAccess = async () => {
    if (!selectedUser || !selectedProduct) return;
    setGranting(true);
    try {
      const { error } = await supabase.from('associacoes').upsert({
        user_id: selectedUser.id,
        product_id: selectedProduct,
        status: 'ativo',
        data_inicio: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' });

      if (error) { toast.error('Erro: ' + error.message); return; }
      toast.success('Acesso concedido!');
      loadUserAssociations(selectedUser.id);
    } finally { setGranting(false); }
  };

  const revokeAccess = async (assocId: string) => {
    const { error } = await supabase.from('associacoes').update({ status: 'inativo' }).eq('id', assocId);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Acesso revogado');
    if (selectedUser) loadUserAssociations(selectedUser.id);
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl tracking-wide mb-8">ASSOCIAÇÕES</h1>

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Buscar por nome do usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchUser()}
          className="max-w-sm bg-secondary border-border"
        />
        <Button onClick={searchUser} disabled={searching}>
          {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Buscar
        </Button>
      </div>

      {/* Search results */}
      {foundUsers.length > 1 && !selectedUser && (
        <div className="mb-6 space-y-2">
          <p className="text-sm text-muted-foreground">Selecione um usuário:</p>
          {foundUsers.map(u => (
            <button
              key={u.id}
              onClick={() => selectUser(u)}
              className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/50 transition-colors"
            >
              <span className="font-semibold">{u.nome_completo}</span>
              <span className="text-xs text-muted-foreground ml-2">ID: {u.id.slice(0, 8)}...</span>
            </button>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">{selectedUser.nome_completo}</h3>
            <p className="text-xs text-muted-foreground">ID: {selectedUser.id}</p>
          </div>

          {/* Grant access */}
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conceder acesso a:</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-64 bg-secondary border-border"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={grantAccess} disabled={!selectedProduct || granting}>
              {granting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Conceder
            </Button>
          </div>

          {/* Current associations */}
          <div>
            <h4 className="font-display text-xl mb-3">ACESSOS ATUAIS</h4>
            <div className="space-y-2">
              {associations.map(a => {
                const productName = products.find(p => p.id === a.product_id)?.nome || a.product_id;
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <span className="font-semibold">{productName}</span>
                      <span className={`ml-3 text-xs px-2 py-0.5 rounded ${a.status === 'ativo' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                        {a.status}
                      </span>
                    </div>
                    {a.status === 'ativo' && (
                      <Button variant="ghost" size="sm" onClick={() => revokeAccess(a.id)} className="text-destructive hover:text-destructive">
                        <UserMinus className="h-4 w-4" />
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
