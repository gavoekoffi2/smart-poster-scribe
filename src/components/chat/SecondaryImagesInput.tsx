import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadButton } from "@/components/chat/ImageUploadButton";
import { ImagePlus, X, Plus, Check, Trash2 } from "lucide-react";

export interface SecondaryImage {
  id: string;
  imageUrl: string;
  instructions: string;
}

interface SecondaryImagesInputProps {
  secondaryImages: SecondaryImage[];
  onAddImage: (image: SecondaryImage) => void;
  onRemoveImage: (id: string) => void;
  onUpdateInstructions: (id: string, instructions: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  disabled?: boolean;
  mainImageUrl?: string;
}

export function SecondaryImagesInput({
  secondaryImages,
  onAddImage,
  onRemoveImage,
  onUpdateInstructions,
  onConfirm,
  onSkip,
  disabled,
  mainImageUrl,
}: SecondaryImagesInputProps) {
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingInstructions, setPendingInstructions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleImageSelect = (imageDataUrl: string) => {
    setPendingImage(imageDataUrl);
    setPendingInstructions("");
  };

  const handleConfirmPending = () => {
    if (!pendingImage) return;
    
    const newImage: SecondaryImage = {
      id: `sec-${Date.now()}`,
      imageUrl: pendingImage,
      instructions: pendingInstructions.trim(),
    };
    
    onAddImage(newImage);
    setPendingImage(null);
    setPendingInstructions("");
  };

  const handleCancelPending = () => {
    setPendingImage(null);
    setPendingInstructions("");
  };

  return (
    <div className="space-y-4 w-full animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Image principale (si fournie) */}
      {mainImageUrl && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-2">Image principale</p>
          <div className="flex items-center gap-3">
            <img 
              src={mainImageUrl} 
              alt="Image principale" 
              className="w-16 h-16 object-cover rounded-lg border border-border"
            />
            <span className="text-sm text-foreground">✓ Image principale ajoutée</span>
          </div>
        </div>
      )}

      {/* Liste des images secondaires ajoutées */}
      {secondaryImages.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            Images secondaires ({secondaryImages.length})
          </p>
          {secondaryImages.map((img, index) => (
            <div 
              key={img.id} 
              className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2"
            >
              <div className="flex items-start gap-3">
                <img 
                  src={img.imageUrl} 
                  alt={`Image ${index + 1}`} 
                  className="w-14 h-14 object-cover rounded-lg border border-border flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Image #{index + 1}</p>
                  {editingId === img.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={img.instructions}
                        onChange={(e) => onUpdateInstructions(img.id, e.target.value)}
                        placeholder="Instructions pour cette image..."
                        className="min-h-[60px] text-sm"
                      />
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        OK
                      </Button>
                    </div>
                  ) : (
                    <p 
                      className="text-sm text-foreground cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
                      onClick={() => setEditingId(img.id)}
                    >
                      {img.instructions || <span className="text-muted-foreground italic">Pas d'instructions (cliquez pour en ajouter)</span>}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveImage(img.id)}
                  disabled={disabled}
                  className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire pour ajouter une nouvelle image */}
      {pendingImage ? (
        <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
          <div className="flex items-start gap-3">
            <img 
              src={pendingImage} 
              alt="Nouvelle image" 
              className="w-20 h-20 object-cover rounded-lg border border-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-2">Nouvelle image</p>
              <Textarea
                value={pendingInstructions}
                onChange={(e) => setPendingInstructions(e.target.value)}
                placeholder="Instructions pour cette image... (ex: C'est le formateur principal, son nom est Jean Dupont / C'est un produit à mettre en avant à droite / C'est un invité spécial)"
                className="min-h-[80px] text-sm"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancelPending}
              disabled={disabled}
            >
              <X className="w-4 h-4 mr-1" />
              Annuler
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleConfirmPending}
              disabled={disabled}
              className="bg-primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <ImageUploadButton
            onImageSelect={handleImageSelect}
            disabled={disabled}
            label={secondaryImages.length === 0 ? "Ajouter une image secondaire" : "Ajouter une autre image"}
          />
        </div>
      )}

      {/* Boutons de confirmation */}
      {!pendingImage && (
        <div className="flex gap-3 pt-2 border-t border-border/30">
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={disabled}
            className="bg-primary flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            {secondaryImages.length === 0 
              ? "Continuer sans image secondaire" 
              : `Continuer avec ${secondaryImages.length} image${secondaryImages.length > 1 ? 's' : ''}`
            }
          </Button>
        </div>
      )}
    </div>
  );
}
