import { SimCard, ForecastResult, UsageProfile } from '../types';

// Baseline consumption rates by profile (MB per hour)
export const PROFILE_BASELINE_MB_HR: Record<UsageProfile, number> = {
  light: 15,      // ~360 MB / day (Chat, emails, occasional social feed)
  moderate: 55,   // ~1.32 GB / day (Casual YouTube, TikTok, browsing)
  heavy: 140,     // ~3.36 GB / day (Online gaming like MLBB/CODM, HD video)
  streamer: 280   // ~6.72 GB / day (4K streaming, hot-spotting, large downloads)
};

/**
 * Calculates current real-time burn-rate, time-to-depletion, and forecast metrics.
 */
export function calculateForecast(sim: SimCard): ForecastResult {
  const remainingMb = Math.max(0, sim.remainingDataMb);
  const now = new Date();

  // If already exhausted
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

  // Calculate empirical burn rate from usage history (last 7 days weighted)
  let empiricalMbPerHour = 0;
  if (sim.usageHistory && sim.usageHistory.length > 0) {
    const recentRecords = sim.usageHistory.slice(-15);
    const totalUsed = recentRecords.reduce((acc, r) => acc + r.usedMb, 0);
    
    const earliestTime = new Date(recentRecords[0].timestamp).getTime();
    const latestTime = new Date(recentRecords[recentRecords.length - 1].timestamp).getTime();
    const elapsedHours = Math.max(0.5, (latestTime - earliestTime) / (1000 * 60 * 60));
    
    empiricalMbPerHour = totalUsed / elapsedHours;
  }

  // Blend empirical burn rate with baseline profile (70% empirical, 30% baseline if history exists)
  const baselineRate = PROFILE_BASELINE_MB_HR[sim.usageProfile || 'moderate'];
  const burnRateMbPerHour = empiricalMbPerHour > 5 
    ? (empiricalMbPerHour * 0.75 + baselineRate * 0.25)
    : baselineRate;

  const burnRateGbPerDay = (burnRateMbPerHour * 24) / 1024;
  const hoursRemaining = burnRateMbPerHour > 0 ? remainingMb / burnRateMbPerHour : 999;

  // Projected depletion date
  const depletionTimeMs = now.getTime() + hoursRemaining * 60 * 60 * 1000;
  const projectedDepletionDate = new Date(depletionTimeMs).toISOString();

  // Expiry comparison
  let daysUntilExpiry = 999;
  let willExpireBeforeDepletion = false;

  if (!sim.isNoExpiry && sim.expiryDate && sim.expiryDate !== 'NO_EXPIRY') {
    const expiryTime = new Date(sim.expiryDate).getTime();
    const hoursUntilExpiry = (expiryTime - now.getTime()) / (1000 * 60 * 60);
    daysUntilExpiry = Math.max(0, hoursUntilExpiry / 24);

    if (hoursUntilExpiry < hoursRemaining) {
      willExpireBeforeDepletion = true;
    }
  }

  // Status classification
  let urgencyStatus: ForecastResult['urgencyStatus'] = 'safe';
  if (hoursRemaining <= 6) {
    urgencyStatus = 'critical_6h';
  } else if (hoursRemaining <= 24) {
    urgencyStatus = 'warning_24h';
  } else if (hoursRemaining <= 72) {
    urgencyStatus = 'normal';
  }

  // Recommended daily quota to last until promo expiry
  const recommendedDailyQuotaMb = daysUntilExpiry > 0 && daysUntilExpiry < 365
    ? remainingMb / Math.max(1, daysUntilExpiry)
    : remainingMb / 7;

  // Data efficiency score (100 = pacing perfectly to expiry date without waste or early starvation)
  let dataEfficiencyScore = 85;
  if (!sim.isNoExpiry && daysUntilExpiry > 0 && daysUntilExpiry < 60) {
    const idealHours = daysUntilExpiry * 24;
    const ratio = hoursRemaining / idealHours;
    if (ratio >= 0.8 && ratio <= 1.2) {
      dataEfficiencyScore = 95;
    } else if (ratio < 0.5) {
      dataEfficiencyScore = Math.round(ratio * 100); // Burning too fast
    } else {
      dataEfficiencyScore = Math.max(40, Math.round(100 - (ratio - 1) * 25)); // Underutilizing
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

/**
 * Automatically calculates elapsed time since last sync and deducts simulated usage based on profile.
 * Enables zero-effort automatic tracking without mandatory manual entries!
 */
export function applyAutoDecay(sim: SimCard): { updatedSim: SimCard; deductedMb: number } {
  if (!sim.autoTrackingEnabled || sim.remainingDataMb <= 0) {
    return { updatedSim: sim, deductedMb: 0 };
  }

  const now = new Date();
  const lastSync = new Date(sim.lastSyncAt || sim.registeredAt || now.toISOString());
  const elapsedMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

  // Only apply decay if at least 2 minutes have passed
  if (elapsedMinutes < 2) {
    return { updatedSim: sim, deductedMb: 0 };
  }

  const hourlyRate = PROFILE_BASELINE_MB_HR[sim.usageProfile || 'moderate'];
  const elapsedHours = Math.min(elapsedMinutes / 60, 48); // Cap at 48 hours for long absences
  
  // Apply a natural daytime/nighttime curve factor (lower usage between 1AM - 6AM)
  const currentHour = now.getHours();
  const timeFactor = (currentHour >= 1 && currentHour <= 6) ? 0.25 : 1.0;
  
  const estimatedUsageMb = Math.round(hourlyRate * elapsedHours * timeFactor * 10) / 10;
  const actualDeducted = Math.min(sim.remainingDataMb, estimatedUsageMb);

  if (actualDeducted <= 0.1) {
    return { updatedSim: { ...sim, lastSyncAt: now.toISOString() }, deductedMb: 0 };
  }

  const newRemaining = Math.max(0, Math.round((sim.remainingDataMb - actualDeducted) * 10) / 10);
  const newRecord = {
    id: 'rec-' + Date.now(),
    timestamp: now.toISOString(),
    usedMb: actualDeducted,
    source: 'auto_decay' as const,
    description: `Auto-tracked (${Math.round(elapsedMinutes)} mins ${sim.usageProfile} usage)`
  };

  const updatedSim: SimCard = {
    ...sim,
    remainingDataMb: newRemaining,
    lastSyncAt: now.toISOString(),
    usageHistory: [...(sim.usageHistory || []), newRecord].slice(-50)
  };

  return { updatedSim, deductedMb: actualDeducted };
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
