import { describe, it, expect } from 'vitest';

// Burn Rate calculation engine simulation test
function calculateForecast(sim: {
  totalDataMb: number;
  remainingDataMb: number;
  expiryDate: string;
  isNoExpiry: boolean;
  usageHistory: Array<{ timestamp: string; usedMb: number }>;
  usageProfile: 'light' | 'moderate' | 'heavy' | 'streamer';
}) {
  const profileRates = {
    light: 15,
    moderate: 45,
    heavy: 120,
    streamer: 300
  };

  const baseRate = profileRates[sim.usageProfile] || 45;
  const burnRateMbPerHour = baseRate;
  const burnRateGbPerDay = (burnRateMbPerHour * 24) / 1024;
  const hoursRemaining = burnRateMbPerHour > 0 ? sim.remainingDataMb / burnRateMbPerHour : 999;
  
  let urgencyStatus: 'safe' | 'normal' | 'warning_24h' | 'critical_6h' | 'depleted' = 'normal';
  if (sim.remainingDataMb <= 0) {
    urgencyStatus = 'depleted';
  } else if (hoursRemaining <= 6) {
    urgencyStatus = 'critical_6h';
  } else if (hoursRemaining <= 24) {
    urgencyStatus = 'warning_24h';
  } else if (hoursRemaining > 72) {
    urgencyStatus = 'safe';
  }

  return {
    burnRateMbPerHour,
    burnRateGbPerDay,
    hoursRemaining,
    urgencyStatus,
    isExhausted: sim.remainingDataMb <= 0
  };
}

describe('Burn Rate Predictor Regression Test Suite', () => {
  it('correctly calculates burn rate and hours remaining for moderate user', () => {
    const sim = {
      totalDataMb: 8192,
      remainingDataMb: 4500,
      expiryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      isNoExpiry: false,
      usageHistory: [],
      usageProfile: 'moderate' as const
    };

    const forecast = calculateForecast(sim);
    expect(forecast.burnRateMbPerHour).toBe(45);
    expect(forecast.hoursRemaining).toBe(100);
    expect(forecast.urgencyStatus).toBe('safe');
    expect(forecast.isExhausted).toBe(false);
  });

  it('triggers critical 6h warning when remaining balance is dangerously low', () => {
    const sim = {
      totalDataMb: 8192,
      remainingDataMb: 200,
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      isNoExpiry: false,
      usageHistory: [],
      usageProfile: 'moderate' as const
    };

    const forecast = calculateForecast(sim);
    expect(forecast.hoursRemaining).toBeLessThan(6);
    expect(forecast.urgencyStatus).toBe('critical_6h');
  });

  it('marks urgency status as depleted when balance reaches zero', () => {
    const sim = {
      totalDataMb: 8192,
      remainingDataMb: 0,
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      isNoExpiry: false,
      usageHistory: [],
      usageProfile: 'moderate' as const
    };

    const forecast = calculateForecast(sim);
    expect(forecast.isExhausted).toBe(true);
    expect(forecast.urgencyStatus).toBe('depleted');
  });
});
