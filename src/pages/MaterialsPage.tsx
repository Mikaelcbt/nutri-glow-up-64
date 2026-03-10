import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { FileText, Download, Loader2, File, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Material {
  id: string; product_id: string | null; titulo: string; descricao: string;
  arquivo_url: string; tipo: string; criado_em: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-8 w-8 text-destructive" />,
  planilha: <Table className="h-8 w-8 text-primary" />,
  outro: <File className="h-8 w-8 text-muted-foreground" />,
};

export default function MaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadMaterials(); }, [user]);

  const loadMaterials = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get user's active product IDs
      const { data: assocs } = await supabase.from('associacoes').select('product_id')
        .eq('user_id', user.id).eq('status', 'ativo');
      const productIds = assocs?.map(a => a.product_id) || [];

      // Fetch materials: product_id IS NULL (global) OR product_id in user's associations
      let query = supabase.from('materiais').select('*').order('criado_em', { ascending: false });
      if (productIds.length > 0) {
        query = query.or(`product_id.is.null,product_id.in.(${productIds.join(',')})`);
      } else {
        query = query.is('product_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar materiais');
    } finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-semibold text-foreground mb-8">Materiais</h1>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : materials.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 text-border" />
            <p>Nenhum material disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(m => (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-6 shadow-card flex flex-col gap-4 transition-all duration-200 hover:shadow-soft">
                <div>{typeIcons[m.tipo] || typeIcons.outro}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{m.titulo}</h3>
                  {m.descricao && <p className="text-sm text-muted-foreground mt-1">{m.descricao}</p>}
                </div>
                <Button asChild variant="outline" size="sm" className="border-primary text-primary hover:bg-accent">
                  <a href={m.arquivo_url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" /> Baixar
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
