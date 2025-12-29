import { AspectRatio, Resolution, OutputFormat } from "@/types/generation";
import { cn } from "@/lib/utils";

interface GenerationOptionsProps {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onResolutionChange: (resolution: Resolution) => void;
  onOutputFormatChange: (format: OutputFormat) => void;
  disabled?: boolean;
}

const aspectRatios: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "1:1", label: "Carré", icon: "□" },
  { value: "4:3", label: "Paysage", icon: "▭" },
  { value: "3:4", label: "Portrait", icon: "▯" },
  { value: "16:9", label: "Cinéma", icon: "▬" },
  { value: "9:16", label: "Story", icon: "▮" },
  { value: "21:9", label: "Ultra-Wide", icon: "━" },
];

const resolutions: { value: Resolution; label: string }[] = [
  { value: "1K", label: "1K" },
  { value: "2K", label: "2K" },
  { value: "4K", label: "4K" },
];

const outputFormats: { value: OutputFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
];

export function GenerationOptions({
  aspectRatio,
  resolution,
  outputFormat,
  onAspectRatioChange,
  onResolutionChange,
  onOutputFormatChange,
  disabled = false,
}: GenerationOptionsProps) {
  return (
    <div className="space-y-6">
      {/* Aspect Ratio */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Format d'image
        </label>
        <div className="grid grid-cols-3 gap-2">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => onAspectRatioChange(ratio.value)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200",
                aspectRatio === ratio.value
                  ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_hsl(185_100%_50%/0.2)]"
                  : "border-border/50 bg-card/30 text-muted-foreground hover:border-border hover:bg-card/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-lg mb-1">{ratio.icon}</span>
              <span className="text-xs">{ratio.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {ratio.value}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Résolution
        </label>
        <div className="flex gap-2">
          {resolutions.map((res) => (
            <button
              key={res.value}
              onClick={() => onResolutionChange(res.value)}
              disabled={disabled}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all duration-200",
                resolution === res.value
                  ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_hsl(185_100%_50%/0.2)]"
                  : "border-border/50 bg-card/30 text-muted-foreground hover:border-border hover:bg-card/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {res.label}
            </button>
          ))}
        </div>
      </div>

      {/* Output Format */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Format de sortie
        </label>
        <div className="flex gap-2">
          {outputFormats.map((format) => (
            <button
              key={format.value}
              onClick={() => onOutputFormatChange(format.value)}
              disabled={disabled}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all duration-200",
                outputFormat === format.value
                  ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_hsl(185_100%_50%/0.2)]"
                  : "border-border/50 bg-card/30 text-muted-foreground hover:border-border hover:bg-card/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {format.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
