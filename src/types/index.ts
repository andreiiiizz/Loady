export type TelcoProvider = 'Globe' | 'Smart' | 'DITO' | 'TM' | 'TNT' | 'GOMO' | 'Sun';

export type UsageProfile = 'light' | 'moderate' | 'heavy' | 'streamer';

export interface AuthUser {
  name?: string;
  phoneNumber: string;
  telco: TelcoProvider;
  isLoggedIn: boolean;
  registeredAt?: string;
  verifiedAt?: string;
  isGuest?: boolean;
  uid?: string;
}

export interface UsageRecord {
  id: string;
  timestamp: string;
  usedMb: number;
  source: 'auto_decay' | 'sms_sync' | 'manual' | 'manual_calibration' | 'session_telemetry';
  description?: string;
}

export interface SimCard {
  id: string;
  name: string;
  telco: TelcoProvider;
  phoneNumber?: string;
  activePromo: string;
  totalDataMb: number;
  remainingDataMb: number;
  expiryDate: string; // ISO String or 'NO_EXPIRY'
  isNoExpiry: boolean;
  registeredAt: string;
  lastSyncAt: string;
  usageHistory: UsageRecord[];
  autoTrackingEnabled: boolean;
  usageProfile: UsageProfile;
  regularBalancePhp: number;
}

export interface PromoItem {
  id: string;
  telco: TelcoProvider;
  name: string;
  pricePhp: number;
  dataAllowanceMb: number;
  validityDays: number; // 0 for no expiry
  isNoExpiry: boolean;
  freebieDetails?: string;
  inclusions?: string;
  ussdCode?: string;
  smsKeyword?: string;
  smsSendTo?: string;
  category: 'popular' | 'budget' | 'heavy_data' | 'no_expiry' | 'unli';
  highlights: string[];
  costPerGb: number;
  lastVerifiedDate: string;
  confidence: 'high' | 'medium';
}

export interface Barangay {
  barangay_code: string;
  name: string;
  municipality: string;
  province: string;
  lat: number;
  lng: number;
}

export interface UserCheckin {
  id: string;
  user_id?: string;
  device_fingerprint: string;
  barangay_code: string;
  telco: TelcoProvider;
  signalRating: number;
  networkType: '5G' | '4G/LTE' | '3G' | '2G' | 'Deadzone';
  speedMbps?: number;
  timestamp: string;
}

export interface OutOfAreaLog {
  id: string;
  user_id?: string;
  device_fingerprint: string;
  lat: number;
  lng: number;
  resolvedLocation?: string;
  timestamp: string;
}


export interface ForecastResult {
  burnRateMbPerHour: number;
  burnRateGbPerDay: number;
  hoursRemaining: number;
  projectedDepletionDate: string | null;
  isExhausted: boolean;
  urgencyStatus: 'safe' | 'normal' | 'warning_24h' | 'critical_6h' | 'depleted';
  recommendedDailyQuotaMb: number;
  daysUntilExpiry: number;
  willExpireBeforeDepletion: boolean;
  dataEfficiencyScore: number;
}

export interface ParsedSmsResult {
  success: boolean;
  telco?: TelcoProvider;
  promoName?: string;
  remainingDataMb?: number;
  totalDataMb?: number;
  expiryDate?: string;
  regularBalancePhp?: number;
  rawMatchedSnippet?: string;
}
