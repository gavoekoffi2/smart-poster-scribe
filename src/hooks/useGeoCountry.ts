import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { guessCountryFromLocale, guessCountryFromPhone, COUNTRIES } from "@/lib/paymentRouting";

const STORAGE_KEY = "ggpt_country_code";

/**
 * Détecte le pays de l'utilisateur dans l'ordre :
 * 1. localStorage (choix précédent)
 * 2. profiles.country
 * 3. préfixe téléphone du profil
 * 4. edge function detect-country (IP)
 * 5. locale navigateur
 */
export function useGeoCountry() {
  const { user } = useAuth();
  const [country, setCountryState] = useState<string>(() => {
    if (typeof window === "undefined") return "CI";
    return localStorage.getItem(STORAGE_KEY) || "";
  });
  const [isLoading, setIsLoading] = useState(!country);

  const setCountry = (code: string) => {
    setCountryState(code);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, code);
    // Persist on profile (best-effort)
    if (user) {
      supabase
        .from("profiles")
        .update({ country: code } as never)
        .eq("user_id", user.id)
        .then(() => {});
    }
  };

  useEffect(() => {
    if (country) return;
    let cancelled = false;

    const isKnown = (c?: string | null) =>
      !!c && COUNTRIES.some((x) => x.code === c.toUpperCase());

    (async () => {
      // 2 + 3. Profil
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("country, phone")
          .eq("user_id", user.id)
          .maybeSingle<{ country: string | null; phone: string | null }>();
        if (cancelled) return;
        if (isKnown(profile?.country)) {
          setCountryState(profile!.country!.toUpperCase());
          localStorage.setItem(STORAGE_KEY, profile!.country!.toUpperCase());
          setIsLoading(false);
          return;
        }
        const fromPhone = guessCountryFromPhone(profile?.phone);
        if (isKnown(fromPhone)) {
          setCountryState(fromPhone!);
          localStorage.setItem(STORAGE_KEY, fromPhone!);
          setIsLoading(false);
          return;
        }
      }

      // 4. Edge function IP
      try {
        const { data } = await supabase.functions.invoke("detect-country", {});
        if (cancelled) return;
        const ipCountry = (data as { country?: string } | null)?.country;
        if (isKnown(ipCountry)) {
          setCountryState(ipCountry!.toUpperCase());
          localStorage.setItem(STORAGE_KEY, ipCountry!.toUpperCase());
          setIsLoading(false);
          return;
        }
      } catch {
        // ignore
      }

      // 5. Locale
      const loc = guessCountryFromLocale();
      const fallback = isKnown(loc) ? loc! : "CI";
      if (!cancelled) {
        setCountryState(fallback);
        localStorage.setItem(STORAGE_KEY, fallback);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, country]);

  return { country: country || "CI", setCountry, isLoading };
}
