import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorButtonProps {
  onClick: () => void;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function EditorButton({ onClick, disabled, size = "default", className }: EditorButtonProps) {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={`border-primary/30 hover:bg-primary/10 hover:border-primary transition-all duration-300 ${className}`}
    >
      <Pencil className="w-4 h-4 mr-2" />
      Éditer
    </Button>
  );
}
