import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  criado_em: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notificacoes_' + user.id)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const newNotif = payload.new as Notificacao;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.lida).length);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false);
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-50"
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="font-semibold text-foreground text-sm">Notificações</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              <div>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-border last:border-0 transition-colors ${
                      !n.lida ? 'bg-primary/5' : ''
                    }`}
                  >
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => { markRead(n.id); setOpen(false); }}
                        className="block"
                      >
                        <p className="text-sm font-medium text-foreground">{n.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                        </p>
                      </Link>
                    ) : (
                      <div onClick={() => markRead(n.id)} className="cursor-pointer">
                        <p className="text-sm font-medium text-foreground">{n.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
