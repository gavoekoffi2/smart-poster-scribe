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
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);

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

  // Open FedaPay Checkout widget
  const openFedaPayCheckout = useCallback(async (planSlug: string) => {
    if (!user) {
      throw new Error("Vous devez être connecté pour souscrire");
    }

    if (!window.FedaPay) {
      throw new Error("Le module de paiement n'est pas chargé. Veuillez rafraîchir la page.");
    }

    // Find the plan
    const plan = plans.find(p => p.slug === planSlug);
    if (!plan) {
      throw new Error("Plan introuvable");
    }

    if (plan.slug === "free") {
      throw new Error("Le plan gratuit ne nécessite pas de paiement");
    }

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
          amount_fcfa: plan.price_fcfa,
          amount_usd: plan.price_usd,
          status: "pending",
          metadata: { plan_slug: planSlug }
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
          amount: plan.price_fcfa,
          description: `Abonnement ${plan.name} - Graphiste GPT`,
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
            // Update local transaction
            await supabase
              .from("payment_transactions")
              .update({
                status: "success",
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
  }, [user, plans, fetchSubscription]);

  const getRemainingCredits = useCallback(() => {
    if (!subscription) {
      return { credits: 0, freeRemaining: 5, isFree: true };
    }
    const isFree = subscription.plan?.slug === "free";
    return {
      credits: subscription.credits_remaining,
      freeRemaining: isFree ? Math.max(0, 5 - subscription.free_generations_used) : 0,
      isFree,
    };
  }, [subscription]);

  const canGenerate = useCallback((resolution: string) => {
    if (!subscription) return resolution === "1K";
    const isFree = subscription.plan?.slug === "free";
    if (isFree) return resolution === "1K" && subscription.free_generations_used < 5;
    const creditsNeeded = resolution === "1K" ? 1 : resolution === "2K" ? 2 : 4;
    return subscription.credits_remaining >= creditsNeeded;
  }, [subscription]);

  const getCreditsNeeded = useCallback((resolution: string) => {
    switch (resolution) {
      case "1K": return 1;
      case "2K": return 2;
      case "4K": return 4;
      default: return 1;
    }
  }, []);

  useEffect(() => {
    if (hasFetchedInitial) return;
    const loadData = async () => {
      setIsLoading(true);
      await fetchPlans();
      if (user) {
        await Promise.all([fetchSubscription(), fetchTransactions()]);
      }
      setIsLoading(false);
      setHasFetchedInitial(true);
    };
    loadData();
  }, [user, hasFetchedInitial, fetchPlans, fetchSubscription, fetchTransactions]);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setTransactions([]);
      setHasFetchedInitial(false);
    }
  }, [user]);

  return {
    plans,
    subscription,
    transactions,
    isLoading,
    isProcessingPayment,
    openFedaPayCheckout,
    getRemainingCredits,
    canGenerate,
    getCreditsNeeded,
    refreshSubscription: fetchSubscription,
    refreshTransactions: fetchTransactions,
  };
}
