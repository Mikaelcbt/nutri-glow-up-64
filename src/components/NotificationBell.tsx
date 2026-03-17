import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Bell, X } from 'lucide-react';
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
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
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

  // Close on outside click (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobile]);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMobile, open]);

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

  const notificationContent = (
    <>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="font-display text-lg font-semibold text-foreground">Notificações</span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">
              Marcar todas como lidas
            </button>
          )}
          {isMobile && (
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            Nenhuma notificação
          </div>
        ) : (
          <div>
            {notifications.map(n => (
              <div
                key={n.id}
                className={`p-4 border-b border-border last:border-0 transition-colors ${
                  !n.lida ? 'bg-accent/50' : ''
                }`}
              >
                {n.link ? (
                  <Link
                    to={n.link}
                    onClick={() => { markRead(n.id); setOpen(false); }}
                    className="block"
                  >
                    <p className="text-sm font-semibold text-foreground">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                    </p>
                  </Link>
                ) : (
                  <div onClick={() => markRead(n.id)} className="cursor-pointer">
                    <p className="text-sm font-semibold text-foreground">{n.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative h-10 w-10 p-0"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && !isMobile && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[28rem] overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-50 flex flex-col"
          >
            {notificationContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile fullscreen modal */}
      <AnimatePresence>
        {open && isMobile && (
          <motion.div
            className="fixed inset-0 z-[60] bg-background flex flex-col"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {notificationContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
