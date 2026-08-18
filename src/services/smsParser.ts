import { ParsedSmsResult, TelcoProvider } from '../types';

/**
 * On-Device Telco SMS Parser for Philippine Mobile Networks
 * Parses standard balance inquiry and registration confirmation SMS from:
 * - GOMO (Sender ID: "GOMO" / "GOMO PH")
 * - Globe (8080, 222, "GLOBE")
 * - Smart (9999, 214, "SMART")
 * - DITO (185, "DITO", "DITO PH")
 * - TM (8080, "TM", "Touch Mobile")
 * - TNT (4545, "TNT", "Talk N Text")
 */
export function parseTelcoSms(rawText: string): ParsedSmsResult {
  if (!rawText || rawText.trim().length === 0) {
    return { success: false };
  }

  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Detect Carrier (Supports Alphanumeric Senders like "GOMO", "GLOBE", "DITO")
  let telco: TelcoProvider | undefined = undefined;
  if (lower.includes('gomo') || lower.includes("'mo creds") || lower.includes('mo creds')) {
    telco = 'GOMO';
  } else if (lower.includes('dito') || lower.includes('ditozen')) {
    telco = 'DITO';
  } else if (lower.includes('smart') || lower.includes('magic data') || lower.includes('power all') || lower.includes('giga')) {
    telco = 'Smart';
  } else if (lower.includes('tnt') || lower.includes('surfsaya') || lower.includes("talk 'n text") || lower.includes('pantawid')) {
    telco = 'TNT';
  } else if (lower.includes('tm ') || lower.includes('touch mobile') || lower.includes('easysurf') || lower.includes('big-ating')) {
    telco = 'TM';
  } else if (lower.includes('globe') || lower.includes('goextra') || lower.includes('go+') || lower.includes('go50') || lower.includes('go90') || lower.includes('surf4all')) {
    telco = 'Globe';
  }

  // 2. Extract Data Volume (GB or MB)
  let remainingDataMb: number | undefined = undefined;

  // Regex patterns e.g. "24.15 GB", "30GB", "500MB", "18.45GB"
  const gbMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:GB|gb|Gb|gigabytes|gigs)/i);
  const mbMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:MB|mb|Mb|megabytes)/i);
  const kbMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:KB|kb|kilobytes)/i);

  if (gbMatch) {
    remainingDataMb = Math.round(parseFloat(gbMatch[1]) * 1024 * 10) / 10;
  } else if (mbMatch) {
    remainingDataMb = Math.round(parseFloat(mbMatch[1]) * 10) / 10;
  } else if (kbMatch) {
    remainingDataMb = Math.round((parseFloat(kbMatch[1]) / 1024) * 10) / 10;
  }

  // 3. Detect "No Expiry" (Standard on GOMO and Smart Magic Data)
  const isNoExpiry = telco === 'GOMO'
    ? !lower.includes('unli data 30') && (lower.includes('no expiry') || lower.includes('no-expiry') || true)
    : (lower.includes('no expiry') || lower.includes('no-expiry') || lower.includes('magic data'));

  // 4. Extract Expiry Date
  let expiryDate: string | undefined = undefined;

  if (isNoExpiry && telco === 'GOMO' && !lower.includes('valid until')) {
    expiryDate = 'NO_EXPIRY';
  } else if (isNoExpiry) {
    expiryDate = 'NO_EXPIRY';
  } else {
    // Check for dates
    const isoDateMatch = text.match(/(?:valid until|expires on|expiry:?|until)\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);
    const slashDateMatch = text.match(/(?:valid until|expires on|expiry:?|until)\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);
    const wordDateMatch = text.match(/(?:valid until|expires on|expiry:?|until)\s*([A-Za-z]{3,9}\s+\d{1,2},?\s*\d{0,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i);

    if (isoDateMatch) {
      const parsed = new Date(isoDateMatch[1]);
      if (!isNaN(parsed.getTime())) {
        expiryDate = parsed.toISOString();
      }
    } else if (slashDateMatch) {
      const parsed = new Date(slashDateMatch[1]);
      if (!isNaN(parsed.getTime())) {
        expiryDate = parsed.toISOString();
      }
    } else if (wordDateMatch) {
      const dateStr = wordDateMatch[1].includes('20') ? wordDateMatch[1] : `${wordDateMatch[1]} ${new Date().getFullYear()}`;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        expiryDate = parsed.toISOString();
      }
    } else if (lower.includes('tomorrow')) {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      tom.setHours(23, 59, 59, 0);
      expiryDate = tom.toISOString();
    }
  }

  // 5. Extract Regular Load Balance (₱ / P / Php)
  let regularBalancePhp: number | undefined = undefined;
  const balanceMatch = text.match(/(?:balance|load|bal)[\s:]*(?:is\s*)?(?:P|PHP|Php|₱)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (balanceMatch) {
    regularBalancePhp = parseFloat(balanceMatch[1]);
  }

  // 6. Extract Known Promo Name
  let promoName: string | undefined = undefined;
  const knownPromos = [
    '30GB No Expiry', '55GB No Expiry', 'GOMO Mo Creds', 'UNLI DATA 30 Days',
    'GoEXTRA99', 'GoEXTRA199', 'Go+99', 'Go50', 'Go90', 'GoUNLI95', 'SURF4ALL99', 'SuperGo',
    'Power All 99', 'Power All 149', 'Magic Data 99', 'Magic Data 199', 'Magic Data 399', 'Magic Data 499', 'Giga Power 75', 'Unli Data 399',
    'Level Up 99', 'Level Up 199', 'DITO Advance Pay', 'DITO UNLI 5G',
    'EasySURF50', 'EasySURF99', 'Big-Ating 99', 'TM Unli Funaliw',
    'SurfSaya 30', 'SurfSaya 99', 'All Data 50'
  ];

  for (const promo of knownPromos) {
    if (lower.includes(promo.toLowerCase())) {
      promoName = promo;
      break;
    }
  }

  if (!promoName && telco === 'GOMO') {
    promoName = remainingDataMb && remainingDataMb > 35000 ? '55GB No Expiry' : '30GB No Expiry';
  }

  const success = remainingDataMb !== undefined || promoName !== undefined || regularBalancePhp !== undefined;

  return {
    success,
    telco: telco || 'Globe',
    promoName: promoName || (telco ? `${telco} Active Promo` : 'Prepaid Data Plan'),
    remainingDataMb: remainingDataMb,
    totalDataMb: remainingDataMb ? Math.max(remainingDataMb, 2048) : undefined,
    expiryDate: expiryDate,
    regularBalancePhp: regularBalancePhp,
    rawMatchedSnippet: text.slice(0, 120)
  };
}

/**
 * Sample SMS balance messages to test or quick-demo in the UI
 */
export const SAMPLE_TELCO_SMS = [
  {
    carrier: 'GOMO',
    label: 'GOMO 30GB (Sender: GOMO)',
    text: 'Mo Awesome! You have 24.15 GB No Expiry Data available on your GOMO account. Use Mo Creds on the GOMO app to convert your data to calls and SMS.'
  },
  {
    carrier: 'Smart',
    label: 'Smart Power All 99 (9999)',
    text: 'As of 08/18/2026 18:30, you have 5.8 GB remaining open access data on your Power All 99 valid until 2026-08-25 23:59:59. Regular load balance is P25.00. Dial *123# for more promos.'
  },
  {
    carrier: 'Globe',
    label: 'Globe GoEXTRA99 (8080)',
    text: 'You have 7.2 GB remaining on your GoEXTRA99 valid until 2026-08-27 23:59:59. Enjoy your unli calls to all networks and unli all-net texts. Load balance: P14.50.'
  },
  {
    carrier: 'Smart',
    label: 'Smart Magic Data (No Expiry)',
    text: 'Smart Advisory: You still have 19.4 GB remaining in your Magic Data (No Expiry). Stay connected anytime, anywhere with no expiration worries!'
  },
  {
    carrier: 'DITO',
    label: 'DITO Level Up 99 (185)',
    text: 'Hi DITOzen! You have 6.4 GB high-speed data left on your Level Up 99 valid until 08/30/2026. Top-up anytime via DITO App or GCash.'
  }
];
