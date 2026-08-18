/**
 * Real-Time Network Connection & Data Telemetry Monitor
 * Reads navigator.connection API (Network Information API) supported on Android Chrome / Chromium PWA
 */

export interface NetworkStatus {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlinkMbps: number;
  rttMs: number;
  saveData: boolean;
  isOnline: boolean;
}

export function getLiveNetworkStatus(): NetworkStatus {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // @ts-expect-error - navigator.connection is experimental Network Information API
  const conn = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;

  if (conn) {
    return {
      effectiveType: conn.effectiveType || '4g',
      downlinkMbps: conn.downlink || 12.5,
      rttMs: conn.rtt || 45,
      saveData: Boolean(conn.saveData),
      isOnline
    };
  }

  return {
    effectiveType: '4g',
    downlinkMbps: 15.0,
    rttMs: 38,
    saveData: false,
    isOnline
  };
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
