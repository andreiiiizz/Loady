import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  increment,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { getMessaging, Messaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { CoverageReport, TelcoProvider, UserCheckin } from '../types';
import { loadCoverageReports, saveCoverageReports } from './storage';
import { getHashedDeviceFingerprint } from './privacy';
export { findNearestBarangayLocal } from '../data/batangasBarangays';

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

// Convert Firestore document to Frontend CoverageReport interface
function mapDocToCoverageReport(id: string, data: any): CoverageReport {
  return {
    id,
    barangay_code: data.barangay_code || undefined,
    telco: data.telco as TelcoProvider,
    barangay: data.barangay || 'Unknown Area',
    city: data.city || data.municipality || 'Metro Manila',
    province: data.province || 'Luzon',
    coordinates: [data.lat ?? 13.7565, data.lng ?? 121.0583],
    signalRating: data.signal_rating ?? 5,
    networkType: data.network_type || '5G',
    speedMbps: data.speed_mbps || undefined,
    notes: data.notes || undefined,
    reporterName: data.user_id || undefined,
    reportedAt: data.created_at || (data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString()),
    upvotes: data.upvotes ?? 1,
    flagged: Boolean(data.flagged),
    flag_count: data.flag_count ?? 0
  };
}

// 1. Fetch Crowd Coverage Reports from Firestore (with local offline fallback)
export async function fetchCoverageReports(): Promise<CoverageReport[]> {
  if (db) {
    try {
      const reportsRef = collection(db, 'coverage_reports');
      const q = query(reportsRef, orderBy('created_at', 'desc'), limit(150));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const fetched: CoverageReport[] = [];
        snapshot.forEach(docSnap => {
          fetched.push(mapDocToCoverageReport(docSnap.id, docSnap.data()));
        });
        saveCoverageReports(fetched);
        return fetched;
      }
    } catch (err) {
      console.warn('Firestore fetch error, falling back to local cache:', err);
    }
  }

  return loadCoverageReports();
}

// Offline Reports Queue Key
const OFFLINE_REPORTS_QUEUE_KEY = 'loady_coverage_reports_offline_queue_v1';

export function loadOfflineReportsQueue(): CoverageReport[] {
  try {
    const raw = localStorage.getItem(OFFLINE_REPORTS_QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export function saveOfflineReportsQueue(queue: CoverageReport[]): void {
  try {
    localStorage.setItem(OFFLINE_REPORTS_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function enqueueOfflineReport(report: CoverageReport): void {
  const current = loadOfflineReportsQueue();
  saveOfflineReportsQueue([report, ...current.filter(r => r.id !== report.id)]);
}

/**
 * Flushes all pending offline coverage reports to Firestore.
 * Triggered both on 'online' event and on app mount if already online.
 */
export async function flushPendingOfflineReports(): Promise<{ synced: number; remaining: number }> {
  if (!db || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { synced: 0, remaining: loadOfflineReportsQueue().length };
  }

  const queue = loadOfflineReportsQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const failedItems: CoverageReport[] = [];
  let syncedCount = 0;
  const hashedFingerprint = await getHashedDeviceFingerprint();

  for (const report of queue) {
    try {
      const docRef = doc(db, 'coverage_reports', report.id);
      await setDoc(docRef, {
        barangay_code: report.barangay_code || null,
        device_fingerprint: hashedFingerprint,
        user_id: report.reporterName || null,
        telco: report.telco,
        barangay: report.barangay,
        city: report.city,
        province: report.province,
        lat: report.coordinates[0],
        lng: report.coordinates[1],
        signal_rating: report.signalRating,
        network_type: report.networkType,
        speed_mbps: report.speedMbps || null,
        notes: report.notes || null,
        upvotes: report.upvotes || 1,
        flagged: report.flagged || false,
        flag_count: report.flag_count || 0,
        created_at: report.reportedAt || new Date().toISOString(),
        server_synced_at: serverTimestamp()
      });
      syncedCount++;
    } catch {
      failedItems.push(report);
    }
  }

  saveOfflineReportsQueue(failedItems);
  return { synced: syncedCount, remaining: failedItems.length };
}

// Automatic connection listener for dynamic offline->online transitions
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingOfflineReports();
  });
}

// 2. Submit New Coverage Report to Firestore with Offline Queue Fallback
export async function submitCoverageReport(
  report: CoverageReport
): Promise<{ success: boolean; report?: CoverageReport; error?: string; isOfflineQueued?: boolean }> {
  // Update local cache first
  const existing = loadCoverageReports();
  const updated = [report, ...existing.filter(r => r.id !== report.id)];
  saveCoverageReports(updated);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline || !db) {
    enqueueOfflineReport(report);
    return { success: true, report, isOfflineQueued: true };
  }

  try {
    const hashedFingerprint = await getHashedDeviceFingerprint();
    const docRef = doc(db, 'coverage_reports', report.id);
    await setDoc(docRef, {
      barangay_code: report.barangay_code || null,
      device_fingerprint: hashedFingerprint,
      user_id: report.reporterName || null,
      telco: report.telco,
      barangay: report.barangay,
      city: report.city,
      province: report.province,
      lat: report.coordinates[0],
      lng: report.coordinates[1],
      signal_rating: report.signalRating,
      network_type: report.networkType,
      speed_mbps: report.speedMbps || null,
      notes: report.notes || null,
      upvotes: report.upvotes || 1,
      flagged: report.flagged || false,
      flag_count: report.flag_count || 0,
      created_at: report.reportedAt || new Date().toISOString(),
      server_synced_at: serverTimestamp()
    });

    return { success: true, report };
  } catch (err: any) {
    console.warn('Firestore submission failed, queuing offline:', err);
    enqueueOfflineReport(report);
    return { success: true, report, isOfflineQueued: true };
  }
}

// 3. Upvote a Coverage Report in Firestore (Single-Increment Only)
export async function upvoteCoverageReport(reportId: string): Promise<boolean> {
  const reports = loadCoverageReports().map(r => {
    if (r.id === reportId) {
      return { ...r, upvotes: (r.upvotes || 1) + 1 };
    }
    return r;
  });
  saveCoverageReports(reports);

  if (db) {
    try {
      const docRef = doc(db, 'coverage_reports', reportId);
      await updateDoc(docRef, {
        upvotes: increment(1)
      });
      return true;
    } catch (err) {
      console.warn('Firestore upvote error:', err);
    }
  }
  return true;
}

// 4. Realtime Subscription to Live Crowd Reports in Firestore
export function subscribeToCrowdReports(onNewReport: (report: CoverageReport) => void): () => void {
  if (!db) return () => {};

  try {
    const reportsRef = collection(db, 'coverage_reports');
    const q = query(reportsRef, orderBy('created_at', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const report = mapDocToCoverageReport(change.doc.id, change.doc.data());
          onNewReport(report);
        }
      });
    }, (error) => {
      console.warn('Firestore realtime subscription warning:', error);
    });

    return unsubscribe;
  } catch {
    return () => {};
  }
}

// 5. Log Out-of-Area Telemetry (Expansion Demand Signal)
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

// 6. Log User Check-In
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

// 7. Save FCM Push Subscription / Token (Keyed by Device Identifier)
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

// 8. Sync User SIM Profile to Firestore (Keyed by Device Identifier)
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
