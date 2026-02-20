import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json();
    
    console.log("FedaPay webhook received:", JSON.stringify(payload, null, 2));

    // FedaPay sends: { entity: "event", name: "transaction.approved", object: { ... } }
    const eventName = payload.name || payload.event;
    const transactionData = payload.object || payload.data;

    if (!transactionData) {
      throw new Error("Payload invalide - pas de données de transaction");
    }

    const customMetadata = transactionData.custom_metadata || transactionData.metadata || {};
    const { user_id, plan_id, transaction_id, plan_slug } = customMetadata;

    console.log("Metadata:", { user_id, plan_id, transaction_id, plan_slug, eventName });

    if (!user_id || !plan_id || !transaction_id) {
      console.error("Missing metadata:", customMetadata);
      throw new Error("Métadonnées manquantes");
    }

    // Handle successful payment
    const isSuccess = eventName === "transaction.approved" || 
                      eventName === "transaction.completed" ||
                      transactionData.status === "approved";

    if (isSuccess) {
      console.log(`Payment successful for user ${user_id}, plan ${plan_slug}`);

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", plan_id)
        .single();

      if (planError || !plan) {
        throw new Error("Plan introuvable");
      }

      // Update payment transaction
      await supabase
        .from("payment_transactions")
        .update({
          status: "success",
          payment_method: transactionData.mode || "fedapay",
          moneroo_payment_id: String(transactionData.id || ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction_id);

      // Update or create subscription
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (existingSub) {
        await supabase
          .from("user_subscriptions")
          .update({
            plan_id,
            status: "active",
            credits_remaining: plan.credits_per_month,
            free_generations_used: 0,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", existingSub.id);
      } else {
        await supabase
          .from("user_subscriptions")
          .insert({
            user_id,
            plan_id,
            status: "active",
            credits_remaining: plan.credits_per_month,
            free_generations_used: 0,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          });
      }

      // Record credit transaction
      await supabase
        .from("credit_transactions")
        .insert({
          user_id,
          amount: plan.credits_per_month,
          type: "subscription_renewal",
          description: `Activation abonnement ${plan.name} via FedaPay`,
        });

      console.log(`✅ Subscription activated for user ${user_id}`);

      return new Response(
        JSON.stringify({ success: true, message: "Abonnement activé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle failed payment
    if (eventName === "transaction.declined" || eventName === "transaction.canceled" || transactionData.status === "declined") {
      await supabase
        .from("payment_transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", transaction_id);

      return new Response(
        JSON.stringify({ success: true, message: "Échec enregistré" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Unknown event: ${eventName}`);
    return new Response(
      JSON.stringify({ success: true, message: "Événement reçu" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
