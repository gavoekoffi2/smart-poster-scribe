import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp, x-webhook-event, x-webhook-environment, x-webhook-delivery",
};

async function verifySignature(secret: string, timestamp: string, rawBody: string, signature: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
    const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    // constant-time compare
    if (hex.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error("[geniuspay-webhook] sig verify error", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("GENIUSPAY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response("backend not configured", { status: 500, headers: corsHeaders });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const event = req.headers.get("x-webhook-event") || "";

    if (webhookSecret) {
      if (!signature || !timestamp) {
        return new Response("missing signature", { status: 401, headers: corsHeaders });
      }
      const ts = Number(timestamp);
      if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
        return new Response("timestamp too old", { status: 400, headers: corsHeaders });
      }
      const ok = await verifySignature(webhookSecret, timestamp, rawBody, signature);
      if (!ok) {
        return new Response("invalid signature", { status: 401, headers: corsHeaders });
      }
    } else {
      console.warn("[geniuspay-webhook] GENIUSPAY_WEBHOOK_SECRET not set — skipping signature verification");
    }

    const payload = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        reference?: string;
        status?: string;
        metadata?: Record<string, string>;
        amount?: number;
      };
    };
    const eventName = event || payload.event || "";
    const data = payload.data || {};
    const reference = data.reference;
    const metadata = data.metadata || {};
    const transactionId = metadata.transaction_id;
    const userId = metadata.user_id;
    const planId = metadata.plan_id;

    console.log("[geniuspay-webhook]", { eventName, reference, transactionId });

    if (eventName === "webhook.test") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Locate transaction
    let txQuery = supabase.from("payment_transactions").select("*").limit(1);
    if (transactionId) {
      txQuery = txQuery.eq("id", transactionId);
    } else if (reference) {
      txQuery = txQuery.contains("metadata", { geniuspay_reference: reference });
    } else {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: tx } = await txQuery.maybeSingle();
    if (!tx) {
      console.warn("[geniuspay-webhook] transaction not found", { transactionId, reference });
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tx.status === "completed") {
      return new Response(JSON.stringify({ ok: true, already_completed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (eventName) {
      case "payment.success": {
        await supabase
          .from("payment_transactions")
          .update({
            status: "completed",
            metadata: { ...(tx.metadata as object), webhook_event: eventName },
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.id);

        // Activate / renew subscription
        const targetUserId = userId || tx.user_id;
        const targetPlanId = planId || tx.plan_id;
        if (targetUserId && targetPlanId) {
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("credits_per_month")
            .eq("id", targetPlanId)
            .single();

          const credits = plan?.credits_per_month ?? 0;
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", targetUserId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSub) {
            await supabase
              .from("user_subscriptions")
              .update({
                plan_id: targetPlanId,
                credits_remaining: credits,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                status: "active",
                updated_at: now.toISOString(),
              })
              .eq("id", existingSub.id);
          } else {
            await supabase.from("user_subscriptions").insert({
              user_id: targetUserId,
              plan_id: targetPlanId,
              credits_remaining: credits,
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              status: "active",
            });
          }
        }
        break;
      }
      case "payment.failed":
      case "payment.cancelled":
      case "payment.expired":
      case "payment.refunded": {
        const newStatus =
          eventName === "payment.failed" ? "failed" :
          eventName === "payment.cancelled" ? "cancelled" :
          eventName === "payment.expired" ? "expired" : "refunded";
        await supabase
          .from("payment_transactions")
          .update({
            status: newStatus,
            metadata: { ...(tx.metadata as object), webhook_event: eventName },
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.id);
        break;
      }
      default:
        console.log("[geniuspay-webhook] unhandled event", eventName);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[geniuspay-webhook] error", error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
