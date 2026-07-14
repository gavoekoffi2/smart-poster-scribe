import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const FEDAPAY_PUBLIC_KEY = "pk_live_PkAah-Uc8DIy5pj0gQDx0w9d";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_fcfa: number;
  price_usd: number;
  credits_per_month: number;
  max_resolution: string;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  credits_remaining: number;
  free_generations_used: number;
  current_period_start: string;
  current_period_end: string;
  plan?: SubscriptionPlan;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  resolution_used: string | null;
  description: string | null;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (!error && data) {
      const typedPlans = data.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features as string[] : []
      }));
      setPlans(typedPlans);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      return;
    }

    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(`*, plan:subscription_plans(*)`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const typedSubscription: UserSubscription = {
        ...data,
        plan: data.plan ? {
          ...data.plan,
          features: Array.isArray(data.plan.features) ? data.plan.features as string[] : []
        } : undefined
      };
      setSubscription(typedSubscription);
    } else if (!data) {
      setSubscription(null);
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const { data, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data);
    }
  }, [user]);

  const getPlanBySlug = useCallback(async (planSlug: string) => {
    const existingPlan = plans.find(p => p.slug === planSlug);
    if (existingPlan) return existingPlan;

    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;

    return {
      ...data,
      features: Array.isArray(data.features) ? data.features as string[] : []
    } as SubscriptionPlan;
  }, [plans]);

  // Open FedaPay Checkout widget
  const openFedaPayCheckout = useCallback(async (planSlug: string, options?: { customPriceFcfa?: number; customCredits?: number }) => {
    if (!user) {
      throw new Error("Vous devez être connecté pour souscrire");
    }

    if (!window.FedaPay) {
      throw new Error("Le module de paiement n'est pas chargé. Veuillez rafraîchir la page.");
    }

    // Find the plan, even if the local plans cache has not loaded yet
    const plan = await getPlanBySlug(planSlug);
    if (!plan) {
      throw new Error("Plan introuvable");
    }

    if (plan.slug === "free") {
      throw new Error("Le plan gratuit ne nécessite pas de paiement");
    }

    const finalPriceFcfa = options?.customPriceFcfa || plan.price_fcfa;
    const finalCredits = options?.customCredits || plan.credits_per_month;
    // Calculate proportional USD amount when custom price is used
    const finalAmountUsd = options?.customPriceFcfa 
      ? Math.round((options.customPriceFcfa / plan.price_fcfa) * plan.price_usd * 100) / 100
      : plan.price_usd;

    setIsProcessingPayment(true);
    console.log("[FedaPay] Opening checkout for plan:", planSlug);

    try {
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

      // Create payment transaction record first
      const { data: transaction, error: txError } = await supabase
        .from("payment_transactions")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount_fcfa: finalPriceFcfa,
          amount_usd: finalAmountUsd,
          status: "pending",
          metadata: { plan_slug: planSlug, custom_credits: finalCredits }
        })
        .select()
        .single();

      if (txError || !transaction) {
        throw new Error("Erreur création transaction: " + (txError?.message || "unknown"));
      }

      console.log("[FedaPay] Transaction created:", transaction.id);

      // Open FedaPay widget
      window.FedaPay.init({
        public_key: FEDAPAY_PUBLIC_KEY,
        transaction: {
          amount: finalPriceFcfa,
          description: `Abonnement ${plan.name} - Graphiste GPT (${finalCredits} crédits)`,
          custom_metadata: {
            user_id: user.id,
            plan_id: plan.id,
            plan_slug: planSlug,
            transaction_id: transaction.id,
          },
        },
        customer: {
          email: user.email || "",
          firstname: firstName,
          lastname: lastName,
        },
        environment: "live",
        onComplete: async (response) => {
          console.log("[FedaPay] Payment complete:", response);
          
          if (response.reason === "CHECKOUT_COMPLETE" || response.transaction?.status === "approved") {
            // Set intermediate status - only the server webhook can set "completed" after verification
            await supabase
              .from("payment_transactions")
              .update({
                status: "processing",
                moneroo_payment_id: String(response.transaction?.id || ""),
                updated_at: new Date().toISOString(),
              })
              .eq("id", transaction.id);

            // Poll subscription to check webhook activation
            const pollInterval = setInterval(() => fetchSubscription(), 3000);
            setTimeout(() => clearInterval(pollInterval), 20000);
            
            // Refresh subscription immediately
            await fetchSubscription();
          } else {
            await supabase
              .from("payment_transactions")
              .update({
                status: "failed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", transaction.id);
          }
          
          setIsProcessingPayment(false);
        },
        onClose: () => {
          console.log("[FedaPay] Widget closed");
          setIsProcessingPayment(false);
        },
      }).open();

    } catch (err) {
      console.error("[FedaPay] Error:", err);
      setIsProcessingPayment(false);
      throw err;
    }
  }, [user, getPlanBySlug, fetchSubscription]);

  // Pay via GeniusPay (hosted checkout or direct method)
  const openGeniusPayCheckout = useCallback(async (
    planSlug: string,
    opts?: {
      customerName?: string;
      customerPhone?: string;
      country?: string;
      paymentMethod?: string;
      mmoProvider?: string;
      promoCode?: string;
    }
  ) => {
    if (!user) throw new Error("Vous devez être connecté pour souscrire");
    const plan = await getPlanBySlug(planSlug);
    if (!plan) throw new Error("Plan introuvable");
    if (plan.slug === "free") throw new Error("Le plan gratuit ne nécessite pas de paiement");

    setIsProcessingPayment(true);
    try {
      const returnUrl = `${window.location.origin}/account?payment=success`;
      const { data, error } = await supabase.functions.invoke("create-geniuspay-payment", {
        body: {
          planSlug,
          returnUrl,
          customerName: opts?.customerName,
          customerPhone: opts?.customerPhone,
          country: opts?.country,
          paymentMethod: opts?.paymentMethod,
          mmoProvider: opts?.mmoProvider,
          promoCode: opts?.promoCode,
        },
      });
      if (error) throw new Error(error.message || "Erreur d'initialisation du paiement");
      if (!data?.success || !data?.checkoutUrl) {
        throw new Error(data?.error || "Impossible d'ouvrir la page de paiement");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setIsProcessingPayment(false);
      throw err;
    }
  }, [user, getPlanBySlug]);

  const getRemainingCredits = useCallback(() => {
    if (!subscription) {
      return { credits: 0, freeRemaining: 3, isFree: true };
    }
    const isFree = subscription.plan?.slug === "free";
    return {
      credits: subscription.credits_remaining,
      freeRemaining: isFree ? Math.max(0, 3 - subscription.free_generations_used) : 0,
      isFree,
    };
  }, [subscription]);

  const canGenerate = useCallback((resolution: string) => {
    if (!subscription) return resolution === "1K";
    const isFree = subscription.plan?.slug === "free";
    if (isFree) return resolution === "1K" && subscription.free_generations_used < 3;
    // Plan illimité : credits_per_month sentinelle >= 9999
    if ((subscription.plan?.credits_per_month ?? 0) >= 9999) return true;
    return subscription.credits_remaining >= 2;
  }, [subscription]);

  const getCreditsNeeded = useCallback((_resolution: string) => {
    return 2;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      await fetchPlans();
      if (user) {
        await Promise.all([fetchSubscription(), fetchTransactions()]);
      } else {
        setSubscription(null);
        setTransactions([]);
      }
      if (isMounted) setIsLoading(false);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, fetchPlans, fetchSubscription, fetchTransactions]);

  return {
    plans,
    subscription,
    transactions,
    isLoading,
    isProcessingPayment,
    openFedaPayCheckout,
    openGeniusPayCheckout,
    getRemainingCredits,
    canGenerate,
    getCreditsNeeded,
    refreshSubscription: fetchSubscription,
    refreshTransactions: fetchTransactions,
  };
}
