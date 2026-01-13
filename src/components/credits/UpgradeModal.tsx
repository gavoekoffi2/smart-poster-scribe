import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Image, Crown, ArrowRight, X } from "lucide-react";

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

export function UpgradeModal({ open, onClose, creditError }: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate("/pricing");
  };

  const isFreeLimitReached = creditError?.error === "FREE_LIMIT_REACHED";
  const isResolutionNotAllowed = creditError?.error === "RESOLUTION_NOT_ALLOWED";
  const isInsufficientCredits = creditError?.error === "INSUFFICIENT_CREDITS";

  const getTitle = () => {
    if (isFreeLimitReached) return "Vos crédits d'essai sont épuisés";
    if (isResolutionNotAllowed) return "Résolution non disponible";
    if (isInsufficientCredits) return "Crédits insuffisants";
    return "Passez à Pro";
  };

  const getDescription = () => {
    if (isFreeLimitReached) {
      return "Vous avez utilisé vos 5 crédits d'essai gratuits. Débloquez des créations illimitées en passant à Pro !";
    }
    if (isResolutionNotAllowed) {
      return "L'essai gratuit est limité à la résolution 1K. Passez à Pro pour accéder aux résolutions 2K et 4K.";
    }
    if (isInsufficientCredits) {
      return creditError?.message || "Vous n'avez plus assez de crédits pour cette génération.";
    }
    return "Débloquez tout le potentiel de Graphiste GPT avec notre plan Pro.";
  };

  const proFeatures = [
    {
      icon: Image,
      title: "50 crédits/mois",
      description: "Créez jusqu'à 50 affiches professionnelles",
    },
    {
      icon: Zap,
      title: "Toutes résolutions",
      description: "Accès aux formats 1K, 2K et 4K",
    },
    {
      icon: Crown,
      title: "Sans filigrane",
      description: "Téléchargez vos créations sans marquage",
    },
    {
      icon: Sparkles,
      title: "Qualité premium",
      description: "Designs professionnels haute définition",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 p-0 overflow-hidden">
        {/* Header with gradient */}
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

        {/* Features */}
        <div className="px-6 py-4 space-y-3">
          {proFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
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
            Passer à Pro - 9 900 FCFA/mois
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Plus tard
          </Button>
        </div>

        {/* Trust badge */}
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            💳 Paiement sécurisé via Mobile Money ou Carte bancaire
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
