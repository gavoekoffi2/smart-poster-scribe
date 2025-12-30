import { cn } from "@/lib/utils";
import designerAvatar from "@/assets/designer-avatar.png";

interface DesignerAvatarProps {
  isWorking?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-9 h-9",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

export function DesignerAvatar({ isWorking = false, size = "md", className }: DesignerAvatarProps) {
  return (
    <div className={cn("avatar-container flex-shrink-0", isWorking && "is-working", className)}>
      {/* Ambient glow */}
      <div className="avatar-glow" />
      
      {/* Spinning ring - only visible when working */}
      <div className={cn("avatar-ring", sizeClasses[size])} />
      
      {/* Avatar image */}
      <img
        src={designerAvatar}
        alt="Graphiste GPT"
        className={cn("avatar-image rounded-full", sizeClasses[size])}
      />
      
      {/* Working indicator dot */}
      {isWorking && (
        <div className="working-indicator" />
      )}
    </div>
  );
}
