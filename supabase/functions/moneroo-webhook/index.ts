import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-moneroo-signature",
};

interface MonerooWebhookPayload {
  event: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      email: string;
      first_name: string;
      last_name: string;
    };
    metadata: {
      user_id: string;
      plan_id: string;
      transaction_id: string;
      plan_slug: string;
    };
    payment_method?: string;
    processed_at?: string;
  };
}

/**
 * Verify HMAC-SHA256 signature from Moneroo
 */
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const computedHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computedHex === signature;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MONEROO_WEBHOOK_SECRET = Deno.env.get("MONEROO_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Verify HMAC signature if secret is configured
    const signature = req.headers.get("x-moneroo-signature");
    if (MONEROO_WEBHOOK_SECRET) {
      if (!signature) {
        console.error("Missing webhook signature");
        return new Response(JSON.stringify({ error: "Signature manquante" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isValid = await verifySignature(rawBody, signature, MONEROO_WEBHOOK_SECRET);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Signature invalide" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("✅ Webhook signature verified");
    } else {
      console.warn("⚠️ MONEROO_WEBHOOK_SECRET not set, skipping signature verification");
    }

    const payload = JSON.parse(rawBody) as MonerooWebhookPayload;
    console.log("Webhook payload:", JSON.stringify(payload, null, 2));

    const { event, data } = payload;

    if (!event || !data) {
      throw new Error("Payload invalide");
    }

    const { user_id, plan_id, transaction_id, plan_slug } = data.metadata || {};

    if (!user_id || !plan_id || !transaction_id) {
      console.error("Missing metadata:", data.metadata);
      throw new Error("Métadonnées manquantes");
    }

    // Handle payment success (Moneroo uses "payment.success")
    if (event === "payment.success" || event === "payment.successful" || data.status === "success") {
      console.log(`Payment successful for user ${user_id}, plan ${plan_slug}`);

      // Get plan details for credits
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", plan_id)
        .single();

      if (planError || !plan) {
        console.error("Plan not found:", planError);
        throw new Error("Plan introuvable");
      }

      // Update payment transaction
      const { error: txUpdateError } = await supabase
        .from("payment_transactions")
        .update({
          status: "success",
          payment_method: data.payment_method || "unknown",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction_id);

      if (txUpdateError) {
        console.error("Error updating transaction:", txUpdateError);
      }

      // Check if user already has a subscription
      const { data: existingSubscription } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (existingSubscription) {
        const { error: subUpdateError } = await supabase
          .from("user_subscriptions")
          .update({
            plan_id: plan_id,
            status: "active",
            credits_remaining: plan.credits_per_month,
            free_generations_used: 0,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            moneroo_subscription_id: data.id,
            updated_at: now.toISOString(),
          })
          .eq("id", existingSubscription.id);

        if (subUpdateError) {
          console.error("Error updating subscription:", subUpdateError);
          throw new Error("Erreur mise à jour abonnement");
        }
      } else {
        const { error: subCreateError } = await supabase
          .from("user_subscriptions")
          .insert({
            user_id: user_id,
            plan_id: plan_id,
            status: "active",
            credits_remaining: plan.credits_per_month,
            free_generations_used: 0,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            moneroo_subscription_id: data.id,
          });

        if (subCreateError) {
          console.error("Error creating subscription:", subCreateError);
          throw new Error("Erreur création abonnement");
        }
      }

      // Record credit transaction
      const { error: creditError } = await supabase
        .from("credit_transactions")
        .insert({
          user_id: user_id,
          amount: plan.credits_per_month,
          type: "subscription_renewal",
          description: `Activation abonnement ${plan.name}`,
        });

      if (creditError) {
        console.error("Error recording credit transaction:", creditError);
      }

      console.log(`✅ Subscription activated for user ${user_id} with ${plan.credits_per_month} credits`);

      return new Response(
        JSON.stringify({ success: true, message: "Abonnement activé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle payment failure
    if (event === "payment.failed" || data.status === "failed") {
      console.log(`Payment failed for user ${user_id}`);

      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction_id);

      return new Response(
        JSON.stringify({ success: true, message: "Paiement échoué enregistré" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle refund
    if (event === "payment.refunded") {
      console.log(`Payment refunded for user ${user_id}`);

      await supabase
        .from("payment_transactions")
        .update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction_id);

      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("slug", "free")
        .single();

      if (freePlan) {
        await supabase
          .from("user_subscriptions")
          .update({
            plan_id: freePlan.id,
            status: "active",
            credits_remaining: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user_id);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Remboursement traité" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown event
    console.log(`Unknown event: ${event}`);
    return new Response(
      JSON.stringify({ success: true, message: "Événement reçu" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
