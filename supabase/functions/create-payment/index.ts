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
  console.log("[create-payment] Request received:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MONEROO_SECRET_KEY = Deno.env.get("MONEROO_SECRET_KEY");
    console.log("[create-payment] MONEROO_SECRET_KEY present:", !!MONEROO_SECRET_KEY);
    
    if (!MONEROO_SECRET_KEY) {
      console.error("[create-payment] MONEROO_SECRET_KEY not configured");
      throw new Error("MONEROO_SECRET_KEY non configurée");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("[create-payment] Supabase config present:", { 
      url: !!supabaseUrl, 
      serviceKey: !!supabaseServiceKey 
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    console.log("[create-payment] Auth header present:", !!authHeader);
    
    if (!authHeader) {
      throw new Error("Authentification requise");
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    console.log("[create-payment] User verification:", { 
      userId: user?.id, 
      email: user?.email,
      error: authError?.message 
    });
    
    if (authError || !user) {
      throw new Error("Utilisateur non authentifié");
    }

    const body = await req.json();
    const { planSlug, returnUrl } = body;
    console.log("[create-payment] Request body:", { planSlug, returnUrl });

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

    console.log("[create-payment] Plan lookup:", { 
      planId: plan?.id, 
      planName: plan?.name,
      planSlug: plan?.slug,
      error: planError?.message 
    });

    if (planError || !plan) {
      throw new Error(`Plan introuvable: ${planSlug}`);
    }

    if (plan.slug === "free") {
      throw new Error("Le plan gratuit ne nécessite pas de paiement");
    }

    if (plan.slug === "enterprise") {
      throw new Error("Veuillez nous contacter pour le plan Entreprise");
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
    console.log("[create-payment] Creating transaction record...");
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

    console.log("[create-payment] Transaction created:", { 
      transactionId: transaction?.id, 
      error: txError?.message 
    });

    if (txError || !transaction) {
      console.error("[create-payment] Error creating transaction:", txError);
      throw new Error("Erreur création transaction: " + (txError?.message || "unknown"));
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
