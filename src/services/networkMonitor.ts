/**
 * Real-Time Network Connection & Data Telemetry Monitor
 * Reads Network Information API (navigator.connection) supported on Chromium / Android PWA
 * and provides smart Wi-Fi shield persistence for iOS & universal devices.
 */

export interface NetworkStatus {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
  downlinkMbps: number;
  rttMs: number;
  saveData: boolean;
  isOnline: boolean;
  isWifi: boolean;
  isCellular: boolean;
  wifiShieldActive: boolean; // Manual or auto Wi-Fi zero-decay protection
  isApiSupported: boolean;   // Whether Network Information API is natively supported
  isIosDevice: boolean;      // True if running on iOS (iPhone / iPad)
}

const WIFI_SHIELD_STORAGE_KEY = 'loady_wifi_shield_active';

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function loadWifiShield(): boolean {
  try {
    const saved = localStorage.getItem(WIFI_SHIELD_STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    // ignore
  }
  return false;
}

export function saveWifiShield(active: boolean): void {
  try {
    localStorage.setItem(WIFI_SHIELD_STORAGE_KEY, String(active));
  } catch {
    // ignore
  }
}

/**
 * Calculates current network status and detects if Wi-Fi is active
 */
export function getLiveNetworkStatus(): NetworkStatus {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const wifiShieldActive = loadWifiShield();
  const isIosDevice = isIos();

  // @ts-expect-error - navigator.connection is experimental Network Information API
  const conn = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;

  let connectionType: NetworkStatus['connectionType'] = 'unknown';
  let isWifiDetected = false;
  let isCellularDetected = false;

  if (conn) {
    const rawType = (conn.type || '').toLowerCase();
    if (rawType === 'wifi' || rawType === 'wimax') {
      connectionType = 'wifi';
      isWifiDetected = true;
    } else if (rawType === 'cellular') {
      connectionType = 'cellular';
      isCellularDetected = true;
    } else if (rawType === 'ethernet') {
      connectionType = 'ethernet';
      isWifiDetected = true; // Ethernet is unmetered home/broadband
    } else if (rawType === 'none') {
      connectionType = 'none';
    } else {
      connectionType = 'unknown';
    }

    const effectiveType = conn.effectiveType || '4g';
    const downlinkMbps = typeof conn.downlink === 'number' ? conn.downlink : 12.5;
    const rttMs = typeof conn.rtt === 'number' ? conn.rtt : 45;
    const saveData = Boolean(conn.saveData);

    const isWifi = wifiShieldActive || isWifiDetected;
    const isCellular = !isWifi && (isCellularDetected || (isOnline && connectionType !== 'none'));

    return {
      effectiveType,
      connectionType,
      downlinkMbps,
      rttMs,
      saveData,
      isOnline,
      isWifi,
      isCellular,
      wifiShieldActive,
      isApiSupported: true,
      isIosDevice
    };
  }

  // Fallback for browsers without navigator.connection (e.g. iOS Safari)
  const isWifi = wifiShieldActive;
  const isCellular = !isWifi && isOnline;

  return {
    effectiveType: '4g',
    connectionType: 'unknown',
    downlinkMbps: 15.0,
    rttMs: 38,
    saveData: false,
    isOnline,
    isWifi,
    isCellular,
    wifiShieldActive,
    isApiSupported: false,
    isIosDevice
  };
}

/**
 * Get active session data transferred in the app (KB/MB) via Resource Timing API
 */
export function getSessionDataTransferredMb(): number {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return 0;
  }
  try {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const totalBytes = resources.reduce((acc, r) => acc + (r.transferSize || r.decodedBodySize || 0), 0);
    return Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * USSD Quick Dialer Codes for Philippine Telcos
 */
export const TELCO_USSD_CODES: Record<string, { balanceCheck: string; promoMenu: string; label: string }> = {
  Globe: { balanceCheck: '*143#', promoMenu: '*143#', label: 'Dial *143#' },
  Smart: { balanceCheck: '*123#', promoMenu: '*123#', label: 'Dial *123#' },
  DITO: { balanceCheck: '*185#', promoMenu: '*185#', label: 'Dial *185#' },
  TM: { balanceCheck: '*143#', promoMenu: '*143#', label: 'Dial *143#' },
  TNT: { balanceCheck: '*123#', promoMenu: '*123#', label: 'Dial *123#' },
  GOMO: { balanceCheck: 'App Only', promoMenu: 'GOMO App', label: 'Open GOMO App' }
};

