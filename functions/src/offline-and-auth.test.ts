import { describe, it, expect, beforeEach } from 'vitest';

// Storage Key
const OFFLINE_QUEUE_KEY = 'loady_coverage_reports_offline_queue_v1';

// Mock storage
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

global.localStorage = localStorageMock as any;

describe('Offline SIM Profile Storage Simulation Suite', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('correctly persists local SIM profiles and pacing state offline', () => {
    const simProfile = {
      id: 'sim_offline_001',
      name: 'Primary Smart 5G',
      telco: 'Smart',
      totalDataMb: 8192,
      remainingDataMb: 5120,
      expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      isNoExpiry: false
    };

    localStorageMock.setItem('loadwise_sims_v1', JSON.stringify([simProfile]));

    const retrieved = JSON.parse(localStorageMock.getItem('loadwise_sims_v1') || '[]');
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe('sim_offline_001');
    expect(retrieved[0].remainingDataMb).toBe(5120);
  });
});


describe('Phone Authentication & OTP State Verification', () => {
  it('correctly formats and validates Philippines mobile numbers', () => {
    const normalize = (input: string) => {
      const cleaned = input.replace(/\D/g, '');
      if (cleaned.startsWith('63') && cleaned.length === 12) return `+${cleaned}`;
      if (cleaned.startsWith('09') && cleaned.length === 11) return `+63${cleaned.substring(1)}`;
      if (cleaned.startsWith('9') && cleaned.length === 10) return `+63${cleaned}`;
      return null;
    };

    expect(normalize('0919 123 4567')).toBe('+639191234567');
    expect(normalize('+639171234567')).toBe('+639171234567');
    expect(normalize('9181234567')).toBe('+639181234567');
    expect(normalize('12345')).toBeNull();
  });

  it('validates 6-digit OTP verification code structure', () => {
    const isValidOtp = (otp: string) => /^\d{6}$/.test(otp.trim());

    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp(' 654321 ')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('1234567')).toBe(false);
    expect(isValidOtp('abcdef')).toBe(false);
  });
});
