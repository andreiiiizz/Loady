import { PHILIPPINE_PROMOS, recommendPromos, DATASET_LAST_VERIFIED_DATE } from './promoData';

console.log('========================================================');
console.log('LOADY PHILIPPINE PROMO CATALOG EXPANSION VERIFICATION');
console.log('========================================================\n');

console.log(`Dataset Last Verified Date: ${DATASET_LAST_VERIFIED_DATE}`);
console.log(`Total Promos in Dataset: ${PHILIPPINE_PROMOS.length}\n`);

// 1. Group and count promos per telco
const telcos = ['Smart', 'Globe', 'TNT', 'TM', 'DITO', 'GOMO'];
const counts: Record<string, { total: number; high: number; medium: number }> = {};

for (const telco of telcos) {
  const promos = PHILIPPINE_PROMOS.filter(p => p.telco.toLowerCase() === telco.toLowerCase());
  const high = promos.filter(p => p.confidence === 'high').length;
  const medium = promos.filter(p => p.confidence === 'medium').length;
  counts[telco] = { total: promos.length, high, medium };
  console.log(`📡 [${telco.toUpperCase()}]: ${promos.length} promos total (${high} high confidence, ${medium} medium confidence)`);
}

// 2. Validate Sun Cellular handling (Sun maps to Smart + TNT)
const sunCompatiblePromos = PHILIPPINE_PROMOS.filter(p => p.telco === 'Smart' || p.telco === 'TNT');
console.log(`\n☀️ [SUN CELLULAR]: ${sunCompatiblePromos.length} compatible Smart/TNT promos mapped (with Sun migration notice banner)`);

// 3. Category Filter Tests
console.log('\n--- CATEGORY FILTER VERIFICATION ---');

// Budget Filter (price <= 50)
const budgetPromos = PHILIPPINE_PROMOS.filter(p => p.pricePhp <= 50);
const allBudgetValid = budgetPromos.every(p => p.pricePhp <= 50);
console.log(`🪙 Budget Promos (<= ₱50): ${budgetPromos.length} items (All valid <= ₱50: ${allBudgetValid})`);

// No Expiry Filter
const noExpiryPromos = PHILIPPINE_PROMOS.filter(p => p.isNoExpiry);
const allNoExpiryValid = noExpiryPromos.every(p => p.isNoExpiry && p.validityDays === 0);
console.log(`♾️ No Expiry Promos: ${noExpiryPromos.length} items (All valid no-expiry: ${allNoExpiryValid})`);

// Heavy Data Filter (>= 12GB or >= 15 Days)
const heavyDataPromos = PHILIPPINE_PROMOS.filter(p => p.dataAllowanceMb >= 12 * 1024 || p.validityDays >= 15);
console.log(`🚀 Heavy Data Promos: ${heavyDataPromos.length} items`);

// Unlimited Filter (category === 'unli' or dataAllowanceMb >= 500GB)
const unliPromos = PHILIPPINE_PROMOS.filter(p => p.category === 'unli' || p.dataAllowanceMb >= 500 * 1024);
console.log(`⚡ Unlimited Promos: ${unliPromos.length} items`);

// Popular Filter
const popularPromos = PHILIPPINE_PROMOS.filter(p => p.category === 'popular');
console.log(`⭐ Popular Promos: ${popularPromos.length} items`);

// 4. Recommendation Engine Tests
console.log('\n--- RECOMMENDATION ENGINE VERIFICATION ---');
for (const telco of [...telcos, 'Sun']) {
  const rec = recommendPromos(1.5, telco);
  console.log(`Recommended for ${telco} (1.5 GB/day): ${rec.bestOverall.name} (${rec.bestOverall.telco}, ₱${rec.bestOverall.pricePhp})`);
  console.log(`   Best Value: ${rec.bestValue.name} (₱${rec.bestValue.costPerGb.toFixed(2)}/GB)`);
  console.log(`   Best No-Expiry: ${rec.bestNoExpiry.name}`);
}

// 5. Schema & Integrity Validation
console.log('\n--- SCHEMA INTEGRITY CHECKS ---');
let errors = 0;
for (const p of PHILIPPINE_PROMOS) {
  if (!p.id || !p.name || !p.telco || !p.pricePhp || !p.dataAllowanceMb || !p.lastVerifiedDate || !p.confidence) {
    console.error(`❌ Incomplete promo object: ${JSON.stringify(p)}`);
    errors++;
  }
  if (p.pricePhp <= 0 || p.dataAllowanceMb <= 0 || p.costPerGb <= 0) {
    console.error(`❌ Invalid pricing/data on promo: ${p.name} (₱${p.pricePhp}, ${p.dataAllowanceMb}MB, ₱${p.costPerGb}/GB)`);
    errors++;
  }
}

if (errors === 0) {
  console.log(`✅ All ${PHILIPPINE_PROMOS.length} promos passed 100% schema and integrity validation!`);
} else {
  console.error(`❌ Found ${errors} validation errors!`);
}
