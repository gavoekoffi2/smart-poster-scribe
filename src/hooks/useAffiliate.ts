import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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

export function useAffiliate() {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAffiliate = useCallback(async () => {
    if (!user) {
      setAffiliate(null);
      setCommissions([]);
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

      // Fetch commissions if affiliate exists
      if (data) {
        const { data: comms, error: commsError } = await supabase
          .from("referral_commissions")
          .select("*")
          .eq("affiliate_id", data.id)
          .order("created_at", { ascending: false });

        if (!commsError && comms) {
          setCommissions(comms as ReferralCommission[]);
        }
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
      // Generate referral code via DB function
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
      toast.success("Lien copié !");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return {
    affiliate,
    commissions,
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

// Utility: get stored referral code
export function getStoredReferralCode(): string | null {
  return localStorage.getItem("referral_code");
}

// Utility: clear stored referral code
export function clearStoredReferralCode() {
  localStorage.removeItem("referral_code");
}
