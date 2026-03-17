// Water reminder notification utilities
import { requestNotificationPermission, isPushSupported } from './pushNotifications';
import { supabase } from './supabase';

const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function isWaterReminderEnabled(): boolean {
  const pref = localStorage.getItem('water_reminder_enabled');
  return pref === null || pref === 'true';
}

export function setWaterReminderEnabled(enabled: boolean) {
  localStorage.setItem('water_reminder_enabled', String(enabled));
  if (enabled) {
    startWaterReminder();
  } else {
    stopWaterReminder();
  }
}

export async function initWaterReminder() {
  if (!isWaterReminderEnabled()) return;

  if (isPushSupported() && Notification.permission === 'default') {
    await requestNotificationPermission();
  }

  startWaterReminder();
}

function startWaterReminder() {
  stopWaterReminder();
  if (!isWaterReminderEnabled()) return;

  reminderTimer = setInterval(() => {
    showWaterNotification();
  }, REMINDER_INTERVAL_MS);
}

function stopWaterReminder() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}

async function showWaterNotification() {
  if (!isWaterReminderEnabled()) return;

  // Try to send push via edge function
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (userId) {
      // Check if water habit already done today
      const today = new Date().toISOString().split('T')[0];
      const { data: habits } = await supabase
        .from('habitos')
        .select('id')
        .eq('ativo', true)
        .ilike('titulo', '%água%');

      if (habits?.[0]) {
        const { data: record } = await supabase
          .from('habitos_registro')
          .select('concluido')
          .eq('user_id', userId)
          .eq('habito_id', habits[0].id)
          .eq('data', today)
          .maybeSingle();

        if (record?.concluido) return; // Already done today
      }

      // Send push via edge function
      const { data: sub } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', userId)
        .maybeSingle();

      if (sub?.subscription) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            subscription: sub.subscription,
            title: '💧 Hora de beber água!',
            body: 'Mantenha-se hidratado para melhores resultados.',
            url: '/app',
          },
        });
        return;
      }
    }
  } catch (err) {
    console.error('Water push error:', err);
  }

  // Fallback: local SW notification
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification('💧 Hora de beber água!', {
        body: 'Mantenha-se hidratado para melhores resultados.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'water-reminder',
        data: { url: '/app' },
      } as NotificationOptions);
    }).catch(() => {
      new Notification('💧 Hora de beber água!', {
        body: 'Mantenha-se hidratado para melhores resultados.',
        icon: '/icon-192.png',
      });
    });
  }
}
