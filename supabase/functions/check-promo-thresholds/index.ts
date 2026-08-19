// ==============================================================================
// SUPABASE EDGE FUNCTION: check-promo-thresholds
// Evaluates active SIM profiles against 24h / 6h / 500MB / Expired thresholds,
// and sends Web Push notifications via standard Web Push protocol (VAPID)
// even when the user's app/browser is completely closed.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BCY_x17O79YwPZfF-E3nS-gK-4Z9VqDk5E1Z5T3M2K8J7H6G5F4D3S2A1Q0W9E8R7T6Y5U4I3O2P1A0S9D8F7G6";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "dummy_private_key_replace_in_secrets";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@loady.ph";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SimRow {
  id: string;
  user_id: string;
  name: string;
  telco: string;
  active_promo: string;
  total_data_mb: number;
  remaining_data_mb: number;
  expiry_date: string;
  is_no_expiry: boolean;
}

interface PushSubRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

serve(async (req: Request) => {
  try {
    const now = Date.now();
    const results: any[] = [];

    // 1. Fetch active SIMs with expiration dates
    const { data: sims, error: simError } = await supabase
      .from("sim_profiles")
      .select("*")
      .eq("is_no_expiry", false);

    if (simError) throw simError;
    if (!sims || sims.length === 0) {
      return new Response(JSON.stringify({ message: "No active SIMs to evaluate", checked: 0 }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    for (const sim of sims as SimRow[]) {
      if (!sim.expiry_date || sim.expiry_date === "NO_EXPIRY") continue;

      const expiryMs = new Date(sim.expiry_date).getTime();
      const hoursLeft = (expiryMs - now) / (1000 * 60 * 60);
      const promoCycleKey = `${sim.id}_${sim.expiry_date}`;

      const pendingAlerts: { type: '24h' | '6h' | 'low_data' | 'expired'; title: string; body: string }[] = [];

      // A. Check Expired
      if (hoursLeft <= 0) {
        pendingAlerts.push({
          type: "expired",
          title: `⏱️ ${sim.telco} Promo Expired`,
          body: `Your ${sim.active_promo || "promo"} has expired. Top up or register a promo before using cellular data to avoid standard charges.`
        });
      }
      // B. Check 6-Hour Critical Threshold
      else if (hoursLeft <= 6) {
        pendingAlerts.push({
          type: "6h",
          title: `⚠️ ${sim.telco} Promo Expires in ${Math.round(hoursLeft)} Hours!`,
          body: `You have ${(sim.remaining_data_mb / 1024).toFixed(1)} GB remaining. Pacing suggests consuming or switching promos before expiration.`
        });
      }
      // C. Check 24-Hour Warning Threshold
      else if (hoursLeft <= 24) {
        pendingAlerts.push({
          type: "24h",
          title: `⏳ 24 Hours Left on ${sim.telco} (${sim.active_promo})`,
          body: `Your promo expires tomorrow. Remaining balance: ${(sim.remaining_data_mb / 1024).toFixed(1)} GB.`
        });
      }

      // D. Check Low Data Depletion (< 500 MB)
      if (sim.remaining_data_mb > 0 && sim.remaining_data_mb <= 500 && sim.total_data_mb > 1000) {
        pendingAlerts.push({
          type: "low_data",
          title: `🛑 Low Data Alert: ${Math.round(sim.remaining_data_mb)} MB Left`,
          body: `Your ${sim.telco} data pool is nearly empty. Switch to Wi-Fi to preserve data.`
        });
      }

      // 2. Process pending alerts for this SIM
      for (const alert of pendingAlerts) {
        // Check if already dispatched for this promo cycle
        const { data: alreadySent } = await supabase
          .from("sent_notifications")
          .select("id")
          .eq("sim_id", sim.id)
          .eq("threshold_type", alert.type)
          .eq("promo_cycle_key", promoCycleKey)
          .single();

        if (alreadySent) {
          continue; // Skip: already notified
        }

        // Fetch user's registered Push Subscriptions
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", sim.user_id);

        if (!subscriptions || subscriptions.length === 0) continue;

        let sentSuccess = false;
        for (const sub of subscriptions as PushSubRow[]) {
          try {
            const pushPayload = JSON.stringify({
              title: alert.title,
              body: alert.body,
              icon: "/favicon.ico",
              tag: `promo-${alert.type}-${sim.id}`,
              data: { url: "/" }
            });

            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth
                }
              },
              pushPayload
            );
            sentSuccess = true;
          } catch (pushErr: any) {
            // If subscription is expired / gone (410 Gone / 404), clean it up
            if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }

        if (sentSuccess) {
          // Log alert to prevent re-triggering
          await supabase.from("sent_notifications").insert({
            user_id: sim.user_id,
            sim_id: sim.id,
            threshold_type: alert.type,
            promo_cycle_key: promoCycleKey,
            payload: { title: alert.title, body: alert.body }
          });

          results.push({ sim_id: sim.id, type: alert.type, telco: sim.telco });
        }
      }
    }

    return new Response(JSON.stringify({ status: "success", dispatched: results.length, results }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
