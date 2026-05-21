import { useEffect, useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const STORAGE_KEY = "premiumQuality";

export function getPremiumQuality(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function QualityToggle() {
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    setPremium(getPremiumQuality());
  }, []);

  const toggle = () => {
    const next = !premium;
    setPremium(next);
    localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
    if (next) {
      toast.success("Qualité exceptionnelle (OpenAI) activée", {
        description:
          "La génération peut prendre 2 à 3 minutes. Merci de patienter pour un rendu premium.",
      });
    } else {
      toast.success("Mode rapide activé", {
        description: "Génération en ~30 secondes avec Nano Banana Pro.",
      });
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={premium ? "neon" : "ghost"}
            size="sm"
            onClick={toggle}
            className="transition-all duration-300"
          >
            {premium ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Qualité OpenAI</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Mode rapide</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {premium ? (
            <p className="text-xs">
              <strong>Qualité exceptionnelle (OpenAI GPT Image 2)</strong>
              <br />
              Rendu premium, attente de 2 à 3 minutes. Cliquez pour revenir au
              mode rapide.
            </p>
          ) : (
            <p className="text-xs">
              <strong>Mode rapide (Nano Banana Pro)</strong>
              <br />
              Génération en ~30 secondes. Cliquez pour activer la qualité
              exceptionnelle OpenAI (plus lent, plus précis).
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
