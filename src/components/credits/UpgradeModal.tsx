import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Image, Crown, ArrowRight, X, Timer, Tag } from "lucide-react";
import { toast } from "sonner";

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
const PROMO_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const PROMO_STORAGE_KEY = "upgradePromoExpiresAt";

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function UpgradeModal({ open, onClose, creditError }: UpgradeModalProps) {
  const navigate = useNavigate();
  const [remainingMs, setRemainingMs] = useState(PROMO_DURATION_MS);

  // Init / resume promo countdown
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

  const handleUpgrade = () => {
    onClose();
    const params = new URLSearchParams({ plan: "essentiel", subscribe: "1" });
    if (promoActive) params.set("promo", PROMO_CODE);
    navigate(`/pricing?${params.toString()}`);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      toast.success(`Code ${PROMO_CODE} copié !`);
    } catch {
      toast.error("Impossible de copier le code");
    }
  };

  const isFreeLimitReached = creditError?.error === "FREE_LIMIT_REACHED";
  const isResolutionNotAllowed = creditError?.error === "RESOLUTION_NOT_ALLOWED";
  const isInsufficientCredits = creditError?.error === "INSUFFICIENT_CREDITS";

  const getTitle = () => {
    if (isFreeLimitReached) return "Vos crédits d'essai sont épuisés";
    if (isResolutionNotAllowed) return "Résolution non disponible";
    if (isInsufficientCredits) return "Vos crédits sont épuisés";
    return "Passez à Pro";
  };

  const getDescription = () => {
    if (isFreeLimitReached) {
      return "Vous avez utilisé toutes vos affiches d'essai. Abonnez-vous maintenant pour continuer à créer sans limite.";
    }
    if (isResolutionNotAllowed) {
      return "L'essai gratuit est limité à la résolution 1K. Passez à Pro pour débloquer 2K et 4K.";
    }
    if (isInsufficientCredits) {
      return "Vous n'avez plus assez de crédits pour générer cette affiche. Rechargez votre compte pour continuer.";
    }
    return "Débloquez tout le potentiel de Graphiste GPT.";
  };

  const proFeatures = [
    { icon: Image, title: "Affiches illimitées", description: "Selon votre plan, jusqu'à 50 affiches/mois" },
    { icon: Zap, title: "Toutes résolutions", description: "Accès aux formats 1K, 2K et 4K" },
    { icon: Crown, title: "Sans filigrane", description: "Téléchargez vos créations sans marquage" },
    { icon: Sparkles, title: "Qualité premium", description: "Designs professionnels haute définition" },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
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
                Offre flash : -20% sur votre abonnement
              </div>
              <div className="flex items-center gap-1 text-sm font-mono font-bold text-primary tabular-nums">
                <Timer className="w-4 h-4" />
                {formatTime(remainingMs)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Utilisez ce code avant la fin du compte à rebours pour bénéficier de la réduction.
            </p>
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

        {/* Features */}
        <div className="px-6 py-4 space-y-2">
          {proFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/30"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-2 space-y-3">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity font-semibold py-6 text-base shadow-lg shadow-primary/20"
          >
            <Crown className="w-5 h-5 mr-2" />
            {promoActive ? `Profiter de -20% maintenant` : "Voir les abonnements"}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
          >
            {promoActive ? "Je perds la réduction" : "Plus tard"}
          </Button>
        </div>

        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            💳 Paiement sécurisé via Mobile Money ou Carte bancaire
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
