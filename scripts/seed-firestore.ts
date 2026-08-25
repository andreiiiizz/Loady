/**
 * Firestore Barangay & Coverage Seeding Script (Batangas Province Launch)
 * Seeds ~1,078 Batangas Barangays to Firestore `barangays/{barangay_code}`
 * and seeds initial ground coverage reports.
 *
 * Usage:
 * npx tsx scripts/seed-firestore.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { BATANGAS_BARANGAYS } from '../src/data/batangasBarangays';
import { INITIAL_COVERAGE_REPORTS } from '../src/services/coverageData';

// Initialize Admin SDK with default credentials or project ID
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'loady-ph'
  });
}

const db = getFirestore();

async function seedFirestore() {
  console.log(`🚀 Starting Firestore seeding for Batangas Launch...`);
  console.log(`📦 Found ${BATANGAS_BARANGAYS.length} Batangas barangays across 34 LGUs.`);

  // 1. Batch seed barangays in chunks of 450 (Firestore limit is 500 operations per batch)
  const CHUNK_SIZE = 400;
  let seededBarangays = 0;

  for (let i = 0; i < BATANGAS_BARANGAYS.length; i += CHUNK_SIZE) {
    const chunk = BATANGAS_BARANGAYS.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();

    chunk.forEach((barangay) => {
      const docRef = db.collection('barangays').doc(barangay.barangay_code);
      batch.set(docRef, {
        barangay_code: barangay.barangay_code,
        name: barangay.name,
        municipality: barangay.municipality,
        province: barangay.province,
        lat: barangay.lat,
        lng: barangay.lng,
        created_at: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
    seededBarangays += chunk.length;
    console.log(`  ✓ Seeded ${seededBarangays} / ${BATANGAS_BARANGAYS.length} barangays`);
  }

  // 2. Seed Initial Ground Coverage Reports
  console.log(`📡 Seeding initial coverage reports...`);
  const reportBatch = db.batch();

  INITIAL_COVERAGE_REPORTS.forEach((report) => {
    const docRef = db.collection('coverage_reports').doc(report.id);
    reportBatch.set(docRef, {
      barangay_code: report.barangay_code || null,
      telco: report.telco,
      barangay: report.barangay,
      city: report.city,
      province: report.province,
      lat: report.coordinates[0],
      lng: report.coordinates[1],
      signal_rating: report.signalRating,
      network_type: report.networkType,
      speed_mbps: report.speedMbps || null,
      notes: report.notes || null,
      upvotes: report.upvotes || 1,
      reporter_name: report.reporterName || 'Loady Scout',
      created_at: report.reportedAt || new Date().toISOString()
    }, { merge: true });
  });

  await reportBatch.commit();
  console.log(`  ✓ Seeded ${INITIAL_COVERAGE_REPORTS.length} initial coverage reports.`);
  console.log(`🎉 Seeding successfully completed!`);
}

seedFirestore().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
