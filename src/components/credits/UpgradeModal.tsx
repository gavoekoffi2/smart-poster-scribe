import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, X, Timer, Tag, Check, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionRequestModal } from "@/components/pricing/SubscriptionRequestModal";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface CreditError {
  error: string;
  message: string;
  remaining?: number;
  needed?: number;
  is_free?: boolean;
}

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  creditError: CreditError | null;
}

const PROMO_CODE = "BOOST20";
const PROMO_DURATION_MS = 30 * 60 * 1000;
const PROMO_STORAGE_KEY = "upgradePromoExpiresAt";

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function UpgradeModal({ open, onClose, creditError }: UpgradeModalProps) {
  const { plans } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [remainingMs, setRemainingMs] = useState(PROMO_DURATION_MS);
  const [requestModal, setRequestModal] = useState<{
    open: boolean; planName: string; planSlug: string; planPrice: string;
    basePriceFcfa?: number; baseCredits?: number; enableExtraPosters?: boolean;
  }>({ open: false, planName: "", planSlug: "", planPrice: "" });

  useEffect(() => {
    if (!open) return;
    let expiresAt = Number(localStorage.getItem(PROMO_STORAGE_KEY) || 0);
    if (!expiresAt || expiresAt < Date.now()) {
      expiresAt = Date.now() + PROMO_DURATION_MS;
      localStorage.setItem(PROMO_STORAGE_KEY, String(expiresAt));
    }
    const tick = () => setRemainingMs(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open]);

  const promoActive = remainingMs > 0;

  const essentiel = plans.find(p => p.slug === "essentiel");
  const illimite = plans.find(p => p.slug === "illimite");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      toast.success(`Code ${PROMO_CODE} copié !`);
    } catch {
      toast.error("Impossible de copier le code");
    }
  };

  const choosePlan = (slug: "essentiel" | "illimite") => {
    const plan = slug === "essentiel" ? essentiel : illimite;
    if (!plan) {
      toast.error("Chargement des plans en cours, réessayez dans un instant.");
      return;
    }
    if (!user) {
      // Non connecté → auth puis redirection vers /pricing
      const params = new URLSearchParams({ plan: slug, subscribe: "1" });
      if (promoActive) params.set("promo", PROMO_CODE);
      const redirectTo = `/pricing?${params.toString()}`;
      sessionStorage.setItem("pendingSubscriptionPlan", slug);
      sessionStorage.setItem("authRedirectTo", redirectTo);
      onClose();
      navigate(`/auth?redirect=${encodeURIComponent(redirectTo)}`, { state: { redirectTo } });
      return;
    }
    onClose();
    setRequestModal({
      open: true,
      planName: plan.name,
      planSlug: slug,
      planPrice: `${plan.price_fcfa.toLocaleString("fr-FR")} FCFA / mois`,
      basePriceFcfa: plan.price_fcfa,
      baseCredits: plan.credits_per_month,
      enableExtraPosters: slug === "essentiel",
    });
  };

  const isFreeLimitReached = creditError?.error === "FREE_LIMIT_REACHED";
  const isResolutionNotAllowed = creditError?.error === "RESOLUTION_NOT_ALLOWED";
  const isInsufficientCredits = creditError?.error === "INSUFFICIENT_CREDITS";

  const getTitle = () => {
    if (isFreeLimitReached) return "Vos crédits d'essai sont épuisés";
    if (isResolutionNotAllowed) return "Résolution non disponible";
    if (isInsufficientCredits) return "Vos crédits sont épuisés";
    return "Passez à un plan payant";
  };

  const getDescription = () => {
    if (isFreeLimitReached) return "Choisissez l'abonnement qui vous correspond pour continuer à créer sans limite.";
    if (isResolutionNotAllowed) return "L'essai gratuit est limité au 1K. Passez à un plan payant pour débloquer 2K et 4K.";
    if (isInsufficientCredits) return "Rechargez avec l'un des deux abonnements ci-dessous pour continuer.";
    return "Choisissez le plan qui vous correspond.";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-2xl bg-card border-border/50 p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 px-6 pt-8 pb-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <Crown className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>

            <DialogHeader className="text-center space-y-2">
              <DialogTitle className="text-2xl font-display font-bold text-foreground">
                {getTitle()}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {getDescription()}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Promo banner */}
          {promoActive ? (
            <div className="mx-6 mt-4 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 to-accent/15 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Tag className="w-4 h-4 text-primary" />
                  Offre flash : -20% appliqué automatiquement
                </div>
                <div className="flex items-center gap-1 text-sm font-mono font-bold text-primary tabular-nums">
                  <Timer className="w-4 h-4" />
                  {formatTime(remainingMs)}
                </div>
              </div>
              <button
                onClick={copyCode}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-background/60 border border-dashed border-primary/50 hover:border-primary transition-colors"
              >
                <span className="font-mono font-bold tracking-widest text-foreground">{PROMO_CODE}</span>
                <span className="text-xs text-primary">Copier</span>
              </button>
            </div>
          ) : (
            <div className="mx-6 mt-4 rounded-xl border border-border/50 bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              ⏰ L'offre de réduction a expiré. Abonnez-vous au tarif normal.
            </div>
          )}

          {/* Plans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
            {/* Essentiel */}
            <div className="relative rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 flex flex-col">
              <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase">
                Populaire
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Essentiel</h3>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground">
                  {essentiel ? `${essentiel.price_fcfa.toLocaleString("fr-FR")}` : "4 900"} <span className="text-sm font-normal text-muted-foreground">FCFA/mois</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  20 affiches — ajustable jusqu'à 100 après souscription
                </div>
              </div>
              <ul className="space-y-1.5 mb-4 text-xs text-muted-foreground flex-1">
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> 20 affiches / mois (extensible)</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> Résolutions 1K, 2K, 4K</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> Sans filigrane</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> Modifications illimitées</li>
              </ul>
              <Button
                onClick={() => choosePlan("essentiel")}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
              >
                Choisir Essentiel
              </Button>
            </div>

            {/* Illimité */}
            <div className="relative rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-foreground">Illimité</h3>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground">
                  {illimite ? `${illimite.price_fcfa.toLocaleString("fr-FR")}` : "25 000"} <span className="text-sm font-normal text-muted-foreground">FCFA/mois</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <InfinityIcon className="w-3 h-3" /> Affiches illimitées
                </div>
              </div>
              <ul className="space-y-1.5 mb-4 text-xs text-muted-foreground flex-1">
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> Générations illimitées</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> Qualité Pro (GPT Image 2)</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> Templates premium</li>
                <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> Support prioritaire</li>
              </ul>
              <Button
                onClick={() => choosePlan("illimite")}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold"
              >
                Choisir Illimité
              </Button>
            </div>
          </div>

          <div className="px-6 pb-6 pt-0">
            <Button onClick={onClose} variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
              {promoActive ? "Je perds la réduction" : "Plus tard"}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              💳 Paiement sécurisé via Mobile Money ou Carte bancaire
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <SubscriptionRequestModal
        open={requestModal.open}
        onOpenChange={(open) => setRequestModal(prev => ({ ...prev, open }))}
        planName={requestModal.planName}
        planSlug={requestModal.planSlug}
        planPrice={requestModal.planPrice}
        initialPromoCode={promoActive ? PROMO_CODE : undefined}
        basePriceFcfa={requestModal.basePriceFcfa}
        baseCredits={requestModal.baseCredits}
        enableExtraPosters={requestModal.enableExtraPosters}
      />
    </>
  );
}
