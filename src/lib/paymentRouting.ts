// Routage du moyen de paiement par défaut selon le pays de l'utilisateur.
// Basé sur la couverture GeniusPay (PawaPay / Wave / Orange / MTN / Moov / Airtel / Paystack / Carte).

export type PaymentMethod =
  | "wave"
  | "orange_money"
  | "mtn_money"
  | "moov_money"
  | "airtel_money"
  | "pawapay"
  | "paystack"
  | "card";

export interface PaymentOption {
  method: PaymentMethod;
  label: string;
  logo?: string; // URL or emoji fallback
  mmoProvider?: string; // for pawapay
}

export interface CountryInfo {
  code: string; // ISO2
  name: string;
  flag: string;
  dialCode: string; // e.g. "+225"
  currency: "XOF" | "XAF" | "CDF" | "KES" | "ZMW" | "GHS" | "NGN" | "EUR" | "USD";
  options: PaymentOption[]; // first = default
}

// Liste des pays supportés avec routage prioritaire mobile money local.
export const COUNTRIES: CountryInfo[] = [
  // UEMOA (XOF)
  {
    code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", dialCode: "+225", currency: "XOF",
    options: [
      { method: "wave", label: "Wave" },
      { method: "orange_money", label: "Orange Money" },
      { method: "mtn_money", label: "MTN MoMo" },
      { method: "moov_money", label: "Moov Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "SN", name: "Sénégal", flag: "🇸🇳", dialCode: "+221", currency: "XOF",
    options: [
      { method: "wave", label: "Wave" },
      { method: "orange_money", label: "Orange Money" },
      { method: "pawapay", label: "Free Money", mmoProvider: "FREE_SEN" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "TG", name: "Togo", flag: "🇹🇬", dialCode: "+228", currency: "XOF",
    options: [
      { method: "moov_money", label: "Moov Money" },
      { method: "mtn_money", label: "Mixx by Yas (MTN)" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "BJ", name: "Bénin", flag: "🇧🇯", dialCode: "+229", currency: "XOF",
    options: [
      { method: "moov_money", label: "Moov Money" },
      { method: "mtn_money", label: "MTN MoMo" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "BF", name: "Burkina Faso", flag: "🇧🇫", dialCode: "+226", currency: "XOF",
    options: [
      { method: "orange_money", label: "Orange Money" },
      { method: "moov_money", label: "Moov Money" },
      { method: "mtn_money", label: "MTN MoMo" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "ML", name: "Mali", flag: "🇲🇱", dialCode: "+223", currency: "XOF",
    options: [
      { method: "orange_money", label: "Orange Money" },
      { method: "moov_money", label: "Moov Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "NE", name: "Niger", flag: "🇳🇪", dialCode: "+227", currency: "XOF",
    options: [
      { method: "orange_money", label: "Orange Money" },
      { method: "moov_money", label: "Moov Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "GW", name: "Guinée-Bissau", flag: "🇬🇼", dialCode: "+245", currency: "XOF",
    options: [
      { method: "orange_money", label: "Orange Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },

  // CEMAC (XAF)
  {
    code: "CM", name: "Cameroun", flag: "🇨🇲", dialCode: "+237", currency: "XAF",
    options: [
      { method: "pawapay", label: "Orange Money Cameroun", mmoProvider: "ORANGE_CMR" },
      { method: "pawapay", label: "MTN MoMo Cameroun", mmoProvider: "MTN_MOMO_CMR" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "GA", name: "Gabon", flag: "🇬🇦", dialCode: "+241", currency: "XAF",
    options: [
      { method: "orange_money", label: "Orange Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "CG", name: "Congo", flag: "🇨🇬", dialCode: "+242", currency: "XAF",
    options: [
      { method: "mtn_money", label: "MTN MoMo" },
      { method: "airtel_money", label: "Airtel Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },

  // RDC
  {
    code: "CD", name: "RD Congo", flag: "🇨🇩", dialCode: "+243", currency: "CDF",
    options: [
      { method: "pawapay", label: "Vodacom M-Pesa", mmoProvider: "VODACOM_MPESA_COD" },
      { method: "airtel_money", label: "Airtel Money" },
      { method: "orange_money", label: "Orange Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },

  // East Africa
  {
    code: "KE", name: "Kenya", flag: "🇰🇪", dialCode: "+254", currency: "KES",
    options: [
      { method: "pawapay", label: "M-Pesa", mmoProvider: "MPESA_KEN" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "UG", name: "Ouganda", flag: "🇺🇬", dialCode: "+256", currency: "KES",
    options: [
      { method: "pawapay", label: "MTN MoMo", mmoProvider: "MTN_MOMO_UGA" },
      { method: "airtel_money", label: "Airtel Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "RW", name: "Rwanda", flag: "🇷🇼", dialCode: "+250", currency: "KES",
    options: [
      { method: "mtn_money", label: "MTN MoMo" },
      { method: "airtel_money", label: "Airtel Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "ZM", name: "Zambie", flag: "🇿🇲", dialCode: "+260", currency: "ZMW",
    options: [
      { method: "pawapay", label: "MTN MoMo", mmoProvider: "MTN_MOMO_ZMB" },
      { method: "airtel_money", label: "Airtel Money" },
      { method: "card", label: "Carte bancaire" },
    ],
  },

  // West Africa anglo
  {
    code: "GH", name: "Ghana", flag: "🇬🇭", dialCode: "+233", currency: "GHS",
    options: [
      { method: "paystack", label: "Paystack (MoMo + Carte)" },
      { method: "mtn_money", label: "MTN MoMo" },
      { method: "card", label: "Carte bancaire" },
    ],
  },
  {
    code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234", currency: "NGN",
    options: [
      { method: "paystack", label: "Paystack (Carte + Transfert)" },
      { method: "card", label: "Carte bancaire" },
    ],
  },

  // International (carte par défaut)
  { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33", currency: "EUR",
    options: [{ method: "card", label: "Carte bancaire (Visa / Mastercard)" }] },
  { code: "BE", name: "Belgique", flag: "🇧🇪", dialCode: "+32", currency: "EUR",
    options: [{ method: "card", label: "Carte bancaire (Visa / Mastercard)" }] },
  { code: "CH", name: "Suisse", flag: "🇨🇭", dialCode: "+41", currency: "EUR",
    options: [{ method: "card", label: "Carte bancaire (Visa / Mastercard)" }] },
  { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1", currency: "USD",
    options: [{ method: "card", label: "Carte bancaire (Visa / Mastercard)" }] },
  { code: "US", name: "États-Unis", flag: "🇺🇸", dialCode: "+1", currency: "USD",
    options: [{ method: "card", label: "Carte bancaire (Visa / Mastercard)" }] },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧", dialCode: "+44", currency: "EUR",
    options: [{ method: "card", label: "Carte bancaire (Visa / Mastercard)" }] },
];

export const DEFAULT_INTL: CountryInfo = {
  code: "INT", name: "International", flag: "🌍", dialCode: "+", currency: "EUR",
  options: [{ method: "card", label: "Carte bancaire (Visa / Mastercard)" }],
};

export function getCountry(code?: string | null): CountryInfo {
  if (!code) return DEFAULT_INTL;
  const c = COUNTRIES.find((x) => x.code === code.toUpperCase());
  return c || DEFAULT_INTL;
}

// Devine le pays à partir d'un numéro international (+237..., +225..., etc.)
export function guessCountryFromPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[^\d+]/g, "");
  if (!clean.startsWith("+")) return null;
  // Sort by dial code length DESC to match longest prefix first
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (clean.startsWith(c.dialCode)) return c.code;
  }
  return null;
}

// Devine le pays à partir de la locale navigateur (fr-FR -> FR).
export function guessCountryFromLocale(): string | null {
  if (typeof navigator === "undefined") return null;
  const lang = navigator.language || (navigator.languages && navigator.languages[0]);
  if (!lang) return null;
  const parts = lang.split("-");
  if (parts.length < 2) return null;
  return parts[1].toUpperCase();
}
