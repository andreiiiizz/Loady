// ==============================================================================
// CLOUD FUNCTIONS FOR FIREBASE (2ND GEN)
// Replaces Supabase Edge Functions & pg_cron with Cloud Scheduler & Cloud Functions 2nd Gen
// ==============================================================================

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

let isColdStart = true;
const instanceBootTime = Date.now();

interface SimProfileDoc {
  id: string;
  device_id?: string;
  user_id?: string;
  name: string;
  telco: string;
  active_promo?: string;
  total_data_mb: number;
  remaining_data_mb: number;
  expiry_date: string;
  is_no_expiry?: boolean;
  token?: string;
}

interface ThresholdAlert {
  type: '24h' | '6h' | 'low_data' | 'expired';
  title: string;
  body: string;
}

/**
 * Core Evaluation Logic for SIM Promo Expiry & Low Data Thresholds
 */
export async function processPromoThresholdEvaluations(): Promise<{
  simsChecked: number;
  alertsDispatched: number;
  duplicatesSkipped: number;
  coldStart: boolean;
  executionDurationMs: number;
}> {
  const startTime = Date.now();
  const coldStartFlag = isColdStart;
  isColdStart = false;

  logger.info('[SCHEDULER_HEARTBEAT] checkPromoThresholds execution started', {
    coldStart: coldStartFlag,
    instanceUptimeMs: startTime - instanceBootTime,
    timestamp: new Date().toISOString()
  });

  let simsChecked = 0;
  let alertsDispatched = 0;
  let duplicatesSkipped = 0;

  try {
    const simsSnapshot = await db
      .collection('sim_profiles')
      .where('is_no_expiry', '==', false)
      .get();

    simsChecked = simsSnapshot.size;

    if (simsSnapshot.empty) {
      logger.info('[EVALUATION_COMPLETE] No active expiring SIM profiles to evaluate');
      return {
        simsChecked: 0,
        alertsDispatched: 0,
        duplicatesSkipped: 0,
        coldStart: coldStartFlag,
        executionDurationMs: Date.now() - startTime
      };
    }

    const now = Date.now();

    for (const docSnap of simsSnapshot.docs) {
      const sim = { id: docSnap.id, ...docSnap.data() } as SimProfileDoc;

      if (!sim.expiry_date || sim.expiry_date === 'NO_EXPIRY') continue;

      const expiryMs = new Date(sim.expiry_date).getTime();
      const hoursLeft = (expiryMs - now) / (1000 * 60 * 60);
      const promoCycleKey = `${sim.id}_${sim.expiry_date}`;

      const pendingAlerts: ThresholdAlert[] = [];

      // A. Expired
      if (hoursLeft <= 0) {
        pendingAlerts.push({
          type: 'expired',
          title: `⏱️ ${sim.telco} Promo Expired`,
          body: `Your ${sim.active_promo || 'data promo'} has ended. Top up or register a promo before using mobile data.`
        });
      }
      // B. 6-Hour Critical Threshold
      else if (hoursLeft <= 6) {
        pendingAlerts.push({
          type: '6h',
          title: `⚠️ ${sim.telco} Promo Expires in ${Math.round(hoursLeft)} Hours!`,
          body: `You have ${(sim.remaining_data_mb / 1024).toFixed(1)} GB remaining. Pacing suggests consuming or switching promos before expiration.`
        });
      }
      // C. 24-Hour Warning Threshold
      else if (hoursLeft <= 24) {
        pendingAlerts.push({
          type: '24h',
          title: `⏳ 24 Hours Left on ${sim.telco} (${sim.active_promo})`,
          body: `Your promo expires tomorrow. Remaining balance: ${(sim.remaining_data_mb / 1024).toFixed(1)} GB.`
        });
      }

      // D. Low Data Depletion (< 500 MB)
      if (sim.remaining_data_mb > 0 && sim.remaining_data_mb <= 500 && sim.total_data_mb > 1000) {
        pendingAlerts.push({
          type: 'low_data',
          title: `🛑 Low Data Alert: ${Math.round(sim.remaining_data_mb)} MB Left`,
          body: `Your ${sim.telco} data pool is nearly exhausted. Switch to Wi-Fi to preserve navigation data.`
        });
      }

      // Process Alerts for this SIM
      for (const alert of pendingAlerts) {
        const sentLogKey = `sent_${sim.id}_${alert.type}_${promoCycleKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const sentDocRef = db.collection('sent_notifications').doc(sentLogKey);
        const sentDoc = await sentDocRef.get();

        if (sentDoc.exists) {
          duplicatesSkipped++;
          continue; // Already notified for this cycle
        }

        // Fetch User / Device FCM Tokens
        const tokens: string[] = [];
        if (sim.token) {
          tokens.push(sim.token);
        }

        if (sim.device_id) {
          const devSnap = await db
            .collection('push_subscriptions')
            .where('device_id', '==', sim.device_id)
            .get();
          devSnap.forEach(tDoc => {
            const tData = tDoc.data();
            if (tData.token && !tokens.includes(tData.token)) tokens.push(tData.token);
          });
        }

        if (tokens.length === 0 && sim.user_id) {
          const userSnap = await db
            .collection('push_subscriptions')
            .where('user_id', '==', sim.user_id)
            .get();
          userSnap.forEach(tDoc => {
            const tData = tDoc.data();
            if (tData.token && !tokens.includes(tData.token)) tokens.push(tData.token);
          });
        }

        if (tokens.length === 0) {
          logger.warn(`No active push tokens registered for SIM: ${sim.id} (device_id: ${sim.device_id})`);
          continue;
        }

        try {
          const response = await messaging.sendEachForMulticast({
            tokens,
            notification: {
              title: alert.title,
              body: alert.body
            },
            data: {
              url: '/',
              tag: `promo-${alert.type}-${sim.id}`
            },
            webpush: {
              notification: {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `promo-${alert.type}-${sim.id}`
              }
            }
          });

          // Log sent alert in sent_notifications collection to prevent duplicates
          await sentDocRef.set({
            device_id: sim.device_id || null,
            user_id: sim.user_id || null,
            sim_id: sim.id,
            threshold_type: alert.type,
            promo_cycle_key: promoCycleKey,
            success_count: response.successCount,
            failure_count: response.failureCount,
            sent_at: admin.firestore.FieldValue.serverTimestamp()
          });

          alertsDispatched++;
          logger.info(`Dispatched ${alert.type} alert for SIM ${sim.id} (${sim.telco})`, {
            successCount: response.successCount,
            failureCount: response.failureCount
          });
        } catch (pushErr: any) {
          logger.error(`FCM multicast push error for SIM ${sim.id}:`, pushErr);
        }
      }
    }
  } catch (err: any) {
    logger.error('Error during promo threshold processing:', err);
    throw err;
  }

  const duration = Date.now() - startTime;
  logger.info('[EXECUTION_SUMMARY] checkPromoThresholds run finished', {
    simsChecked,
    alertsDispatched,
    duplicatesSkipped,
    durationMs: duration,
    coldStart: coldStartFlag
  });

  return {
    simsChecked,
    alertsDispatched,
    duplicatesSkipped,
    coldStart: coldStartFlag,
    executionDurationMs: duration
  };
}

/**
 * 1. Cloud Scheduler Scheduled Function (2nd Generation)
 * Triggers every 1 hour (Asia/Manila time zone).
 */
export const checkPromoThresholds = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'Asia/Manila',
    retryCount: 3,
    memory: '256MiB',
    timeoutSeconds: 120
  },
  async () => {
    await processPromoThresholdEvaluations();
  }
);

/**
 * 2. Manual HTTP Trigger for Developer Testing / Verification / Emulator
 */
export const testCheckPromoThresholds = onRequest(
  {
    cors: true,
    memory: '256MiB'
  },
  async (req, res) => {
    try {
      const result = await processPromoThresholdEvaluations();
      res.json({ status: 'success', data: result });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  }
);
