import { SimCard, ForecastResult, UsageProfile } from '../types';

/**
 * Baseline consumption rates by check-in pacing (MB per hour).
 * Used as an initial prior before multiple user balance check-ins are recorded.
 */
export const PROFILE_BASELINE_MB_HR: Record<UsageProfile, number> = {
  light: 20,      // ~480 MB / day
  moderate: 65,   // ~1.56 GB / day
  heavy: 160,     // ~3.84 GB / day
  streamer: 300   // ~7.20 GB / day
};

/**
 * Calculates burn-rate, time-to-depletion, and forecast metrics based on check-in deltas and promo expiry timeline.
 * 
 * NOTE ON BROWSER SANDBOXING:
 * Web browsers and PWAs on iOS/Android cannot intercept background kernel byte counters from other apps (YouTube, TikTok, etc.).
 * Therefore, Loady models forecasting primarily around verified user check-in deltas (*123# / SMS / manual input)
 * and promo expiration deadlines.
 */
export function calculateForecast(sim: SimCard): ForecastResult {
  const remainingMb = Math.max(0, sim.remainingDataMb);
  const now = new Date();

  // If balance is zero or depleted
  if (remainingMb <= 0) {
    return {
      burnRateMbPerHour: 0,
      burnRateGbPerDay: 0,
      hoursRemaining: 0,
      projectedDepletionDate: now.toISOString(),
      isExhausted: true,
      urgencyStatus: 'depleted',
      recommendedDailyQuotaMb: 0,
      daysUntilExpiry: 0,
      willExpireBeforeDepletion: false,
      dataEfficiencyScore: 0
    };
  }

  // 1. Calculate Empirical Burn Rate from User Check-In Deltas
  let empiricalMbPerHour = 0;
  if (sim.usageHistory && sim.usageHistory.length >= 2) {
    // Look at check-in events
    const checkInRecords = sim.usageHistory.slice(-10);
    const totalDeducted = checkInRecords.reduce((acc, r) => acc + (r.usedMb || 0), 0);
    
    const earliestTime = new Date(checkInRecords[0].timestamp).getTime();
    const latestTime = new Date(checkInRecords[checkInRecords.length - 1].timestamp).getTime();
    const elapsedHours = Math.max(0.25, (latestTime - earliestTime) / (1000 * 60 * 60));
    
    empiricalMbPerHour = totalDeducted / elapsedHours;
  }

  // 2. Expiry Deadline Analysis
  let daysUntilExpiry = 999;
  let willExpireBeforeDepletion = false;
  let idealPacingMbPerHour = 0;

  if (!sim.isNoExpiry && sim.expiryDate && sim.expiryDate !== 'NO_EXPIRY') {
    const expiryTime = new Date(sim.expiryDate).getTime();
    const hoursUntilExpiry = Math.max(0.1, (expiryTime - now.getTime()) / (1000 * 60 * 60));
    daysUntilExpiry = Math.max(0, hoursUntilExpiry / 24);
    idealPacingMbPerHour = remainingMb / hoursUntilExpiry;
  }

  // 3. Blend Empirical Rate with Promo Pacing Target
  const baselineRate = PROFILE_BASELINE_MB_HR[sim.usageProfile || 'moderate'];
  let burnRateMbPerHour: number;

  if (empiricalMbPerHour > 2) {
    // 70% empirical check-in rate + 30% baseline
    burnRateMbPerHour = empiricalMbPerHour * 0.7 + baselineRate * 0.3;
  } else if (idealPacingMbPerHour > 0 && daysUntilExpiry < 30) {
    // Use target promo pacing with baseline prior
    burnRateMbPerHour = idealPacingMbPerHour * 0.6 + baselineRate * 0.4;
  } else {
    burnRateMbPerHour = baselineRate;
  }

  const burnRateGbPerDay = (burnRateMbPerHour * 24) / 1024;
  const hoursRemaining = burnRateMbPerHour > 0 ? remainingMb / burnRateMbPerHour : 999;

  // Projected depletion timestamp
  const depletionTimeMs = now.getTime() + hoursRemaining * 60 * 60 * 1000;
  const projectedDepletionDate = new Date(depletionTimeMs).toISOString();

  if (!sim.isNoExpiry && daysUntilExpiry < 999) {
    const hoursUntilExpiry = daysUntilExpiry * 24;
    if (hoursUntilExpiry < hoursRemaining) {
      willExpireBeforeDepletion = true;
    }
  }

  // Urgency Status
  let urgencyStatus: ForecastResult['urgencyStatus'] = 'safe';
  if (hoursRemaining <= 6 || (daysUntilExpiry > 0 && daysUntilExpiry <= 0.25)) {
    urgencyStatus = 'critical_6h';
  } else if (hoursRemaining <= 24 || (daysUntilExpiry > 0 && daysUntilExpiry <= 1.0)) {
    urgencyStatus = 'warning_24h';
  } else if (hoursRemaining <= 72) {
    urgencyStatus = 'normal';
  }

  // Recommended daily quota to last smoothly until promo expiry
  const recommendedDailyQuotaMb = daysUntilExpiry > 0 && daysUntilExpiry < 365
    ? remainingMb / Math.max(1, daysUntilExpiry)
    : remainingMb / 7;

  // Data efficiency pacing score (100 = optimal distribution over promo lifespan)
  let dataEfficiencyScore = 88;
  if (!sim.isNoExpiry && daysUntilExpiry > 0 && daysUntilExpiry < 60) {
    const idealHours = daysUntilExpiry * 24;
    const ratio = hoursRemaining / idealHours;
    if (ratio >= 0.85 && ratio <= 1.15) {
      dataEfficiencyScore = 96;
    } else if (ratio < 0.6) {
      dataEfficiencyScore = Math.max(30, Math.round(ratio * 100)); // Depleting ahead of expiry
    } else {
      dataEfficiencyScore = Math.max(45, Math.round(100 - (ratio - 1) * 20)); // Under-consuming
    }
  }

  return {
    burnRateMbPerHour: Math.round(burnRateMbPerHour * 10) / 10,
    burnRateGbPerDay: Math.round(burnRateGbPerDay * 100) / 100,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    projectedDepletionDate,
    isExhausted: false,
    urgencyStatus,
    recommendedDailyQuotaMb: Math.round(recommendedDailyQuotaMb),
    daysUntilExpiry: Math.round(daysUntilExpiry * 10) / 10,
    willExpireBeforeDepletion,
    dataEfficiencyScore
  };
}

