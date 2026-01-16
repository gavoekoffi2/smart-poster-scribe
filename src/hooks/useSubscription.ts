import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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

  // Fetch all active plans
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

  // Fetch user subscription
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      return;
    }

    const { data, error } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        plan:subscription_plans(*)
      `)
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
      // User has no subscription - will be created on first generation
      setSubscription(null);
    }
  }, [user]);

  // Fetch credit transactions
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

  // Initialize payment for a plan
  const initializePayment = useCallback(async (planSlug: string): Promise<string | null> => {
    if (!user) {
      throw new Error("Vous devez être connecté pour souscrire");
    }

    setIsProcessingPayment(true);
    console.log("[Payment] Initializing payment for plan:", planSlug);

    try {
      // Get the current session token
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      console.log("[Payment] Session valid, calling create-payment edge function...");

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          planSlug,
          returnUrl: `${window.location.origin}/account?payment=success`,
        },
      });

      console.log("[Payment] Edge function response:", { data, error });

      if (error) {
        console.error("[Payment] Edge function error:", error);
        throw new Error(error.message || "Erreur de connexion au serveur de paiement");
      }

      if (!data) {
        throw new Error("Aucune réponse du serveur de paiement");
      }

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de l'initialisation du paiement");
      }

      if (!data.checkoutUrl) {
        throw new Error("URL de paiement non reçue");
      }

      console.log("[Payment] Checkout URL received:", data.checkoutUrl);
      return data.checkoutUrl;
    } catch (err) {
      console.error("[Payment] Error:", err);
      throw err;
    } finally {
      setIsProcessingPayment(false);
    }
  }, [user]);

  // Get remaining credits/generations
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

  // Check if user can generate with given resolution
  const canGenerate = useCallback((resolution: string) => {
    if (!subscription) {
      // No subscription = free tier
      return resolution === "1K";
    }

    const isFree = subscription.plan?.slug === "free";
    
    if (isFree) {
      // Free tier: only 1K, max 5 per month
      return resolution === "1K" && subscription.free_generations_used < 5;
    }

    // Paid tiers: check credits
    const creditsNeeded = resolution === "1K" ? 1 : resolution === "2K" ? 2 : 4;
    return subscription.credits_remaining >= creditsNeeded;
  }, [subscription]);

  // Get credits needed for a resolution
  const getCreditsNeeded = useCallback((resolution: string) => {
    switch (resolution) {
      case "1K": return 1;
      case "2K": return 2;
      case "4K": return 4;
      default: return 1;
    }
  }, []);

  // Initial load - only once when user is available
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

  // Reset when user changes (logout/login)
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
    initializePayment,
    getRemainingCredits,
    canGenerate,
    getCreditsNeeded,
    refreshSubscription: fetchSubscription,
    refreshTransactions: fetchTransactions,
  };
}
