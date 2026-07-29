import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useGeoCountry } from "@/hooks/useGeoCountry";
import { COUNTRIES, getCountry, type PaymentOption } from "@/lib/paymentRouting";
import { toast } from "sonner";
import { MessageCircle, CreditCard, Loader2, MapPin, Tag, Check, X, Sparkles } from "lucide-react";

const WHATSAPP_NUMBER = "22893708178";

interface SubscriptionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planSlug: string;
  planPrice?: string;
  /** Auto-appliqué (ex: BOOST20 depuis le pop-up de crédits épuisés) */
  initialPromoCode?: string;
  /** Prix FCFA de base du plan (pour le slider). */
  basePriceFcfa?: number;
  /** Nombre d'affiches de base incluses (pour le slider Essentiel). */
  baseCredits?: number;
  /** Active le sélecteur d'affiches supplémentaires. */
  enableExtraPosters?: boolean;
}

function methodKey(o: PaymentOption) {
  return `${o.method}::${o.mmoProvider || ""}`;
}

export function SubscriptionRequestModal({
  open,
  onOpenChange,
  planName,
  planSlug,
  planPrice,
  initialPromoCode,
  basePriceFcfa,
  baseCredits,
  enableExtraPosters,
}: SubscriptionRequestModalProps) {
  const { user } = useAuth();
  const { openGeniusPayCheckout } = useSubscription();
  const { country, setCountry } = useGeoCountry();

  const countryInfo = useMemo(() => getCountry(country), [country]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  // Par défaut : aucune méthode pré-sélectionnée => GeniusPay affiche sa propre
  // page de sélection (carte bancaire + tous les Mobile Money du pays).
  const [selectedMethodKey, setSelectedMethodKey] = useState<string>("__choose__");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayingOnline, setIsPayingOnline] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<{ valid: boolean; discount?: number; message?: string } | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Slider (Essentiel seulement) : affiches supplémentaires
  const canScale = !!enableExtraPosters && !!basePriceFcfa && !!baseCredits && planSlug === "essentiel";
  const baseP = baseCredits ? Math.floor(baseCredits / 2) : 20; // affiches de base
  const pricePerPoster = basePriceFcfa && baseP ? Math.round(basePriceFcfa / baseP) : 245;
  const [extraPosters, setExtraPosters] = useState<number>(0);
  const totalPosters = baseP + extraPosters;
  const totalFcfa = (basePriceFcfa || 0) + extraPosters * pricePerPoster;

  // Auto-appliquer le code promo initial
  useEffect(() => {
    if (!open) return;
    setPromoCode(initialPromoCode ? initialPromoCode.toUpperCase() : "");
    setPromoStatus(null);
    setExtraPosters(0);
  }, [open, initialPromoCode]);

  useEffect(() => {
    if (!open || !initialPromoCode) return;
    // délai pour laisser la modale se monter
    const t = setTimeout(() => { void applyPromo(initialPromoCode); }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPromoCode, planSlug]);

  const applyPromo = async (codeToApply?: string) => {
    const code = (codeToApply ?? promoCode).trim();
    if (!code) return;
    setIsValidatingPromo(true);
    try {
      const { data, error } = await supabase.rpc("validate_promo_code" as any, {
        p_code: code,
        p_plan_slug: planSlug,
      });
      if (error) throw error;
      const v = data as any;
      if (v?.valid) {
        setPromoStatus({ valid: true, discount: v.discount_percent, message: `-${v.discount_percent}% appliqué` });
        toast.success(`Code appliqué : -${v.discount_percent}%`);
      } else {
        setPromoStatus({ valid: false, message: v?.message || "Code invalide" });
        if (!codeToApply) toast.error(v?.message || "Code invalide");
      }
    } catch (e) {
      setPromoStatus({ valid: false, message: "Erreur de validation" });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const clearPromo = () => { setPromoCode(""); setPromoStatus(null); };

  useEffect(() => {
    setSelectedMethodKey("__choose__");
    setPhone((current) => {
      if (current && current.startsWith("+")) return current;
      return countryInfo.dialCode + " ";
    });
  }, [country, countryInfo]);

  const selectedOption: PaymentOption | null =
    selectedMethodKey === "__choose__"
      ? null
      : countryInfo.options.find((o) => methodKey(o) === selectedMethodKey) || null;

  const displayPrice = canScale
    ? `${totalFcfa.toLocaleString("fr-FR")} FCFA / mois — ${totalPosters} affiches`
    : planPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      if (user) {
        await supabase.from("subscription_requests").insert({
          user_id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          plan_slug: planSlug,
        });
      }

      const priceLine = displayPrice ? `\nTarif: ${displayPrice}` : "";
      const message = `Bonjour, je souhaite souscrire au plan *${planName}* de Graphiste GPT.\n\nNom: ${fullName.trim()}\nTéléphone: ${phone.trim()}\nPays: ${countryInfo.flag} ${countryInfo.name}${priceLine}\n\nMerci de me communiquer les instructions de paiement.`;
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Redirection vers WhatsApp...");
      handleClose();
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error("Erreur. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFullName("");
      setPhone("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Souscrire au plan {planName}</DialogTitle>
          <DialogDescription>
            Choisissez votre pays — nous vous proposerons les moyens de paiement adaptés
            (Mobile Money local ou Carte bancaire).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="plan-display">Plan choisi</Label>
            <Input
              id="plan-display"
              value={displayPrice ? `${planName} — ${displayPrice}` : planName}
              disabled
              className="bg-muted"
            />
          </div>

          {canScale && (
            <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Nombre d'affiches / mois
                </Label>
                <span className="text-lg font-bold text-primary">{totalPosters}</span>
              </div>
              <Slider
                value={[extraPosters]}
                onValueChange={(v) => setExtraPosters(v[0])}
                min={0}
                max={80}
                step={10}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Base : {baseP} affiches</span>
                <span>Max : {baseP + 80} affiches</span>
              </div>
              <div className="text-xs text-foreground">
                +{pricePerPoster.toLocaleString("fr-FR")} FCFA par affiche supplémentaire.
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="country" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Pays
            </Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="country">
                <SelectValue>
                  <span className="mr-2">{countryInfo.flag}</span>
                  {countryInfo.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="mr-2">{c.flag}</span>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Moyen de paiement</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {countryInfo.options.map((opt) => {
                const k = methodKey(opt);
                const active = k === selectedMethodKey;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelectedMethodKey(k)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    {active && <span className="text-xs text-primary">✓ Par défaut</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full-name">Nom complet</Label>
            <Input
              id="full-name"
              placeholder="Ex: Jean Dupont"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder={`Ex: ${countryInfo.dialCode} 90 00 00 00`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required={selectedOption.method !== "card"}
              maxLength={20}
            />
            {selectedOption.method === "card" && (
              <p className="text-xs text-muted-foreground">
                Optionnel pour un paiement par carte.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-code" className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Code promo (optionnel)
            </Label>
            <div className="flex gap-2">
              <Input
                id="promo-code"
                placeholder="Entrez votre code"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus(null); }}
                disabled={promoStatus?.valid}
                maxLength={40}
              />
              {promoStatus?.valid ? (
                <Button type="button" variant="outline" size="icon" onClick={clearPromo}>
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => applyPromo()} disabled={isValidatingPromo || !promoCode.trim()}>
                  {isValidatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                </Button>
              )}
            </div>
            {promoStatus && (
              <p className={`text-xs flex items-center gap-1 ${promoStatus.valid ? "text-green-500" : "text-destructive"}`}>
                {promoStatus.valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {promoStatus.message}
              </p>
            )}
          </div>

          <Button
            type="button"
            onClick={async () => {
              if (!fullName.trim()) {
                toast.error("Renseignez votre nom");
                return;
              }
              if (selectedOption.method !== "card" && !phone.trim()) {
                toast.error("Renseignez votre téléphone Mobile Money");
                return;
              }
              setIsPayingOnline(true);
              try {
                await openGeniusPayCheckout(planSlug, {
                  customerName: fullName.trim(),
                  customerPhone: phone.trim(),
                  country: countryInfo.code,
                  paymentMethod: selectedOption.method,
                  mmoProvider: selectedOption.mmoProvider,
                  promoCode: promoStatus?.valid ? promoCode.trim() : undefined,
                  extraPosters: canScale ? extraPosters : undefined,
                });
              } catch (err) {
                console.error(err);
                toast.error(err instanceof Error ? err.message : "Erreur paiement");
                setIsPayingOnline(false);
              }
            }}
            disabled={isPayingOnline || isSubmitting || !fullName.trim()}
            className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            {isPayingOnline ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            {isPayingOnline ? "Redirection..." : `Payer ${totalFcfa && canScale ? totalFcfa.toLocaleString("fr-FR") + " FCFA" : ""} avec ${selectedOption.label}`.trim()}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isPayingOnline || !fullName.trim() || !phone.trim()}
            variant="outline"
            className="w-full gap-2"
          >
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            {isSubmitting ? "Envoi..." : "Activation manuelle via WhatsApp"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Paiement en ligne sécurisé via GeniusPay (Mobile Money + Carte), ou activation manuelle via WhatsApp.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
