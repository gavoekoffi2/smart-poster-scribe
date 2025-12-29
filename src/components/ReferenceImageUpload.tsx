import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferenceImageUploadProps {
  referenceImage: string | null;
  referenceDescription: string | null;
  onImageUpload: (imageDataUrl: string) => void;
  onImageRemove: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  disabled?: boolean;
}

export function ReferenceImageUpload({
  referenceImage,
  referenceDescription,
  onImageUpload,
  onImageRemove,
  onAnalyze,
  isAnalyzing,
  disabled,
}: ReferenceImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onImageUpload(result);
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        Image de référence
        <span className="text-xs text-muted-foreground">(optionnel)</span>
      </label>

      {!referenceImage ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border/50 bg-card/30 hover:border-border hover:bg-card/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Glissez une image ou <span className="text-primary">cliquez pour sélectionner</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            L'IA analysera cette image pour créer un template de style
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-border/50">
            <img
              src={referenceImage}
              alt="Image de référence"
              className="w-full h-32 object-cover"
            />
            <button
              onClick={onImageRemove}
              disabled={disabled || isAnalyzing}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!referenceDescription ? (
            <Button
              onClick={onAnalyze}
              disabled={disabled || isAnalyzing}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyser l'image
                </>
              )}
            </Button>
          ) : (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-xs text-primary mb-1">
                <Sparkles className="w-3 h-3" />
                Template extrait
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {referenceDescription}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
