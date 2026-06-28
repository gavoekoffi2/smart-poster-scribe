import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENIUSPAY_API_BASE = "https://geniuspay.ci/api/v1/merchant";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GENIUSPAY_API_KEY");
    const apiSecret = Deno.env.get("GENIUSPAY_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !apiSecret) {
      throw new Error("Clés GeniusPay non configurées");
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuration backend manquante");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Authentification requise");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Utilisateur non authentifié");

    const body = await req.json();
    const { planSlug, returnUrl, customerPhone, customerName, country, paymentMethod, mmoProvider } = body as {
      planSlug?: string; returnUrl?: string; customerPhone?: string; customerName?: string;
      country?: string; paymentMethod?: string; mmoProvider?: string;
    };
    if (!planSlug) throw new Error("Plan non spécifié");

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();

    if (planError || !plan) throw new Error(`Plan introuvable: ${planSlug}`);
    if (plan.slug === "free") throw new Error("Le plan gratuit ne nécessite pas de paiement");
    if (plan.slug === "enterprise") throw new Error("Veuillez nous contacter pour le plan Entreprise");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, referred_by")
      .eq("user_id", user.id)
      .single();

    const fullName = customerName || profile?.full_name || "Client";

    // Server-side referral discount: 10% off the first ever payment of a referred user
    let discountRate = 0;
    let referralCode: string | null = null;
    const referredBy = (profile as { referred_by?: string | null } | null)?.referred_by ?? null;
    if (referredBy) {
      const { count } = await supabase
        .from("payment_transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed");
      if ((count ?? 0) === 0) {
        discountRate = 0.10;
        referralCode = referredBy;
      }
    }

    const finalAmountFcfa = Math.round(plan.price_fcfa * (1 - discountRate));
    const finalAmountUsd = Math.round(plan.price_usd * (1 - discountRate) * 100) / 100;

    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_fcfa: finalAmountFcfa,
        amount_usd: finalAmountUsd,
        status: "pending",
        payment_method: "geniuspay",
        metadata: {
          plan_slug: planSlug,
          provider: "geniuspay",
          referral_discount: discountRate,
          referred_by: referralCode,
          original_price_fcfa: plan.price_fcfa,
        },
      })
      .select()
      .single();

    if (txError || !transaction) {
      throw new Error("Erreur création transaction: " + (txError?.message || "unknown"));
    }

    const origin = req.headers.get("origin") || "";
    const successUrl = returnUrl || `${origin}/account?payment=success`;
    const errorUrl = `${origin}/account?payment=failed`;

    const gpRequest: Record<string, unknown> = {
      amount: finalAmountFcfa,
      currency: "XOF",
      description: discountRate > 0
        ? `Abonnement ${plan.name} - Graphiste GPT (-10% parrainage)`
        : `Abonnement ${plan.name} - Graphiste GPT`,
      success_url: successUrl,
      error_url: errorUrl,
      customer: {
        name: fullName,
        email: user.email || undefined,
        phone: customerPhone || (profile as { phone?: string } | null)?.phone || undefined,
        country: country ? country.toUpperCase() : undefined,
      },
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        transaction_id: transaction.id,
        plan_slug: planSlug,
        country: country || null,
        requested_method: paymentMethod || null,
        referral_discount: discountRate,
        referred_by: referralCode,
      },
    };

    // Routage explicite : si un moyen de paiement précis est demandé, on l'envoie.
    // Sinon, GeniusPay affiche sa page de checkout avec tous les moyens.
    if (paymentMethod) {
      gpRequest.payment_method = paymentMethod;
      if (paymentMethod === "pawapay" && mmoProvider) {
        gpRequest.mmo_provider = mmoProvider;
      }
    }

    console.log("[geniuspay] init payment", { tx: transaction.id, amount: plan.price_fcfa });

    const gpRes = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(gpRequest),
    });

    const gpJson = await gpRes.json();
    console.log("[geniuspay] response status", gpRes.status, "ok:", gpJson?.success);

    const data = gpJson?.data;
    const checkoutUrl = data?.checkout_url || data?.payment_url;

    if (!gpRes.ok || !gpJson?.success || !checkoutUrl) {
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          metadata: { ...(transaction.metadata as object), error: gpJson?.error || gpJson?.message || "init_failed" },
        })
        .eq("id", transaction.id);

      const msg = gpJson?.error?.message || gpJson?.message || "Échec de l'initialisation du paiement";
      throw new Error(msg);
    }

    await supabase
      .from("payment_transactions")
      .update({
        metadata: {
          ...(transaction.metadata as object),
          geniuspay_reference: data.reference,
          geniuspay_id: data.id,
        },
      })
      .eq("id", transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl,
        reference: data.reference,
        transactionId: transaction.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[geniuspay] error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
