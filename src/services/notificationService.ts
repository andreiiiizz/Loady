import { SimCard } from '../types';
import { isIos } from './networkMonitor';
import { getFirebaseMessaging, savePushSubscription, FIREBASE_VAPID_KEY } from './firebase';
import { getToken } from 'firebase/messaging';

export interface NotificationCapabilities {
  isSupported: boolean;
  isIosInBrowser: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | 'unsupported';
  isPushSubscribed: boolean;
}

const NOTIFICATION_HISTORY_KEY = 'loady_sent_alerts_v1';

function getSentAlerts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {};
}

function markAlertSent(alertKey: string): void {
  try {
    const history = getSentAlerts();
    history[alertKey] = Date.now();
    localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

function hasAlertBeenSentRecently(alertKey: string, cooldownHours: number = 12): boolean {
  const history = getSentAlerts();
  const sentTime = history[alertKey];
  if (!sentTime) return false;
  const elapsedHours = (Date.now() - sentTime) / (1000 * 60 * 60);
  return elapsedHours < cooldownHours;
}

/**
 * Check if the browser supports notifications and whether iOS PWA standalone mode is active.
 */
export function getNotificationCapabilities(): NotificationCapabilities {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      isSupported: false,
      isIosInBrowser: isIos(),
      isStandalone: false,
      permission: 'unsupported',
      isPushSubscribed: false
    };
  }

  const isStandalone = Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error - navigator.standalone is iOS Safari specific
    window.navigator.standalone === true
  );

  const isIosInBrowser = isIos() && !isStandalone;

  return {
    isSupported: true,
    isIosInBrowser,
    isStandalone,
    permission: Notification.permission,
    isPushSubscribed: Notification.permission === 'granted'
  };
}

/**
 * Subscribes the client device to Firebase Cloud Messaging (FCM) using the single unified Workbox SW registration.
 */
export async function registerPushSubscription(userId?: string): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return { success: false, error: 'Web Push is not supported on this browser' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const messaging = await getFirebaseMessaging();

    if (messaging) {
      const token = await getToken(messaging, {
        vapidKey: FIREBASE_VAPID_KEY || undefined,
        serviceWorkerRegistration: registration
      });

      if (token) {
        await savePushSubscription(token, userId);
        return { success: true, token };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Failed to subscribe to FCM Push:', err);
    return { success: false, error: err.message || 'Failed to register push subscription' };
  }
}

/**
 * Request user permission for FCM Push Notifications and register token with Firestore.
 */
export async function requestNotificationPermission(userId?: string): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await registerPushSubscription(userId);
    }
    return perm;
  } catch {
    return Notification.permission;
  }
}

/**
 * Trigger an immediate notification (client-side or via Service Worker)
 */
export async function dispatchPushNotification(title: string, body: string, iconUrl?: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body,
    icon: iconUrl || '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'loady-alert',
    // @ts-expect-error - vibrate is supported in modern mobile browsers
    vibrate: [200, 100, 200]
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return true;
      }
    }

    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn('Failed to dispatch notification:', err);
    return false;
  }
}

/**
 * Evaluates active SIMs against forecast thresholds and triggers alerts when app is open.
 * (Closed-app notifications are handled independently by the scheduled Cloud Function)
 */
export async function checkAndDispatchThresholdAlerts(sim: SimCard): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const now = Date.now();

  // 1. Promo Expiration Thresholds
  if (!sim.isNoExpiry && sim.expiryDate && sim.expiryDate !== 'NO_EXPIRY') {
    const expiryMs = new Date(sim.expiryDate).getTime();
    const hoursLeft = (expiryMs - now) / (1000 * 60 * 60);

    // Expired Alert
    if (hoursLeft <= 0) {
      const alertKey = `expired_${sim.id}_${sim.expiryDate}`;
      if (!hasAlertBeenSentRecently(alertKey, 24)) {
        await dispatchPushNotification(
          `⏱️ ${sim.telco} Promo Expired`,
          `Your ${sim.activePromo || 'data promo'} has ended. Check balance or reload before using mobile data to avoid standard regular load charges.`
        );
        markAlertSent(alertKey);
      }
    }
    // 6-Hour Critical Alert
    else if (hoursLeft <= 6) {
      const alertKey = `crit6h_${sim.id}_${sim.expiryDate}`;
      if (!hasAlertBeenSentRecently(alertKey, 8)) {
        const mbLeft = Math.round(sim.remainingDataMb);
        await dispatchPushNotification(
          `⚠️ ${sim.telco} Promo Expires in ${Math.round(hoursLeft)} Hours!`,
          `You have ${mbLeft > 1024 ? `${(mbLeft / 1024).toFixed(1)} GB` : `${mbLeft} MB`} remaining. Top up or consume before it expires.`
        );
        markAlertSent(alertKey);
      }
    }
    // 24-Hour Warning Alert
    else if (hoursLeft <= 24) {
      const alertKey = `warn24h_${sim.id}_${sim.expiryDate}`;
      if (!hasAlertBeenSentRecently(alertKey, 20)) {
        const mbLeft = Math.round(sim.remainingDataMb);
        await dispatchPushNotification(
          `⏳ 24 Hours Left on ${sim.telco} (${sim.activePromo})`,
          `Your promo ends tomorrow. Balance: ${mbLeft > 1024 ? `${(mbLeft / 1024).toFixed(1)} GB` : `${mbLeft} MB`}.`
        );
        markAlertSent(alertKey);
      }
    }
  }

  // 2. Low Data Depletion Alert (< 500 MB remaining on active promo)
  if (sim.remainingDataMb > 0 && sim.remainingDataMb <= 500 && (sim.totalDataMb || 0) > 1000) {
    const alertKey = `lowdata_${sim.id}_${Math.floor(sim.remainingDataMb / 100)}`;
    if (!hasAlertBeenSentRecently(alertKey, 12)) {
      await dispatchPushNotification(
        `🛑 Low Data Alert: ${Math.round(sim.remainingDataMb)} MB Remaining`,
        `Your ${sim.telco} data is nearly exhausted. Pacing forecast suggests switching to Wi-Fi to preserve navigation data.`
      );
      markAlertSent(alertKey);
    }
  }
}
