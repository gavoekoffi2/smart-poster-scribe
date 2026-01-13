import { Button } from "@/components/ui/button";
import { Sparkles, Upload, SkipForward } from "lucide-react";
import { ImageUploadButton } from "./ImageUploadButton";

interface DefaultLogoSelectProps {
  defaultLogoUrl: string | null;
  onUseDefault: () => void;
  onUploadNew: (imageDataUrl: string) => void;
  onSkip: () => void;
  disabled?: boolean;
  hasLogos?: boolean;
}

export function DefaultLogoSelect({
  defaultLogoUrl,
  onUseDefault,
  onUploadNew,
  onSkip,
  disabled,
  hasLogos = false,
}: DefaultLogoSelectProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Default logo option */}
      {defaultLogoUrl && (
        <div className="p-4 rounded-xl border-2 border-primary/50 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Votre logo par défaut</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border/50 overflow-hidden flex-shrink-0">
              <img
                src={defaultLogoUrl}
                alt="Logo par défaut"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <Button
              onClick={onUseDefault}
              disabled={disabled}
              className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              Utiliser ce logo
            </Button>
          </div>
        </div>
      )}

      {/* Upload new logo option */}
      <div className="flex flex-wrap gap-3">
        <ImageUploadButton
          onImageSelect={onUploadNew}
          disabled={disabled}
          label={defaultLogoUrl ? "Utiliser un autre logo" : "Ajouter un logo"}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={disabled}
          className="hover:bg-muted/50"
        >
          <SkipForward className="w-4 h-4 mr-2" />
          {hasLogos ? "Continuer" : "Passer"}
        </Button>
      </div>
    </div>
  );
}
