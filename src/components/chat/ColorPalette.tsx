import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const predefinedPalettes = [
  { name: "Professionnel", colors: ["#1a365d", "#2b6cb0", "#4299e1", "#90cdf4"] },
  { name: "Vibrant", colors: ["#e53e3e", "#ed8936", "#ecc94b", "#48bb78"] },
  { name: "Élégant", colors: ["#1a202c", "#2d3748", "#a0aec0", "#edf2f7"] },
  { name: "Nature", colors: ["#22543d", "#38a169", "#68d391", "#c6f6d5"] },
  { name: "Créatif", colors: ["#553c9a", "#805ad5", "#d53f8c", "#f687b3"] },
  { name: "Corporate", colors: ["#2c5282", "#3182ce", "#63b3ed", "#bee3f8"] },
];

interface ColorPaletteProps {
  selectedColors: string[];
  onColorsChange: (colors: string[]) => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export function ColorPalette({
  selectedColors,
  onColorsChange,
  onConfirm,
  disabled,
}: ColorPaletteProps) {
  const [customColor, setCustomColor] = useState("#00d4ff");

  const addColor = (color: string) => {
    if (!selectedColors.includes(color) && selectedColors.length < 5) {
      onColorsChange([...selectedColors, color]);
    }
  };

  const removeColor = (color: string) => {
    onColorsChange(selectedColors.filter((c) => c !== color));
  };

  const selectPalette = (colors: string[]) => {
    onColorsChange(colors);
  };

  return (
    <div className="space-y-4 w-full max-w-md">
      {/* Predefined palettes */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Palettes suggérées</p>
        <div className="grid grid-cols-2 gap-2">
          {predefinedPalettes.map((palette) => (
            <button
              key={palette.name}
              onClick={() => selectPalette(palette.colors)}
              disabled={disabled}
              className={cn(
                "p-2 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-colors text-left",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <p className="text-xs font-medium mb-1">{palette.name}</p>
              <div className="flex gap-1">
                {palette.colors.map((color) => (
                  <div
                    key={color}
                    className="w-5 h-5 rounded-full border border-border/30"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom color picker */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Ajouter une couleur personnalisée</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
            disabled={disabled}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => addColor(customColor)}
            disabled={disabled || selectedColors.length >= 5}
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Selected colors */}
      {selectedColors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Couleurs sélectionnées ({selectedColors.length}/5)
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedColors.map((color) => (
              <div
                key={color}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-card border border-border/50"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">{color}</span>
                <button
                  onClick={() => removeColor(color)}
                  className="text-muted-foreground hover:text-foreground"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm button */}
      <Button onClick={onConfirm} disabled={disabled} className="w-full">
        <Check className="w-4 h-4 mr-2" />
        Confirmer les couleurs
      </Button>
    </div>
  );
}
