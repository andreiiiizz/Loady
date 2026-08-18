import { PromoItem } from '../types';

export const PHILIPPINE_PROMOS: PromoItem[] = [
  // --- GLOBE ---
  {
    id: 'globe-goextra-99',
    telco: 'Globe',
    name: 'GoEXTRA99',
    pricePhp: 99,
    dataAllowanceMb: 8 * 1024,
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: 'Unli calls to all networks + Unli all-net texts',
    ussdCode: '*143#',
    smsKeyword: 'GOEXTRA99',
    smsSendTo: '8080',
    category: 'popular',
    highlights: ['Best Seller', 'Unli Allnet Calls/SMS', '₱12.38 / GB'],
    costPerGb: 12.38
  },
  {
    id: 'globe-go-plus-99',
    telco: 'Globe',
    name: 'Go+99',
    pricePhp: 99,
    dataAllowanceMb: 16 * 1024, // 8GB open + 8GB app choice
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: '8GB Open Data + 8GB App Freebie (GoWATCH/GoWORK/GoANIME)',
    ussdCode: '*143#',
    smsKeyword: 'GOPLUS99',
    smsSendTo: '8080',
    category: 'heavy_data',
    highlights: ['16GB Total Data', 'App Booster Choice', '₱6.19 / GB'],
    costPerGb: 6.19
  },
  {
    id: 'globe-go-50',
    telco: 'Globe',
    name: 'Go50',
    pricePhp: 50,
    dataAllowanceMb: 5 * 1024,
    validityDays: 3,
    isNoExpiry: false,
    freebieDetails: '5GB All-Access Data + Unli Allnet SMS',
    ussdCode: '*143#',
    smsKeyword: 'GO50',
    smsSendTo: '8080',
    category: 'budget',
    highlights: ['Short Trip Hero', '5GB All-Access', '₱10.00 / GB'],
    costPerGb: 10.0
  },
  {
    id: 'globe-go-90',
    telco: 'Globe',
    name: 'Go90',
    pricePhp: 90,
    dataAllowanceMb: 8 * 1024,
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: '8GB All-Access Data + Unli Allnet SMS',
    ussdCode: '*143#',
    smsKeyword: 'GO90',
    smsSendTo: '8080',
    category: 'budget',
    highlights: ['Weekly Staple', '8GB Open Access', '₱11.25 / GB'],
    costPerGb: 11.25
  },
  {
    id: 'globe-surf4all-99',
    telco: 'Globe',
    name: 'SURF4ALL99',
    pricePhp: 99,
    dataAllowanceMb: 9 * 1024,
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: 'Share data with up to 4 users/SIMs simultaneously',
    ussdCode: '*143#',
    smsKeyword: 'SURF4ALL99',
    smsSendTo: '8080',
    category: 'popular',
    highlights: ['Family/Group Share', 'Multi-device pool', '₱11.00 / GB'],
    costPerGb: 11.0
  },
  {
    id: 'globe-supergo-149',
    telco: 'Globe',
    name: 'SuperGo 149',
    pricePhp: 149,
    dataAllowanceMb: 15 * 1024,
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: '15GB All-Access Data + Unli Calls & SMS',
    ussdCode: '*143#',
    smsKeyword: 'SUPERGO149',
    smsSendTo: '8080',
    category: 'heavy_data',
    highlights: ['Heavy Gaming/Video', '₱9.93 / GB'],
    costPerGb: 9.93
  },

  // --- SMART ---
  {
    id: 'smart-power-all-99',
    telco: 'Smart',
    name: 'Power All 99',
    pricePhp: 99,
    dataAllowanceMb: 8 * 1024,
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: '8GB All Access Data + Unli TikTok Daily + Unli Allnet Calls/SMS',
    ussdCode: '*123#',
    smsKeyword: 'POWER99',
    smsSendTo: '9999',
    category: 'popular',
    highlights: ['Unli TikTok', 'Unli Allnet Calls/SMS', '₱12.38 / GB'],
    costPerGb: 12.38
  },
  {
    id: 'smart-power-all-149',
    telco: 'Smart',
    name: 'Power All 149',
    pricePhp: 149,
    dataAllowanceMb: 12 * 1024,
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: '12GB All Access + Unli TikTok Daily + Unli Calls/SMS',
    ussdCode: '*123#',
    smsKeyword: 'POWER149',
    smsSendTo: '9999',
    category: 'heavy_data',
    highlights: ['12GB Open Access', 'Unli TikTok', '₱12.42 / GB'],
    costPerGb: 12.42
  },
  {
    id: 'smart-magic-data-99',
    telco: 'Smart',
    name: 'Magic Data 99',
    pricePhp: 99,
    dataAllowanceMb: 2 * 1024,
    validityDays: 0,
    isNoExpiry: true,
    freebieDetails: 'No Expiry Data for all apps and sites',
    ussdCode: '*123#',
    smsKeyword: 'MAGIC99',
    smsSendTo: '9999',
    category: 'no_expiry',
    highlights: ['No Expiration', 'Zero Waste Backup', '₱49.50 / GB'],
    costPerGb: 49.5
  },
  {
    id: 'smart-magic-data-399',
    telco: 'Smart',
    name: 'Magic Data 399',
    pricePhp: 399,
    dataAllowanceMb: 24 * 1024,
    validityDays: 0,
    isNoExpiry: true,
    freebieDetails: '24GB No Expiration Data for all apps/sites',
    ussdCode: '*123#',
    smsKeyword: 'MAGIC399',
    smsSendTo: '9999',
    category: 'no_expiry',
    highlights: ['Best No-Expiry Value', 'Never Expires', '₱16.63 / GB'],
    costPerGb: 16.63
  },
  {
    id: 'smart-unli-data-399',
    telco: 'Smart',
    name: 'Unli Data 399',
    pricePhp: 399,
    dataAllowanceMb: 999 * 1024,
    validityDays: 30,
    isNoExpiry: false,
    freebieDetails: 'Pure Unlimited Data (Smart app exclusive SIM offers)',
    ussdCode: '*123#',
    smsKeyword: 'UNLI399',
    smsSendTo: '9999',
    category: 'unli',
    highlights: ['Unlimited High Speed', '30 Days Validity', '< ₱0.40 / GB'],
    costPerGb: 0.4
  },

  // --- DITO ---
  {
    id: 'dito-level-up-99',
    telco: 'DITO',
    name: 'Level Up 99',
    pricePhp: 99,
    dataAllowanceMb: 7 * 1024,
    validityDays: 30,
    isNoExpiry: false,
    freebieDetails: '7GB High-Speed Data + Unli DITO calls + 300 mins all-net + Prime Video',
    ussdCode: '*185#',
    smsKeyword: 'LEVELUP99',
    smsSendTo: '185',
    category: 'popular',
    highlights: ['30 Days Validity for ₱99', '300 mins allnet', '₱14.14 / GB'],
    costPerGb: 14.14
  },
  {
    id: 'dito-level-up-199',
    telco: 'DITO',
    name: 'Level Up 199',
    pricePhp: 199,
    dataAllowanceMb: 16 * 1024,
    validityDays: 30,
    isNoExpiry: false,
    freebieDetails: '16GB High-Speed Data + Unli DITO calls + 300 mins all-net + Prime Video Mobile',
    ussdCode: '*185#',
    smsKeyword: 'LEVELUP199',
    smsSendTo: '185',
    category: 'popular',
    highlights: ['16GB Data for 1 Month', 'Prime Video included', '₱12.44 / GB'],
    costPerGb: 12.44
  },
  {
    id: 'dito-advance-pay-713',
    telco: 'DITO',
    name: 'DITO Advance Pay 365D',
    pricePhp: 713,
    dataAllowanceMb: 96 * 1024,
    validityDays: 365,
    isNoExpiry: false,
    freebieDetails: '96GB data for 1 year (8GB/month auto-disbursed) + Unli DITO calls',
    ussdCode: '*185#',
    smsKeyword: 'ADVANCE365',
    smsSendTo: '185',
    category: 'heavy_data',
    highlights: ['1 Full Year Peace of Mind', '₱7.43 / GB'],
    costPerGb: 7.43
  },
  {
    id: 'dito-unli-5g-1090',
    telco: 'DITO',
    name: 'DITO UNLI 5G 1090',
    pricePhp: 1090,
    dataAllowanceMb: 999 * 1024,
    validityDays: 30,
    isNoExpiry: false,
    freebieDetails: 'Unli 5G Data + 50GB 4G Data + Unli Allnet calls/texts',
    ussdCode: '*185#',
    smsKeyword: 'UNLI5G1090',
    smsSendTo: '185',
    category: 'unli',
    highlights: ['True Unli 5G', '50GB 4G backup', 'Ultra-fast'],
    costPerGb: 1.09
  },

  // --- TM (Touch Mobile) ---
  {
    id: 'tm-easysurf-50',
    telco: 'TM',
    name: 'EasySURF50',
    pricePhp: 50,
    dataAllowanceMb: 5 * 1024, // 2GB open + 3GB FunALIW
    validityDays: 3,
    isNoExpiry: false,
    freebieDetails: '2GB Open Access + 3GB FunALIW (FB, YT, TikTok, MLBB) + Unli Allnet SMS',
    ussdCode: '*143#',
    smsKeyword: 'EZ50',
    smsSendTo: '8080',
    category: 'budget',
    highlights: ['Budget Pinoy Favorite', 'FunALIW apps', '₱10.00 / GB'],
    costPerGb: 10.0
  },
  {
    id: 'tm-bigating-99',
    telco: 'TM',
    name: 'Big-Ating 99',
    pricePhp: 99,
    dataAllowanceMb: 10 * 1024,
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: '10GB All-Access Data + Unli Calls & SMS to all networks',
    ussdCode: '*143#',
    smsKeyword: 'BIGATING99',
    smsSendTo: '8080',
    category: 'popular',
    highlights: ['10GB Big Data', 'Unli Allnet Call & Text', '₱9.90 / GB'],
    costPerGb: 9.9
  },

  // --- TNT (Talk 'N Text) ---
  {
    id: 'tnt-surfsaya-30',
    telco: 'TNT',
    name: 'SurfSaya 30',
    pricePhp: 30,
    dataAllowanceMb: 1200,
    validityDays: 3,
    isNoExpiry: false,
    freebieDetails: '1.2GB Data + Unli Allnet Calls & Texts + Unli FB/Messenger',
    ussdCode: '*123#',
    smsKeyword: 'SURFSAYA30',
    smsSendTo: '4545',
    category: 'budget',
    highlights: ['Only ₱30', 'Unli Calls & Texts', '₱25.00 / GB'],
    costPerGb: 25.0
  },
  {
    id: 'tnt-surfsaya-99',
    telco: 'TNT',
    name: 'SurfSaya 99',
    pricePhp: 99,
    dataAllowanceMb: 8 * 1024,
    validityDays: 7,
    isNoExpiry: false,
    freebieDetails: '8GB Open Data + Unli TikTok + Unli Allnet Calls/SMS',
    ussdCode: '*123#',
    smsKeyword: 'SURFSAYA99',
    smsSendTo: '4545',
    category: 'popular',
    highlights: ['Unli TikTok Daily', 'Unli Allnet Calls', '₱12.38 / GB'],
    costPerGb: 12.38
  },

  // --- GOMO ---
  {
    id: 'gomo-30gb-no-expiry',
    telco: 'GOMO',
    name: '30GB No Expiry',
    pricePhp: 399,
    dataAllowanceMb: 30 * 1024,
    validityDays: 0,
    isNoExpiry: true,
    freebieDetails: '30GB High Speed Data. Swap data to calls & SMS via Mo Creds on GOMO app.',
    ussdCode: 'GOMO App',
    category: 'no_expiry',
    highlights: ["'Mo Creds Convertible", 'No Expiration', '₱13.30 / GB'],
    costPerGb: 13.3
  },
  {
    id: 'gomo-55gb-no-expiry',
    telco: 'GOMO',
    name: '55GB No Expiry',
    pricePhp: 599,
    dataAllowanceMb: 55 * 1024,
    validityDays: 0,
    isNoExpiry: true,
    freebieDetails: '55GB High Speed Data with Mo Creds data swapping support',
    ussdCode: 'GOMO App',
    category: 'no_expiry',
    highlights: ['Bulk No-Expiry Data', 'Lowest Cost No-Expiry', '₱10.89 / GB'],
    costPerGb: 10.89
  },
  {
    id: 'gomo-unli-data-30d',
    telco: 'GOMO',
    name: 'UNLI DATA 30 Days',
    pricePhp: 699,
    dataAllowanceMb: 999 * 1024,
    validityDays: 30,
    isNoExpiry: false,
    freebieDetails: 'Unli Data for 30 Days (Capped at 5Mbps speed - Flash Sale Promo)',
    ussdCode: 'GOMO App',
    category: 'unli',
    highlights: ['Unlimited Browsing/Streaming', '30 Days', '< ₱0.70 / GB'],
    costPerGb: 0.7
  }
];

