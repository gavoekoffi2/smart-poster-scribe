import { ImagePlus, Palette, RectangleHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostGenerationOptionsProps {
  onAddLogo: () => void;
  onChangeColors: () => void;
  onChangeFormat: () => void;
  onKeepAsIs: () => void;
  disabled?: boolean;
}

export function PostGenerationOptions({
  onAddLogo,
  onChangeColors,
  onChangeFormat,
  onKeepAsIs,
  disabled,
}: PostGenerationOptionsProps) {
  return (
    <div className="space-y-3 max-w-md">
      <p className="text-sm text-muted-foreground font-medium">
        Souhaitez-vous personnaliser davantage ?
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddLogo}
          disabled={disabled}
          className="flex items-center gap-2 hover:border-primary/50 hover:bg-primary/5"
        >
          <ImagePlus className="w-4 h-4" />
          Ajouter un logo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onChangeColors}
          disabled={disabled}
          className="flex items-center gap-2 hover:border-primary/50 hover:bg-primary/5"
        >
          <Palette className="w-4 h-4" />
          Changer les couleurs
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onChangeFormat}
          disabled={disabled}
          className="flex items-center gap-2 hover:border-primary/50 hover:bg-primary/5"
        >
          <RectangleHorizontal className="w-4 h-4" />
          Changer le format
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onKeepAsIs}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          C'est parfait !
        </Button>
      </div>
    </div>
  );
}
