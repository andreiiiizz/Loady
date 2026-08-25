/**
 * Supabase -> Firestore Data Migration Script
 * Exports live coverage_reports and user SIM profiles from Supabase Postgres,
 * maps geographical coordinates to flat `barangay_code` foreign keys via local Haversine lookup,
 * and batch imports them into Firestore.
 *
 * Usage:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... FIREBASE_PROJECT_ID=... npx tsx scripts/migrate-supabase-to-firestore.ts
 */

import { createClient } from '@supabase/supabase-js';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { findNearestBarangayLocal } from '../src/data/batangasBarangays';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'loady-ph';

if (getApps().length === 0) {
  initializeApp({ projectId: FIREBASE_PROJECT_ID });
}

const db = getFirestore();

async function migrateData() {
  console.log('🔄 Checking Supabase connection and data to migrate...');

  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.startsWith('http://localhost') || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.log('ℹ️  No live Supabase credentials provided or greenfield deployment detected.');
    console.log('👉 To seed fresh Batangas data into Firestore, run: npm run seed or npx tsx scripts/seed-firestore.ts');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Migrate Coverage Reports
  console.log('📡 Fetching coverage reports from Supabase...');
  const { data: reports, error: reportsErr } = await supabase
    .from('coverage_reports')
    .select('*');

  if (reportsErr) {
    console.error('❌ Failed to fetch from Supabase coverage_reports:', reportsErr.message);
  } else if (reports && reports.length > 0) {
    console.log(`📦 Found ${reports.length} reports in Supabase. Mapping to Firestore schema...`);
    const batch = db.batch();

    reports.forEach((row) => {
      const lat = row.lat;
      const lng = row.lng;
      const nearest = findNearestBarangayLocal(lat, lng);

      const docRef = db.collection('coverage_reports').doc(row.id.toString());
      batch.set(docRef, {
        barangay_code: nearest.barangay.barangay_code,
        telco: row.telco,
        barangay: row.barangay || nearest.barangay.name,
        city: row.city || nearest.barangay.municipality,
        province: row.province || nearest.barangay.province,
        lat,
        lng,
        signal_rating: row.signal_rating,
        network_type: row.network_type,
        speed_mbps: row.speed_mbps || null,
        notes: row.notes || null,
        upvotes: row.upvotes || 1,
        created_at: row.created_at || new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
    console.log(`  ✓ Successfully migrated ${reports.length} coverage reports to Firestore.`);
  } else {
    console.log('ℹ️  No existing coverage reports found in Supabase (Greenfield build).');
  }

  // 2. Migrate SIM Profiles
  console.log('📱 Fetching SIM profiles from Supabase...');
  const { data: sims, error: simsErr } = await supabase
    .from('sim_profiles')
    .select('*');

  if (!simsErr && sims && sims.length > 0) {
    console.log(`📦 Found ${sims.length} SIM profiles in Supabase. Migrating to Firestore...`);
    const simBatch = db.batch();

    sims.forEach((sim) => {
      const docRef = db.collection('sim_profiles').doc(sim.id.toString());
      simBatch.set(docRef, {
        user_id: sim.user_id,
        name: sim.name,
        telco: sim.telco,
        phone_number: sim.phone_number,
        active_promo: sim.active_promo,
        total_data_mb: sim.total_data_mb,
        remaining_data_mb: sim.remaining_data_mb,
        expiry_date: sim.expiry_date,
        is_no_expiry: sim.is_no_expiry,
        regular_balance_php: sim.regular_balance_php,
        created_at: sim.created_at || new Date().toISOString()
      }, { merge: true });
    });

    await simBatch.commit();
    console.log(`  ✓ Successfully migrated ${sims.length} SIM profiles to Firestore.`);
  }

  console.log('🎉 Migration script completed.');
}

migrateData().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