/**
 * Recommend the best promo based on user burn rate and budget preference
 */
export function recommendPromos(burnRateGbPerDay: number, preferredTelco?: string): {
  bestOverall: PromoItem;
  bestValue: PromoItem;
  bestNoExpiry: PromoItem;
  savingsInsight: string;
} {
  const telcoFiltered = preferredTelco && preferredTelco !== 'ALL'
    ? PHILIPPINE_PROMOS.filter(p => p.telco === preferredTelco)
    : PHILIPPINE_PROMOS;

  const validPromos = telcoFiltered.length > 0 ? telcoFiltered : PHILIPPINE_PROMOS;

  // Best no-expiry
  const noExpiryPromos = validPromos.filter(p => p.isNoExpiry).sort((a, b) => a.costPerGb - b.costPerGb);
  const bestNoExpiry = noExpiryPromos[0] || PHILIPPINE_PROMOS.find(p => p.isNoExpiry)!;

  // Best value per GB
  const sortedByCost = [...validPromos].sort((a, b) => a.costPerGb - b.costPerGb);
  const bestValue = sortedByCost[0];

  // Best overall matched to user's daily burn rate (e.g. 7-day or 30-day needs)
  const estimatedWeeklyMb = burnRateGbPerDay * 7 * 1024;
  const bestOverall = validPromos.find(p => p.dataAllowanceMb >= estimatedWeeklyMb && p.validityDays >= 7)
    || validPromos.find(p => p.category === 'popular')
    || validPromos[0];

  const estimatedDaysLast = Math.round((bestOverall.dataAllowanceMb / (Math.max(0.1, burnRateGbPerDay) * 1024)) * 10) / 10;
  const savingsInsight = `At your rate of ${burnRateGbPerDay} GB/day, switching to ${bestOverall.name} gives you ~${estimatedDaysLast} days of coverage for just ₱${bestOverall.pricePhp}.`;

  return {
    bestOverall,
    bestValue,
    bestNoExpiry,
    savingsInsight
  };
}
