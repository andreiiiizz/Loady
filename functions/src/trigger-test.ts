import * as admin from 'firebase-admin';

// Initialize Admin SDK with emulator configuration
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'loady-test-project'
  });
}

const db = admin.firestore();

async function runScheduledFunctionTriggerTest() {
  console.log('⚡ Triggering Cloud Function Scheduled Job execution test...');

  // Seed sample active expiring SIM profile and push token in Firestore emulator
  const sampleSimRef = db.collection('sim_profiles').doc('sim_test_user_smart');
  await sampleSimRef.set({
    id: 'sim_test_user_smart',
    user_id: 'user_tester_99',
    name: 'Primary Smart 5G',
    telco: 'Smart',
    active_promo: 'Power All 99',
    total_data_mb: 8192,
    remaining_data_mb: 450, // Low data (< 500 MB)
    expiry_date: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours left (6h critical)
    is_no_expiry: false
  });

  const pushSubRef = db.collection('push_subscriptions').doc('fcm_tester_token_1');
  await pushSubRef.set({
    token: 'mock_fcm_registration_token_xyz_123',
    user_id: 'user_tester_99',
    device_fingerprint: 'sha256_mock_device_token'
  });

  console.log('📦 Seeded test SIM and push subscription in Firestore emulator.');

  // Dynamically import processPromoThresholdEvaluations
  const { processPromoThresholdEvaluations } = await import('./index');

  console.log('▶️ Executing processPromoThresholdEvaluations()...');
  const result = await processPromoThresholdEvaluations();

  console.log('📊 Cloud Scheduler Execution Summary:');
  console.log(JSON.stringify(result, null, 2));
}

runScheduledFunctionTriggerTest().catch((err) => {
  console.error('❌ Execution failed:', err);
  process.exit(1);
});
