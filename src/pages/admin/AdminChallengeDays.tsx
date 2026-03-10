import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, Unlock, Lock, Edit, Trophy } from 'lucide-react';

interface DayData {
  id: string;
  desafio_id: string;
  numero_dia: number;
  titulo: string;
  liberado: boolean;
}

interface Challenge {
  id: string;
  titulo: string;
  total_dias: number;
}

export default function AdminChallengeDays() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);

    const { data: ch, error: chErr } = await supabase.from('desafios').select('id, titulo, total_dias').eq('id', id!).single();
    if (chErr || !ch) { toast.error('Desafio não encontrado'); navigate('/admin/desafios'); return; }
    setChallenge(ch);

    let { data: daysData, error: dErr } = await supabase.from('desafio_dias').select('id, desafio_id, numero_dia, titulo, liberado').eq('desafio_id', id!).order('numero_dia');
    if (dErr) { toast.error('Erro ao carregar dias'); setLoading(false); return; }

    // Auto-create missing days
    if (!daysData || daysData.length < ch.total_dias) {
      const existingNums = new Set((daysData || []).map(d => d.numero_dia));
      const missing = Array.from({ length: ch.total_dias }, (_, i) => i + 1)
        .filter(n => !existingNums.has(n))
        .map(n => ({ desafio_id: ch.id, numero_dia: n, titulo: `Dia ${n}`, liberado: false }));

      if (missing.length > 0) {
        const { data: created, error: cErr } = await supabase.from('desafio_dias').insert(missing).select('id, desafio_id, numero_dia, titulo, liberado');
        if (!cErr && created) {
          daysData = [...(daysData || []), ...created].sort((a, b) => a.numero_dia - b.numero_dia);
          toast.success(`${missing.length} dia(s) criado(s) automaticamente`);
        }
      }
    }

    setDays(daysData || []);
    setLoading(false);
  };

  const notifyUsers = async (dayNum: number) => {
    if (!challenge) return;
    const { data: users } = await supabase.from('profiles').select('id');
    if (!users?.length) return;
    const notifications = users.map(u => ({
      user_id: u.id, titulo: '🔓 Novo dia liberado!',
      mensagem: `Dia ${dayNum} do desafio "${challenge.titulo}" já está disponível!`,
      link: `/app/desafios/${challenge.id}/dia/${dayNum}`, lida: false,
    }));
    await supabase.from('notificacoes').insert(notifications);
  };

  const toggleDay = async (day: DayData) => {
    const newVal = !day.liberado;
    const { error } = await supabase.from('desafio_dias').update({ liberado: newVal }).eq('id', day.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setDays(prev => prev.map(d => d.id === day.id ? { ...d, liberado: newVal } : d));
    if (newVal) await notifyUsers(day.numero_dia);
    toast.success(newVal ? `Dia ${day.numero_dia} liberado!` : `Dia ${day.numero_dia} bloqueado`);
  };

  const bulkToggle = async (liberado: boolean) => {
    const { error } = await supabase.from('desafio_dias').update({ liberado }).eq('desafio_id', id!);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setDays(prev => prev.map(d => ({ ...d, liberado })));
    toast.success(liberado ? 'Todos os dias liberados!' : 'Todos os dias bloqueados');
  };

  const releaseNext = async () => {
    const next = days.find(d => !d.liberado);
    if (!next) { toast.info('Todos já estão liberados'); return; }
    const { error } = await supabase.from('desafio_dias').update({ liberado: true }).eq('id', next.id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setDays(prev => prev.map(d => d.id === next.id ? { ...d, liberado: true } : d));
    await notifyUsers(next.numero_dia);
    toast.success(`Dia ${next.numero_dia} liberado!`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/desafios')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{challenge?.titulo || 'Carregando...'}</h1>
            <p className="text-sm text-muted-foreground">{challenge?.total_dias} dias • {days.filter(d => d.liberado).length} liberados</p>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={releaseNext}><ChevronRight className="h-4 w-4 mr-1" /> Liberar próximo dia</Button>
          <Button variant="outline" size="sm" onClick={() => bulkToggle(true)}><Unlock className="h-4 w-4 mr-1" /> Liberar todos</Button>
          <Button variant="outline" size="sm" onClick={() => bulkToggle(false)}><Lock className="h-4 w-4 mr-1" /> Bloquear todos</Button>
        </div>

        {/* Days grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : days.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum dia encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {days.map(day => (
              <div key={day.id} className={`relative rounded-xl border p-4 text-center space-y-2 transition-all hover:shadow-md ${day.liberado ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'}`}>
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${day.liberado ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {day.numero_dia}
                </div>
                <p className="text-xs text-muted-foreground truncate">{day.titulo || 'Sem título'}</p>
                <Badge variant={day.liberado ? 'default' : 'secondary'} className="text-[10px]">
                  {day.liberado ? 'Liberado' : 'Bloqueado'}
                </Badge>
                <div className="flex items-center justify-center">
                  <Switch checked={day.liberado} onCheckedChange={() => toggleDay(day)} />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => navigate(`/admin/desafios/${id}/dias/${day.numero_dia}`)}
                >
                  <Edit className="h-3 w-3 mr-1" /> Editar conteúdo
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
