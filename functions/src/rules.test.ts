import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'loady-test-project',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080
    }
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

describe('Firestore Security Rules Test Suite (No-Auth Access Control)', () => {

  // 1. BARANGAYS COLLECTION TESTS
  describe('1. barangays collection rules', () => {
    it('REJECTS client write (admin SDK only)', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('barangays').doc('btg_test_brgy');
      await assertFails(
        docRef.set({
          name: 'Illegal Barangay',
          municipality: 'Batangas City',
          province: 'Batangas',
          lat: 13.75,
          lng: 121.05
        })
      );
    });

    it('SUCCEEDS on unauthenticated public read', async () => {
      // Seed a barangay with Admin Context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('barangays').doc('btg_batangas_city_alangilan').set({
          barangay_code: 'btg_batangas_city_alangilan',
          name: 'Alangilan',
          municipality: 'Batangas City',
          province: 'Batangas',
          lat: 13.7844,
          lng: 121.0743
        });
      });

      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('barangays').doc('btg_batangas_city_alangilan');
      await assertSucceeds(docRef.get());
    });
  });

  // 2. COVERAGE REPORTS COLLECTION TESTS (LOCKED DOWN & DEPRECATED)
  describe('2. coverage_reports collection rules (locked down)', () => {
    it('REJECTS client read on coverage_reports', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('coverage_reports').doc('rep_legacy_1').set({
          barangay_code: 'btg_batangas_city_alangilan',
          telco: 'Smart',
          signal_rating: 5
        });
      });

      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('coverage_reports').doc('rep_legacy_1');
      await assertFails(docRef.get());
    });

    it('REJECTS client create on coverage_reports', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('coverage_reports').doc('rep_new');
      await assertFails(
        docRef.set({
          barangay_code: 'btg_batangas_city_alangilan',
          telco: 'Smart',
          signal_rating: 5
        })
      );
    });

    it('REJECTS client update/upvote on coverage_reports', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('coverage_reports').doc('rep_upvote_locked').set({
          upvotes: 1
        });
      });

      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('coverage_reports').doc('rep_upvote_locked');
      await assertFails(docRef.update({ upvotes: 2 }));
    });
  });

  // 3. USER CHECK-INS TESTS
  describe('3. user_checkins collection rules', () => {
    it('SUCCEEDS on unauthenticated check-in create', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('user_checkins').doc('chk_1');
      await assertSucceeds(
        docRef.set({
          device_fingerprint: 'sha256_device_1',
          barangay_code: 'btg_batangas_city_alangilan',
          telco: 'Smart',
          signal_rating: 5,
          network_type: '5G',
          timestamp: new Date().toISOString()
        })
      );
    });

    it('SUCCEEDS on public read of telemetry check-ins', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('user_checkins').doc('chk_public').set({
          device_fingerprint: 'sha256_public',
          barangay_code: 'btg_batangas_city_alangilan',
          telco: 'Globe',
          signal_rating: 4,
          network_type: '4G/LTE',
          timestamp: new Date().toISOString()
        });
      });

      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('user_checkins').doc('chk_public');
      await assertSucceeds(docRef.get());
    });
  });

  // 4. SENT NOTIFICATIONS (ADMIN-ONLY) TESTS
  describe('4. sent_notifications collection rules', () => {
    it('REJECTS ALL client reads and writes', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('sent_notifications').doc('sent_log_1');

      await assertFails(
        docRef.set({
          device_id: 'dev_123',
          sim_id: 'sim_1',
          threshold_type: '24h'
        })
      );

      await assertFails(docRef.get());
    });
  });

  // 5. SIM PROFILES TESTS (Device-Scoped Guard)
  describe('5. sim_profiles collection rules', () => {
    beforeEach(async () => {
      // Seed a SIM profile owned by device_A
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('sim_profiles').doc('sim_alpha').set({
          id: 'sim_alpha',
          device_id: 'sha256_device_A',
          name: 'Primary SIM',
          telco: 'Smart',
          total_data_mb: 8192,
          remaining_data_mb: 4096,
          expiry_date: '2026-09-01T00:00:00.000Z',
          is_no_expiry: false
        });
      });
    });

    it('SUCCEEDS on valid unauthenticated sim_profile creation', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('sim_profiles').doc('sim_beta');
      await assertSucceeds(
        docRef.set({
          id: 'sim_beta',
          device_id: 'sha256_device_B',
          name: 'Secondary SIM',
          telco: 'Globe',
          total_data_mb: 4096,
          remaining_data_mb: 2048,
          expiry_date: '2026-09-05T00:00:00.000Z',
          is_no_expiry: false
        })
      );
    });

    it('REJECTS update where device_id differs from existing document device_id', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('sim_profiles').doc('sim_alpha');

      // Attempting to hijack device_A's sim profile with device_Attacker
      await assertFails(
        docRef.update({
          device_id: 'sha256_device_Attacker',
          remaining_data_mb: 0
        })
      );
    });

    it('SUCCEEDS on update where device_id matches existing document device_id', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('sim_profiles').doc('sim_alpha');

      await assertSucceeds(
        docRef.update({
          device_id: 'sha256_device_A',
          remaining_data_mb: 3500
        })
      );
    });
  });

  // 6. PUSH SUBSCRIPTIONS TESTS (Device-Scoped Guard)
  describe('6. push_subscriptions collection rules', () => {
    beforeEach(async () => {
      // Seed a push subscription owned by device_X
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('push_subscriptions').doc('sub_x').set({
          token: 'fcm_token_device_X',
          device_id: 'sha256_device_X',
          device_fingerprint: 'sha256_device_X'
        });
      });
    });

    it('SUCCEEDS on valid unauthenticated push subscription creation', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('push_subscriptions').doc('sub_y');
      await assertSucceeds(
        docRef.set({
          token: 'fcm_token_device_Y',
          device_id: 'sha256_device_Y',
          device_fingerprint: 'sha256_device_Y'
        })
      );
    });

    it('REJECTS update where device_id differs from existing document device_id', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('push_subscriptions').doc('sub_x');

      // Attempting to overwrite device_X's push token from device_Attacker
      await assertFails(
        docRef.update({
          token: 'hacked_token',
          device_id: 'sha256_device_Attacker'
        })
      );
    });

    it('SUCCEEDS on update where device_id matches existing document device_id', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('push_subscriptions').doc('sub_x');

      await assertSucceeds(
        docRef.update({
          token: 'fcm_token_device_X_refreshed',
          device_id: 'sha256_device_X'
        })
      );
    });

    it('REJECTS client read and delete on push_subscriptions', async () => {
      const clientDb = testEnv.unauthenticatedContext().firestore();
      const docRef = clientDb.collection('push_subscriptions').doc('sub_x');

      await assertFails(docRef.get());
      await assertFails(docRef.delete());
    });
  });
});
