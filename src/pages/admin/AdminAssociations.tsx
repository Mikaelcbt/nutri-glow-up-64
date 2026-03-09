import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, UserPlus, UserMinus } from 'lucide-react';

interface Product { id: string; nome: string; }
interface Association {
  id: string;
  user_id: string;
  product_id: string;
  status: string;
  data_inicio: string;
  data_fim: string | null;
  user_email?: string;
  user_nome?: string;
}

export default function AdminAssociations() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<{ id: string; nome_completo: string; email?: string } | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');

  useEffect(() => {
    supabase.from('products').select('id, nome').order('nome').then(({ data }) => { if (data) setProducts(data); });
  }, []);

  const searchUser = async () => {
    // Search by email in auth - we need to search profiles or use a workaround
    // Since we can't query auth.users directly, search profiles by looking up the email
    const { data: users } = await supabase.auth.admin.listUsers?.() || { data: null };
    
    // Fallback: search profiles by nome_completo containing the search term
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome_completo')
      .ilike('nome_completo', `%${searchEmail}%`)
      .limit(5);

    if (profiles?.length) {
      setFoundUser(profiles[0]);
      loadUserAssociations(profiles[0].id);
    } else {
      toast.error('Usuário não encontrado. Tente buscar pelo nome.');
      setFoundUser(null);
      setAssociations([]);
    }
  };

  const loadUserAssociations = async (userId: string) => {
    const { data } = await supabase
      .from('associacoes')
      .select('*')
      .eq('user_id', userId);
    if (data) setAssociations(data);
  };

  const grantAccess = async () => {
    if (!foundUser || !selectedProduct) return;
    const { error } = await supabase.from('associacoes').upsert({
      user_id: foundUser.id,
      product_id: selectedProduct,
      status: 'ativo',
      data_inicio: new Date().toISOString(),
    }, { onConflict: 'user_id,product_id' });

    if (error) { toast.error(error.message); return; }
    toast.success('Acesso concedido!');
    loadUserAssociations(foundUser.id);
  };

  const revokeAccess = async (assocId: string) => {
    const { error } = await supabase.from('associacoes').update({ status: 'inativo' }).eq('id', assocId);
    if (error) { toast.error(error.message); return; }
    toast.success('Acesso revogado');
    if (foundUser) loadUserAssociations(foundUser.id);
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl tracking-wide mb-8">ASSOCIAÇÕES</h1>

      <div className="flex gap-3 mb-8">
        <Input
          placeholder="Buscar por nome do usuário..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchUser()}
          className="max-w-sm bg-secondary border-border"
        />
        <Button onClick={searchUser}><Search className="mr-2 h-4 w-4" /> Buscar</Button>
      </div>

      {foundUser && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">{foundUser.nome_completo}</h3>
            <p className="text-xs text-muted-foreground">ID: {foundUser.id}</p>
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
            <Button onClick={grantAccess} disabled={!selectedProduct}><UserPlus className="mr-2 h-4 w-4" /> Conceder</Button>
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
                      <Button variant="ghost" size="sm" onClick={() => revokeAccess(a.id)} className="text-destructive">
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
