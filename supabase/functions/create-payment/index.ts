import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONEROO_API_BASE = "https://api.moneroo.io/v1";

interface MonerooPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
  };
  return_url: string;
  metadata: Record<string, string>;
}

interface MonerooPaymentResponse {
  status: string;
  message: string;
  data?: {
    id: string;
    checkout_url: string;
    status: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MONEROO_SECRET_KEY = Deno.env.get("MONEROO_SECRET_KEY");
    if (!MONEROO_SECRET_KEY) {
      throw new Error("MONEROO_SECRET_KEY non configurée");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authentification requise");
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Utilisateur non authentifié");
    }

    const body = await req.json();
    const { planSlug, returnUrl } = body;

    if (!planSlug) {
      throw new Error("Plan non spécifié");
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      throw new Error("Plan introuvable");
    }

    if (plan.slug === "free") {
      throw new Error("Le plan gratuit ne nécessite pas de paiement");
    }

    if (plan.slug === "enterprise") {
      throw new Error("Veuillez nous contacter pour le plan Enterprise");
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const fullName = profile?.full_name || "Client";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "Client";
    const lastName = nameParts.slice(1).join(" ") || "Graphiste GPT";

    // Create payment transaction record
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount_fcfa: plan.price_fcfa,
        amount_usd: plan.price_usd,
        status: "pending",
        metadata: { plan_slug: planSlug }
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.error("Error creating transaction:", txError);
      throw new Error("Erreur création transaction");
    }

    // Create Moneroo payment
    const monerooRequest: MonerooPaymentRequest = {
      amount: plan.price_fcfa,
      currency: "XOF",
      description: `Abonnement ${plan.name} - Graphiste GPT`,
      customer: {
        email: user.email || "",
        first_name: firstName,
        last_name: lastName,
      },
      return_url: returnUrl || `${req.headers.get("origin")}/account?payment=success`,
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        transaction_id: transaction.id,
        plan_slug: planSlug,
      },
    };

    console.log("Creating Moneroo payment:", JSON.stringify(monerooRequest, null, 2));

    const monerooResponse = await fetch(`${MONEROO_API_BASE}/payments/initialize`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MONEROO_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(monerooRequest),
    });

    const monerooData = await monerooResponse.json() as MonerooPaymentResponse;
    console.log("Moneroo response:", JSON.stringify(monerooData, null, 2));

    if (!monerooResponse.ok || !monerooData.data?.checkout_url) {
      console.error("Moneroo error:", monerooData);
      
      // Update transaction as failed
      await supabase
        .from("payment_transactions")
        .update({ 
          status: "failed",
          metadata: { ...transaction.metadata, error: monerooData.message }
        })
        .eq("id", transaction.id);

      throw new Error(monerooData.message || "Erreur initialisation paiement");
    }

    // Update transaction with Moneroo payment ID
    await supabase
      .from("payment_transactions")
      .update({ 
        moneroo_payment_id: monerooData.data.id,
      })
      .eq("id", transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: monerooData.data.checkout_url,
        paymentId: monerooData.data.id,
        transactionId: transaction.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Create payment error:", error);
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
