import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getMessaging, Messaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { UserCheckin } from '../types';
import { getHashedDeviceFingerprint } from './privacy';

// Firebase Client Configuration
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim()
};

export const FIREBASE_VAPID_KEY = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your_firebase_api_key_here' &&
  !firebaseConfig.apiKey.startsWith('AIzaSyDummy') &&
  firebaseConfig.projectId !== 'your-project-id'
);

// Strict Production Validation: In production builds, missing configuration must fail loudly
const IS_DEV = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true');
if (!isFirebaseConfigured && !IS_DEV) {
  console.error(
    'FATAL CONFIGURATION ERROR: Firebase environment variables (VITE_FIREBASE_*) are missing or invalid in production.'
  );
}

// Singleton Firebase instances
let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let messagingInstance: Messaging | null = null;

if (isFirebaseConfigured) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(appInstance);
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

export const firebaseApp = appInstance;
export const db = dbInstance;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (!appInstance) return null;
  if (messagingInstance) return messagingInstance;

  try {
    const supported = await isMessagingSupported();
    if (supported) {
      messagingInstance = getMessaging(appInstance);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('Firebase Messaging not supported on this browser/environment:', err);
  }
  return null;
}

// 1. Log Out-of-Area Telemetry (Expansion Demand Signal)
export async function logOutOfAreaLookup(
  lat: number,
  lng: number,
  resolvedLocation?: string
): Promise<void> {
  const hashedFingerprint = await getHashedDeviceFingerprint();

  if (db && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const logId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docRef = doc(db, 'out_of_area_logs', logId);
      await setDoc(docRef, {
        lat,
        lng,
        resolved_location: resolvedLocation || 'Outside Supported Region',
        device_fingerprint: hashedFingerprint,
        user_id: null,
        timestamp: new Date().toISOString(),
        created_at: serverTimestamp()
      });
    } catch (err) {
      console.warn('Failed to log out-of-area telemetry to Firestore:', err);
    }
  }
}

// 2. Log User Check-In
export async function logUserCheckin(
  checkin: Omit<UserCheckin, 'id' | 'device_fingerprint' | 'timestamp'>
): Promise<void> {
  const hashedFingerprint = await getHashedDeviceFingerprint();
  const checkinId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (db && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const docRef = doc(db, 'user_checkins', checkinId);
      await setDoc(docRef, {
        user_id: checkin.user_id || null,
        device_fingerprint: hashedFingerprint,
        barangay_code: checkin.barangay_code,
        telco: checkin.telco,
        signal_rating: checkin.signalRating,
        network_type: checkin.networkType,
        speed_mbps: checkin.speedMbps || null,
        timestamp: new Date().toISOString(),
        created_at: serverTimestamp()
      });
    } catch (err) {
      console.warn('Failed to record user checkin to Firestore:', err);
    }
  }
}

// 3. Save FCM Push Subscription / Token (Keyed by Device Identifier)
export async function savePushSubscription(fcmToken: string, deviceId?: string): Promise<boolean> {
  if (!db || !fcmToken) return false;

  try {
    const hashedFingerprint = await getHashedDeviceFingerprint();
    const effectiveDeviceId = deviceId || hashedFingerprint;
    const subId = `fcm_${fcmToken.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`;
    const docRef = doc(db, 'push_subscriptions', subId);

    await setDoc(docRef, {
      token: fcmToken,
      device_id: effectiveDeviceId,
      user_id: null,
      device_fingerprint: hashedFingerprint,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      updated_at: new Date().toISOString(),
      server_timestamp: serverTimestamp()
    }, { merge: true });

    return true;
  } catch (err) {
    console.warn('Failed to save FCM push subscription:', err);
    return false;
  }
}

// 4. Sync User SIM Profile to Firestore (Keyed by Device Identifier)
export async function syncSimProfileToFirestore(sim: any): Promise<void> {
  if (!db || typeof navigator === 'undefined' || !navigator.onLine) return;

  try {
    const hashedFingerprint = await getHashedDeviceFingerprint();
    const docRef = doc(db, 'sim_profiles', sim.id);
    await setDoc(docRef, {
      id: sim.id,
      device_id: hashedFingerprint,
      user_id: null,
      name: sim.name,
      telco: sim.telco,
      phone_number: sim.phoneNumber || '',
      active_promo: sim.activePromo || '',
      total_data_mb: sim.totalDataMb || 0,
      remaining_data_mb: sim.remainingDataMb || 0,
      expiry_date: sim.expiryDate || '',
      is_no_expiry: Boolean(sim.isNoExpiry),
      regular_balance_php: sim.regularBalancePhp || 0,
      updated_at: new Date().toISOString(),
      server_timestamp: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to sync SIM profile to Firestore:', err);
  }
}

