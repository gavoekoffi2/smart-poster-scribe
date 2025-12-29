import { GeneratedImage } from "@/types/generation";
import { Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  history: GeneratedImage[];
  currentImage: GeneratedImage | null;
  onSelect: (image: GeneratedImage) => void;
  onClear: () => void;
}

export function HistoryPanel({
  history,
  currentImage,
  onSelect,
  onClear,
}: HistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display text-xl tracking-wide text-foreground">
            HISTORIQUE
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            Les images générées apparaîtront ici
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display text-xl tracking-wide text-foreground">
            HISTORIQUE
          </h2>
          <span className="text-xs text-muted-foreground">
            ({history.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Effacer
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {history.map((image) => (
          <button
            key={image.id}
            onClick={() => onSelect(image)}
            className={cn(
              "w-full flex gap-3 p-2 rounded-lg border transition-all duration-200 text-left",
              currentImage?.id === image.id
                ? "border-primary bg-primary/10"
                : "border-border/30 bg-card/20 hover:border-border/50 hover:bg-card/40"
            )}
          >
            <img
              src={image.imageUrl}
              alt=""
              className="w-16 h-16 rounded object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground line-clamp-2">
                {image.prompt}
              </p>
              <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                <span>{image.aspectRatio}</span>
                <span>{image.resolution}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {new Date(image.createdAt).toLocaleString("fr-FR")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
