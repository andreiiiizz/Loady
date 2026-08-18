import { SimCard, CoverageReport, AuthUser } from '../types';
import { INITIAL_COVERAGE_REPORTS } from './coverageData';
import { applyAutoDecay } from './burnRateEngine';

const STORAGE_KEYS = {
  SIMS: 'loadwise_sims_v1',
  ACTIVE_SIM_ID: 'loadwise_active_sim_id_v1',
  COVERAGE_REPORTS: 'loadwise_coverage_reports_v1',
  USER_STATS: 'loadwise_user_stats_v1',
  THEME: 'loadwise_theme_v1',
  AUTH_USER: 'loadwise_auth_user_v1'
};

const DEFAULT_SIMS: SimCard[] = [
  {
    id: 'sim-smart-primary',
    name: 'Primary (Smart 5G)',
    telco: 'Smart',
    phoneNumber: '0919 123 4567',
    activePromo: 'Power All 99',
    totalDataMb: 8 * 1024,
    remainingDataMb: 5.4 * 1024,
    expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    isNoExpiry: false,
    registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    autoTrackingEnabled: true,
    usageProfile: 'moderate',
    regularBalancePhp: 25.0,
    usageHistory: [
      {
        id: 'hist-1',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        usedMb: 1100,
        source: 'auto_decay',
        description: 'Auto-tracked daily consumption'
      },
      {
        id: 'hist-2',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        usedMb: 1350,
        source: 'session_telemetry',
        description: 'Video streaming & social browsing'
      }
    ]
  },
  {
    id: 'sim-dito-secondary',
    name: 'Backup (DITO SIM 2)',
    telco: 'DITO',
    phoneNumber: '0991 888 9999',
    activePromo: 'Level Up 99',
    totalDataMb: 7 * 1024,
    remainingDataMb: 4.8 * 1024,
    expiryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    isNoExpiry: false,
    registeredAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    autoTrackingEnabled: true,
    usageProfile: 'light',
    regularBalancePhp: 10.0,
    usageHistory: []
  },
  {
    id: 'sim-gomo-backup',
    name: 'GOMO No-Expiry Backup',
    telco: 'GOMO',
    phoneNumber: '0976 555 1234',
    activePromo: '30GB No Expiry',
    totalDataMb: 30 * 1024,
    remainingDataMb: 18.5 * 1024,
    expiryDate: 'NO_EXPIRY',
    isNoExpiry: true,
    registeredAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    autoTrackingEnabled: false,
    usageProfile: 'light',
    regularBalancePhp: 0.0,
    usageHistory: []
  }
];

export interface UserStats {
  reportsSubmitted: number;
  badges: string[];
  points: number;
}

export function loadAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return null;
}

export function saveAuthUser(user: AuthUser): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save auth user:', err);
  }
}

export function clearAuthUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  } catch (err) {
    console.error('Failed to clear auth user:', err);
  }
}

export function loadSims(): SimCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIMS);
    if (!raw) {
      saveSims(DEFAULT_SIMS);
      return DEFAULT_SIMS;
    }
    const sims: SimCard[] = JSON.parse(raw);
    
    const updatedSims = sims.map(sim => {
      const { updatedSim } = applyAutoDecay(sim);
      return updatedSim;
    });

    saveSims(updatedSims);
    return updatedSims;
  } catch {
    return DEFAULT_SIMS;
  }
}

export function saveSims(sims: SimCard[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SIMS, JSON.stringify(sims));
  } catch (err) {
    console.error('Failed to persist SIMs to storage:', err);
  }
}

export function getActiveSimId(): string {
  try {
    const active = localStorage.getItem(STORAGE_KEYS.ACTIVE_SIM_ID);
    return active || 'sim-smart-primary';
  } catch {
    return 'sim-smart-primary';
  }
}

export function setActiveSimId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SIM_ID, id);
  } catch (err) {
    console.error('Failed to set active SIM id:', err);
  }
}

export function loadCoverageReports(): CoverageReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COVERAGE_REPORTS);
    if (!raw) {
      saveCoverageReports(INITIAL_COVERAGE_REPORTS);
      return INITIAL_COVERAGE_REPORTS;
    }
    const parsed: CoverageReport[] = JSON.parse(raw);
    if (parsed.length < INITIAL_COVERAGE_REPORTS.length) {
      const merged = [...INITIAL_COVERAGE_REPORTS];
      parsed.forEach(p => {
        if (!merged.some(m => m.id === p.id)) {
          merged.push(p);
        }
      });
      saveCoverageReports(merged);
      return merged;
    }
    return parsed;
  } catch {
    return INITIAL_COVERAGE_REPORTS;
  }
}

export function saveCoverageReports(reports: CoverageReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COVERAGE_REPORTS, JSON.stringify(reports));
  } catch (err) {
    console.error('Failed to save coverage reports:', err);
  }
}

export function loadUserStats(): UserStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_STATS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    reportsSubmitted: 3,
    badges: ['Barangay Scout', 'Signal Hunter'],
    points: 150
  };
}

export function saveUserStats(stats: UserStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save user stats:', err);
  }
}
