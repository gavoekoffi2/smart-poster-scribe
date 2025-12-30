import { LogoPosition } from "@/types/generation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogoPositionSelectProps {
  onSelect: (position: LogoPosition) => void;
  disabled?: boolean;
}

const positions: { id: LogoPosition; label: string; icon: string }[] = [
  { id: "top-left", label: "Haut gauche", icon: "↖" },
  { id: "top-right", label: "Haut droite", icon: "↗" },
  { id: "center", label: "Centre", icon: "◉" },
  { id: "bottom-left", label: "Bas gauche", icon: "↙" },
  { id: "bottom-right", label: "Bas droite", icon: "↘" },
];

export function LogoPositionSelect({ onSelect, disabled }: LogoPositionSelectProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Où souhaitez-vous placer le logo ?</p>
      
      {/* Visual grid representation */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-background/50 rounded-lg border border-border/30 max-w-[200px]">
        <Button
          variant="outline"
          size="sm"
          className="h-12 text-lg"
          onClick={() => onSelect("top-left")}
          disabled={disabled}
        >
          ↖
        </Button>
        <div className="h-12" />
        <Button
          variant="outline"
          size="sm"
          className="h-12 text-lg"
          onClick={() => onSelect("top-right")}
          disabled={disabled}
        >
          ↗
        </Button>
        <div className="h-12" />
        <Button
          variant="outline"
          size="sm"
          className="h-12 text-lg"
          onClick={() => onSelect("center")}
          disabled={disabled}
        >
          ◉
        </Button>
        <div className="h-12" />
        <Button
          variant="outline"
          size="sm"
          className="h-12 text-lg"
          onClick={() => onSelect("bottom-left")}
          disabled={disabled}
        >
          ↙
        </Button>
        <div className="h-12" />
        <Button
          variant="outline"
          size="sm"
          className="h-12 text-lg"
          onClick={() => onSelect("bottom-right")}
          disabled={disabled}
        >
          ↘
        </Button>
      </div>

      {/* Labels */}
      <div className="flex flex-wrap gap-2">
        {positions.map((pos) => (
          <Button
            key={pos.id}
            variant="ghost"
            size="sm"
            onClick={() => onSelect(pos.id)}
            disabled={disabled}
            className="text-xs"
          >
            {pos.icon} {pos.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
