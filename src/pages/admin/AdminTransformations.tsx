import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Check, X } from 'lucide-react';

interface Transformation {
  id: string; user_id: string; foto_antes_url: string; foto_depois_url: string;
  descricao: string; aprovado: boolean; criado_em: string; nome_completo: string;
}

export default function AdminTransformations() {
  const [items, setItems] = useState<Transformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('transformacoes').select('*').order('criado_em', { ascending: false });
      if (error) throw error;
      if (!data?.length) { setItems([]); return; }
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, nome_completo').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.nome_completo || 'Usuário']) || []);
      setItems(data.map(t => ({ ...t, nome_completo: profileMap.get(t.user_id) || 'Usuário' })));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar transformações');
    } finally { setLoading(false); }
  };

  const setApproval = async (id: string, approved: boolean) => {
    setProcessing(id);
    try {
      const { error } = await supabase.from('transformacoes').update({ aprovado: approved }).eq('id', id);
      if (error) throw error;
      toast.success(approved ? 'Aprovada!' : 'Rejeitada');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    } finally { setProcessing(null); }
  };

  const deleteTransformation = async (id: string) => {
    setProcessing(id);
    try {
      const { error } = await supabase.from('transformacoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Removida');
      await load();
    } catch (err: any) { toast.error(err.message || 'Erro'); } finally { setProcessing(null); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-foreground mb-8">Transformações</h1>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Nenhuma transformação enviada.</p>
      ) : (
        <div className="space-y-4">
          {items.map(t => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex gap-4">
                <img src={t.foto_antes_url} alt="Antes" className="h-24 w-24 rounded-xl object-cover" />
                <img src={t.foto_depois_url} alt="Depois" className="h-24 w-24 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{t.nome_completo}</p>
                  <p className="text-sm text-muted-foreground">{t.descricao}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${t.aprovado ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}>
                    {t.aprovado ? 'Aprovado' : 'Pendente'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {!t.aprovado && (
                    <Button size="sm" onClick={() => setApproval(t.id, true)} disabled={processing === t.id}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {t.aprovado && (
                    <Button size="sm" variant="outline" onClick={() => setApproval(t.id, false)} disabled={processing === t.id}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteTransformation(t.id)} disabled={processing === t.id}
                    className="text-destructive hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