export interface AutoDecayOptions {
  isWifiActive?: boolean;
  forceSimulateHours?: number;
  measuredSpeedMbps?: number;
}

export interface AutoDecayResult {
  updatedSim: SimCard;
  deductedMb: number;
  reason?: 'wifi_paused' | 'cellular_decay' | 'disabled' | 'depleted' | 'insufficient_time';
}

/**
 * Automatically calculates elapsed time since last sync and deducts usage.
 * If connected to Wi-Fi, balance deduction is completely PAUSED (0 MB deducted).
 */
export function applyAutoDecay(sim: SimCard, options?: AutoDecayOptions): AutoDecayResult {
  if (!sim.autoTrackingEnabled || sim.remainingDataMb <= 0) {
    return { updatedSim: sim, deductedMb: 0, reason: sim.remainingDataMb <= 0 ? 'depleted' : 'disabled' };
  }

  const now = new Date();

  // If Wi-Fi is active and not explicitly doing a forced demo simulation, PAUSE decay completely!
  if (options?.isWifiActive && !options?.forceSimulateHours) {
    return {
      updatedSim: {
        ...sim,
        lastSyncAt: now.toISOString()
      },
      deductedMb: 0,
      reason: 'wifi_paused'
    };
  }

  const lastSync = new Date(sim.lastSyncAt || sim.registeredAt || now.toISOString());
  let elapsedMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

  if (options?.forceSimulateHours) {
    elapsedMinutes = options.forceSimulateHours * 60;
  }

  // Only apply decay if at least 1 minute has passed (or forced)
  if (elapsedMinutes < 1 && !options?.forceSimulateHours) {
    return { updatedSim: sim, deductedMb: 0, reason: 'insufficient_time' };
  }

  const baselineRate = PROFILE_BASELINE_MB_HR[sim.usageProfile || 'moderate'];
  const elapsedHours = Math.min(elapsedMinutes / 60, 48); // Cap at 48 hours for long absences
  
  // Apply a natural daytime/nighttime curve factor (lower usage between 1AM - 6AM)
  const currentHour = now.getHours();
  const timeFactor = (currentHour >= 1 && currentHour <= 6) ? 0.25 : 1.0;
  
  // Dynamic cellular throughput adjustment if available
  const speedMultiplier = options?.measuredSpeedMbps && options.measuredSpeedMbps > 25 ? 1.15 : 1.0;
  
  const estimatedUsageMb = Math.round(baselineRate * elapsedHours * timeFactor * speedMultiplier * 10) / 10;
  const actualDeducted = Math.min(sim.remainingDataMb, estimatedUsageMb);

  if (actualDeducted <= 0.05) {
    return { updatedSim: { ...sim, lastSyncAt: now.toISOString() }, deductedMb: 0, reason: 'insufficient_time' };
  }

  const newRemaining = Math.max(0, Math.round((sim.remainingDataMb - actualDeducted) * 10) / 10);
  const newRecord = {
    id: 'rec-' + Date.now(),
    timestamp: now.toISOString(),
    usedMb: actualDeducted,
    source: 'auto_decay' as const,
    description: options?.forceSimulateHours 
      ? `Demo Simulation: 1 hr ${sim.usageProfile} cellular usage`
      : `Cellular Auto-tracked: ${Math.round(elapsedMinutes)}m on Mobile Data`
  };

  const updatedSim: SimCard = {
    ...sim,
    remainingDataMb: newRemaining,
    lastSyncAt: now.toISOString(),
    usageHistory: [...(sim.usageHistory || []), newRecord].slice(-50)
  };

  return { updatedSim, deductedMb: actualDeducted, reason: 'cellular_decay' };
}

/**
 * Format hours to friendly Philippine colloquial or standard duration
 */
export function formatTimeRemaining(hours: number): string {
  if (hours <= 0) return 'Expired / 0 MB left';
  if (hours > 24 * 365) return 'No Expiry';
  
  const days = Math.floor(hours / 24);
  const remHours = Math.floor(hours % 24);
  const remMinutes = Math.floor((hours * 60) % 60);

  if (days > 0) {
    return `${days}d ${remHours}h left`;
  }
  if (remHours > 0) {
    return `${remHours}h ${remMinutes}m left`;
  }
  return `${Math.max(1, remMinutes)} mins left`;
}

/**
 * Format projected depletion date nicely (e.g. "Thu, Aug 20 at 4:30 PM")
 */
export function formatDepletionTimestamp(isoString: string | null): string {
  if (!isoString) return 'Indefinite (No Expiry)';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
