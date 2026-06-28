import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const REFERRAL_DISCOUNT_RATE = 0.10;

export interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  total_referrals: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReferralCommission {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  payment_transaction_id: string | null;
  amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
}

export interface AffiliateReferral {
  referral_name: string;
  joined_at: string;
  status: string;
  plan_name: string | null;
  total_earned: number;
}

export function useAffiliate() {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAffiliate = useCallback(async () => {
    if (!user) {
      setAffiliate(null);
      setCommissions([]);
      setReferrals([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching affiliate:", error);
      } else {
        setAffiliate(data as Affiliate | null);
      }

      if (data) {
        const [{ data: comms }, { data: refs }] = await Promise.all([
          supabase
            .from("referral_commissions")
            .select("*")
            .eq("affiliate_id", data.id)
            .order("created_at", { ascending: false }),
          supabase.rpc("get_affiliate_referrals", { p_affiliate_id: data.id }),
        ]);

        if (comms) setCommissions(comms as ReferralCommission[]);
        if (refs) setReferrals(refs as AffiliateReferral[]);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAffiliate();
  }, [fetchAffiliate]);

  const activateAffiliate = async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return false;
    }

    try {
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_referral_code", { p_user_id: user.id });

      if (codeError) {
        console.error("Error generating code:", codeError);
        toast.error("Erreur lors de la génération du code");
        return false;
      }

      const { error } = await supabase
        .from("affiliates")
        .insert({
          user_id: user.id,
          referral_code: codeData as string,
        });

      if (error) {
        console.error("Error creating affiliate:", error);
        toast.error("Erreur lors de l'activation");
        return false;
      }

      toast.success("Programme d'affiliation activé !");
      await fetchAffiliate();
      return true;
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Erreur inattendue");
      return false;
    }
  };

  const getReferralLink = () => {
    if (!affiliate) return "";
    return `${window.location.origin}?ref=${affiliate.referral_code}`;
  };

  const copyReferralLink = async () => {
    const link = getReferralLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Lien copié ! Vos filleuls bénéficient de -10%.");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return {
    affiliate,
    commissions,
    referrals,
    isLoading,
    activateAffiliate,
    getReferralLink,
    copyReferralLink,
    refreshAffiliate: fetchAffiliate,
  };
}

// Utility: capture referral code from URL and store in localStorage
export function captureReferralCode() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    localStorage.setItem("referral_code", ref);
  }
}

export function getStoredReferralCode(): string | null {
  return localStorage.getItem("referral_code");
}

export function clearStoredReferralCode() {
  localStorage.removeItem("referral_code");
}

/**
 * Returns referral discount eligibility for the current user.
 * Eligible = user has a `referred_by` code AND has never completed a payment yet.
 */
export function useReferralDiscount() {
  const { user } = useAuth();
  const [state, setState] = useState<{ eligible: boolean; rate: number; code: string | null; loading: boolean }>({
    eligible: false,
    rate: REFERRAL_DISCOUNT_RATE,
    code: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        // Anonymous: rely on stored referral code (signup-time discount preview)
        const stored = getStoredReferralCode();
        if (!cancelled) {
          setState({ eligible: !!stored, rate: REFERRAL_DISCOUNT_RATE, code: stored, loading: false });
        }
        return;
      }
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from("profiles").select("referred_by").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("payment_transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed"),
      ]);
      const code = (profile?.referred_by as string | null) ?? null;
      const eligible = !!code && (count ?? 0) === 0;
      if (!cancelled) setState({ eligible, rate: REFERRAL_DISCOUNT_RATE, code, loading: false });
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
