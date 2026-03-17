// Push notification utilities
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return await Notification.requestPermission();
}

export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    // Save subscription to database
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, subscription: subscription.toJSON() },
      { onConflict: 'user_id' }
    );

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const subscription = await getCurrentSubscription();
    if (subscription) await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
  }
}

export async function sendPushToAllUsers(title: string, body: string, url = '/app') {
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription, user_id');

  if (!subscriptions?.length) return;

  for (const sub of subscriptions) {
    await supabase.functions.invoke('send-push-notification', {
      body: { subscription: sub.subscription, title, body, url },
    });
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, url = '/app') {
  const { data: sub } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .maybeSingle();

  if (!sub?.subscription) return;

  await supabase.functions.invoke('send-push-notification', {
    body: { subscription: sub.subscription, title, body, url },
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Show local notification as fallback
export function showLocalNotification(title: string, body: string, url?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
    if (url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  }
}
