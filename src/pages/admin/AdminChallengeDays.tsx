import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { sendPushToAllUsers } from '@/lib/pushNotifications';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, Unlock, Lock, Edit, Trophy, AlertCircle } from 'lucide-react';

interface DayData {
  id: string;
  desafio_id: string;
  numero_dia: number;
  titulo: string;
  liberado: boolean;
  imagem_url?: string;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const { data: ch, error: chErr } = await supabase
      .from('desafios')
      .select('id, titulo, total_dias')
      .eq('id', id!)
      .single();

    if (chErr || !ch) {
      setError('Desafio não encontrado: ' + (chErr?.message || 'ID inválido'));
      toast.error('Desafio não encontrado');
      setLoading(false);
      return;
    }
    setChallenge(ch);

    const { data: daysData, error: dErr } = await supabase
      .from('desafio_dias')
      .select('*')
      .eq('desafio_id', id!)
      .order('numero_dia', { ascending: true });

    if (dErr) {
      console.error('Erro ao buscar dias:', dErr);
      setError('Erro ao carregar dias: ' + dErr.message);
      setLoading(false);
      return;
    }

    let finalDays = daysData || [];

    if (finalDays.length < ch.total_dias) {
      const existingNums = new Set(finalDays.map(d => d.numero_dia));
      const missing = Array.from({ length: ch.total_dias }, (_, i) => i + 1)
        .filter(n => !existingNums.has(n))
        .map(n => ({ desafio_id: ch.id, numero_dia: n, titulo: `Dia ${n}`, liberado: false }));

      if (missing.length > 0) {
        const { data: created, error: cErr } = await supabase
          .from('desafio_dias')
          .insert(missing)
          .select('*');

        if (cErr) {
          console.error('Erro ao criar dias:', cErr);
          setError('Erro ao criar dias automaticamente: ' + cErr.message);
        } else if (created) {
          finalDays = [...finalDays, ...created].sort((a, b) => a.numero_dia - b.numero_dia);
          toast.success(`${missing.length} dia(s) criado(s) automaticamente`);
        }
      }
    }

    setDays(finalDays);
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

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erro ao carregar dias</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={loadData}>Tentar novamente</Button>
          </div>
        )}

        {/* Bulk actions */}
        {!error && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={releaseNext}><ChevronRight className="h-4 w-4 mr-1" /> Liberar próximo dia</Button>
            <Button variant="outline" size="sm" onClick={() => bulkToggle(true)}><Unlock className="h-4 w-4 mr-1" /> Liberar todos</Button>
            <Button variant="outline" size="sm" onClick={() => bulkToggle(false)}><Lock className="h-4 w-4 mr-1" /> Bloquear todos</Button>
          </div>
        )}

        {/* Days grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[200px] w-full rounded-xl" />)}
          </div>
        ) : days.length === 0 && !error ? (
          <div className="text-center py-16">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum dia encontrado.</p>
            <p className="text-xs text-muted-foreground mt-1">ID do desafio: {id}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {days.map(day => (
              <div
                key={day.id}
                className={`group relative rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/60 ${
                  day.liberado ? 'border-primary/40' : 'border-border'
                }`}
                style={{ minHeight: '200px', width: '100%', maxWidth: '160px' }}
              >
                {/* Background image or fallback */}
                {day.imagem_url ? (
                  <div className="absolute inset-0">
                    <img src={day.imagem_url} alt={day.titulo} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                  </div>
                ) : (
                  <div className={`absolute inset-0 ${day.liberado ? 'bg-gradient-to-br from-primary/10 to-primary/5' : 'bg-muted/30'}`} />
                )}

                {/* Content */}
                <div className="relative flex flex-col items-center justify-between h-full p-3 text-center" style={{ minHeight: '200px' }}>
                  {/* Day number */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold mt-2 ${
                    day.imagem_url
                      ? 'bg-white/20 backdrop-blur-sm text-white'
                      : day.liberado
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {day.numero_dia}
                  </div>

                  {/* Title & status */}
                  <div className="space-y-2 flex-1 flex flex-col justify-center">
                    <p className={`text-xs font-medium truncate max-w-full ${day.imagem_url ? 'text-white' : 'text-foreground'}`}>
                      {day.titulo || 'Sem título'}
                    </p>
                    <Badge variant={day.liberado ? 'default' : 'secondary'} className="text-[10px] mx-auto">
                      {day.liberado ? 'Liberado' : 'Bloqueado'}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                      <Switch checked={day.liberado} onCheckedChange={() => toggleDay(day)} />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full text-xs ${day.imagem_url ? 'text-white hover:bg-white/20' : ''}`}
                      onClick={() => navigate(`/admin/desafios/${id}/dias/${day.numero_dia}`)}
                    >
                      <Edit className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
