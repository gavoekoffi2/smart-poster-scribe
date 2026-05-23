import { useEffect, useState } from "react";
import { Zap, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STORAGE_KEY = "premiumQuality";

export function QualityChoice() {
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPremium(localStorage.getItem(STORAGE_KEY) === "true");
    }
  }, []);

  const select = (value: boolean) => {
    setPremium(value);
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    if (value) {
      toast.success("Mode qualité exceptionnelle activé", {
        description: "La génération peut prendre 2 à 3 minutes pour un rendu premium.",
      });
    } else {
      toast.success("Mode rapide activé", {
        description: "Génération en ~30 secondes.",
      });
    }
  };

  const Card = ({
    active,
    onClick,
    icon: Icon,
    title,
    subtitle,
    description,
    accent,
  }: {
    active: boolean;
    onClick: () => void;
    icon: typeof Zap;
    title: string;
    subtitle: string;
    description: string;
    accent: "primary" | "accent";
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex-1 min-w-1 text-left rounded-xl border-2 p-2 transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-lg",
        active
          ? accent === "primary"
            ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
            : "border-accent bg-accent/10 shadow-md shadow-accent/20"
          : "border-border/40 bg-background/40 hover:border-border"
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center",
            accent === "primary" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
          )}
        >
          <Check className="w-2.5 h-2.5" />
        </span>
      )}
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon
          className={cn(
            "w-3.5 h-3.5 shrink-0",
            active ? (accent === "primary" ? "text-primary" : "text-accent") : "text-muted-foreground"
          )}
        />
        <span className="font-semibold text-xs">{title}</span>
      </div>
      <p className="text-[10px] font-medium text-foreground/80 mb-0.5">{subtitle}</p>
      <p className="text-[9px] text-muted-foreground leading-tight">{description}</p>
    </button>
  );

  return (
    <div className="mb-3">
      <p className="text-[11px] font-medium text-muted-foreground mb-2 px-1">
        Choisissez votre mode de génération :
      </p>
      <div className="flex gap-2">
        <Card
          active={!premium}
          onClick={() => select(false)}
          icon={Zap}
          title="Mode rapide"
          subtitle="~30 secondes"
          description="Génération rapide, qualité standard. Idéal pour itérer vite."
          accent="primary"
        />
        <Card
          active={premium}
          onClick={() => select(true)}
          icon={Sparkles}
          title="Mode long"
          subtitle="2 à 3 minutes"
          description="Qualité exceptionnelle, rendu premium ultra-détaillé."
          accent="accent"
        />
      </div>
    </div>
  );
}
