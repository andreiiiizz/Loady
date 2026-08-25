import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CoverageReport, TelcoProvider } from '../types';
import { loadCoverageReports, saveCoverageReports } from './storage';

const RAW_URL = import.meta.env.VITE_SUPABASE_URL || '';
// Clean trailing /rest/v1 or trailing slashes to prevent 404 in supabase-js
export const SUPABASE_URL = RAW_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
  SUPABASE_URL.startsWith('https://')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Diagnostics Helper: Checks if Supabase connection is live and if tables exist
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  url: string;
  hasAnonKey: boolean;
  tables: {
    coverage_reports: boolean;
    sim_profiles: boolean;
    badges: boolean;
    push_subscriptions: boolean;
  };
  error?: string;
}> {
  const status = {
    connected: false,
    url: SUPABASE_URL,
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    tables: {
      coverage_reports: false,
      sim_profiles: false,
      badges: false,
      push_subscriptions: false
    },
    error: undefined as string | undefined
  };

  if (!supabase) {
    status.error = 'Supabase client is not initialized. Check .env file.';
    return status;
  }

  try {
    // 1. Test coverage_reports table
    const { error: covErr } = await supabase
      .from('coverage_reports')
      .select('id')
      .limit(1);

    if (!covErr) {
      status.tables.coverage_reports = true;
    } else {
      status.error = `coverage_reports table error: ${covErr.message}`;
    }

    // 2. Test sim_profiles table
    const { error: simErr } = await supabase
      .from('sim_profiles')
      .select('id')
      .limit(1);
    if (!simErr) status.tables.sim_profiles = true;

    // 3. Test badges table
    const { error: badgeErr } = await supabase
      .from('badges')
      .select('id')
      .limit(1);
    if (!badgeErr) status.tables.badges = true;

    // 4. Test push_subscriptions table
    const { error: pushErr } = await supabase
      .from('push_subscriptions')
      .select('id')
      .limit(1);
    if (!pushErr) status.tables.push_subscriptions = true;

    status.connected = status.tables.coverage_reports;
    return status;
  } catch (err: any) {
    status.error = err.message || 'Failed to connect to Supabase';
    return status;
  }
}

