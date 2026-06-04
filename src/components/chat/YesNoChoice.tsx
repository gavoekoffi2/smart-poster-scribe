import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface YesNoChoiceProps {
  onYes: () => void;
  onNo: () => void;
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
}

export function YesNoChoice({
  onYes,
  onNo,
  disabled,
  yesLabel = "Oui",
  noLabel = "Non",
}: YesNoChoiceProps) {
  return (
    <div className="flex flex-wrap gap-3 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Button
        onClick={onYes}
        disabled={disabled}
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 glow-gold"
      >
        <Check className="w-4 h-4 mr-2" />
        {yesLabel}
      </Button>
      <Button
        onClick={onNo}
        disabled={disabled}
        variant="outline"
        className="px-6 border-border/60 hover:bg-muted/50"
      >
        <X className="w-4 h-4 mr-2" />
        {noLabel}
      </Button>
    </div>
  );
}
