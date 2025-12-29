import { GeneratedImage } from "@/types/generation";
import { Download, Maximize2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  image: GeneratedImage | null;
  isGenerating: boolean;
}

export function ImagePreview({ image, isGenerating }: ImagePreviewProps) {
  const handleDownload = async () => {
    if (!image) return;

    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prographiste-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleFullscreen = () => {
    if (!image) return;
    window.open(image.imageUrl, "_blank");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl tracking-wide text-foreground">
          APERÇU
        </h2>
        {image && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              title="Plein écran"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              title="Télécharger"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex-1 rounded-lg border border-border/50 overflow-hidden relative",
          "flex items-center justify-center",
          isGenerating && "animate-pulse"
        )}
      >
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm">Génération en cours...</p>
            <p className="text-xs text-muted-foreground/70">
              Cela peut prendre jusqu'à 2 minutes
            </p>
          </div>
        ) : image ? (
          <img
            src={image.imageUrl}
            alt={image.prompt}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Aucune image générée</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Entrez un prompt et cliquez sur "Générer" pour créer votre
                affiche
              </p>
            </div>
          </div>
        )}
      </div>

      {image && (
        <div className="mt-4 p-3 rounded-lg bg-card/30 border border-border/30">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {image.prompt}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground/70">
            <span>{image.aspectRatio}</span>
            <span>{image.resolution}</span>
            <span>
              {new Date(image.createdAt).toLocaleTimeString("fr-FR")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