// Unique Device Fingerprint for abuse prevention & rate limiting
export function getDeviceFingerprint(): string {
  const key = 'loadwise_device_id_v1';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

// Convert Supabase database row to Frontend CoverageReport interface
function mapRowToCoverageReport(row: any): CoverageReport {
  return {
    id: row.id,
    telco: row.telco as TelcoProvider,
    barangay: row.barangay,
    city: row.city || 'Metro Manila',
    province: row.province || 'Luzon',
    coordinates: [row.lat, row.lng],
    signalRating: row.signal_rating,
    networkType: row.network_type,
    speedMbps: row.speed_mbps || undefined,
    notes: row.notes || undefined,
    reportedAt: row.created_at || new Date().toISOString(),
    upvotes: row.upvotes || 1
  };
}

// 1. Fetch Real Crowd Coverage Reports from Supabase (with offline local fallback)
export async function fetchCoverageReports(): Promise<CoverageReport[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('coverage_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);

      if (!error && data && data.length > 0) {
        const mapped = data.map(mapRowToCoverageReport);
        saveCoverageReports(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Supabase fetch error, falling back to cached reports:', err);
    }
  }

  // Fallback to local storage
  return loadCoverageReports();
}

// Offline Queue Storage Key for submissions made while in deadzones or disconnected
const OFFLINE_REPORTS_QUEUE_KEY = 'loady_coverage_reports_offline_queue_v1';

export function loadOfflineReportsQueue(): CoverageReport[] {
  try {
    const raw = localStorage.getItem(OFFLINE_REPORTS_QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
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
 * Flushes all pending offline coverage reports when internet connectivity is restored
 */
export async function flushPendingOfflineReports(): Promise<{ synced: number; remaining: number }> {
  if (!supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { synced: 0, remaining: loadOfflineReportsQueue().length };
  }

  const queue = loadOfflineReportsQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const failedItems: CoverageReport[] = [];
  let syncedCount = 0;

  for (const report of queue) {
    try {
      const { error } = await supabase
        .from('coverage_reports')
        .insert([
          {
            device_fingerprint: getDeviceFingerprint(),
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
            upvotes: report.upvotes || 1
          }
        ]);

      if (error) {
        // If rate limited or invalid, don't re-queue indefinitely
        if (!error.message.includes('Rate limit')) {
          failedItems.push(report);
        }
      } else {
        syncedCount++;
      }
    } catch {
      failedItems.push(report);
    }
  }

  saveOfflineReportsQueue(failedItems);
  return { synced: syncedCount, remaining: failedItems.length };
}

// Attach automatic listener for online events to flush offline queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingOfflineReports();
  });
}

// 2. Submit New Coverage Report to Supabase with Offline Deadzone Queue Fallback
export async function submitCoverageReport(
  report: CoverageReport
): Promise<{ success: boolean; report?: CoverageReport; error?: string; isOfflineQueued?: boolean }> {
  // Always update local cache first
  const existing = loadCoverageReports();
  const updated = [report, ...existing.filter(r => r.id !== report.id)];
  saveCoverageReports(updated);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    enqueueOfflineReport(report);
    return {
      success: true,
      report,
      isOfflineQueued: true
    };
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('coverage_reports')
        .insert([
          {
            device_fingerprint: getDeviceFingerprint(),
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
            upvotes: report.upvotes || 1
          }
        ])
        .select()
        .single();

      if (error) {
        if (error.message.includes('Rate limit')) {
          return { success: false, error: error.message };
        }
        // If network/server failure, queue offline
        enqueueOfflineReport(report);
        return { success: true, report, isOfflineQueued: true };
      }

      if (data) {
        const savedReport = mapRowToCoverageReport(data);
        return { success: true, report: savedReport };
      }
    } catch (err: any) {
      enqueueOfflineReport(report);
      return { success: true, report, isOfflineQueued: true };
    }
  }

  return { success: true, report };
}

// 3. Upvote a Coverage Report in Supabase
export async function upvoteCoverageReport(reportId: string): Promise<boolean> {
  // Update local storage
  const reports = loadCoverageReports().map(r => {
    if (r.id === reportId) {
      return { ...r, upvotes: (r.upvotes || 1) + 1 };
    }
    return r;
  });
  saveCoverageReports(reports);

  if (supabase) {
    try {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        await supabase
          .from('coverage_reports')
          .update({ upvotes: report.upvotes })
          .eq('id', reportId);
        return true;
      }
    } catch {
      // ignore
    }
  }

  return true;
}

// 4. Realtime Subscription to Live Crowd Reports
export function subscribeToCrowdReports(onNewReport: (report: CoverageReport) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:coverage_reports')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'coverage_reports' },
      (payload) => {
        if (payload.new) {
          const report = mapRowToCoverageReport(payload.new);
          onNewReport(report);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// 5. Supabase Phone OTP Authentication Service
export async function sendSupabasePhoneOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: true }; // offline / demo mode
  }

  try {
    // Format to E.164 (Philippine numbers: +639XXXXXXXXX)
    const cleanDigits = phone.replace(/\D/g, '');
    const formatted = cleanDigits.startsWith('63')
      ? `+${cleanDigits}`
      : cleanDigits.startsWith('0')
      ? `+63${cleanDigits.slice(1)}`
      : `+63${cleanDigits}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formatted
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'OTP request failed' };
  }
}

export async function verifySupabasePhoneOtp(phone: string, token: string): Promise<{ success: boolean; user?: any; error?: string }> {
  if (!supabase) {
    return { success: true, user: { phone } }; // offline / demo mode
  }

  try {
    const cleanDigits = phone.replace(/\D/g, '');
    const formatted = cleanDigits.startsWith('63')
      ? `+${cleanDigits}`
      : cleanDigits.startsWith('0')
      ? `+63${cleanDigits.slice(1)}`
      : `+63${cleanDigits}`;

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token,
      type: 'sms'
    });

    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'OTP verification failed' };
  }
}
