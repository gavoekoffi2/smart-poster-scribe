import { Zap, Palette } from "lucide-react";
import { CreationMode } from "@/types/generation";

interface ModeSelectProps {
  onSelect: (mode: CreationMode) => void;
  disabled?: boolean;
}

export function ModeSelect({ onSelect, disabled }: ModeSelectProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
      <button
        onClick={() => onSelect("quick")}
        disabled={disabled}
        className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-sm text-foreground">Mode Rapide</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Décrivez, générez en un clic
          </p>
        </div>
        <span className="absolute top-2 right-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          ⚡ Express
        </span>
      </button>

      <button
        onClick={() => onSelect("custom")}
        disabled={disabled}
        className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-accent/50 hover:bg-accent/5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
          <Palette className="w-6 h-6 text-accent" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-sm text-foreground">Mode Personnalisé</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Logo, couleurs, format…
          </p>
        </div>
        <span className="absolute top-2 right-2 text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
          🎨 Pro
        </span>
      </button>
    </div>
  );
}
