export type TelcoProvider = 'Globe' | 'Smart' | 'DITO' | 'TM' | 'TNT' | 'GOMO';

export type UsageProfile = 'light' | 'moderate' | 'heavy' | 'streamer';

export interface AuthUser {
  phoneNumber: string;
  telco: TelcoProvider;
  isLoggedIn: boolean;
  verifiedAt: string;
  isGuest?: boolean;
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
  ussdCode?: string;
  smsKeyword?: string;
  smsSendTo?: string;
  category: 'popular' | 'budget' | 'heavy_data' | 'no_expiry' | 'unli';
  highlights: string[];
  costPerGb: number;
}

export interface CoverageReport {
  id: string;
  telco: TelcoProvider;
  barangay: string;
  city: string;
  province: string;
  coordinates: [number, number]; // [lat, lng]
  signalRating: number; // 1 to 5
  networkType: '5G' | '4G/LTE' | '3G' | '2G' | 'Deadzone';
  speedMbps?: number;
  notes?: string;
  reporterName?: string;
  reportedAt: string;
  upvotes: number;
}

export interface RouteCheckpoint {
  name: string;
  coordinates: [number, number];
  kmMark: number;
  carrierStrength: Record<TelcoProvider, number>;
  deadzoneCarriers: TelcoProvider[];
  recommendation: string;
}

export interface TripRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  durationEst: string;
  path: [number, number][];
  checkpoints: RouteCheckpoint[];
  summaryAdvisory: string;
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
