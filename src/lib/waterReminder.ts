// Water reminder notification utilities
import { requestNotificationPermission, isPushSupported } from './pushNotifications';

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

function showWaterNotification() {
  if (!isWaterReminderEnabled()) return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Use SW notification if available for background support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification('💧 Hora de beber água!', {
        body: 'Mantenha-se hidratado para melhores resultados.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'water-reminder',
        renotify: true,
        data: { url: '/app' },
      });
    }).catch(() => {
      // Fallback to regular notification
      new Notification('💧 Hora de beber água!', {
        body: 'Mantenha-se hidratado para melhores resultados.',
        icon: '/icon-192.png',
      });
    });
  }
}
