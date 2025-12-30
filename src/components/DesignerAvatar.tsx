import { cn } from "@/lib/utils";
import designerAvatar from "@/assets/designer-avatar.png";

interface DesignerAvatarProps {
  isWorking?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
  xl: "w-28 h-28",
};

export function DesignerAvatar({ isWorking = false, size = "md", className }: DesignerAvatarProps) {
  return (
    <div className={cn("avatar-container", isWorking && "is-working", className)}>
      {/* Ambient glow */}
      <div className="avatar-glow" />
      
      {/* Spinning ring - only visible when working */}
      <div className={cn("avatar-ring", sizeClasses[size])} />
      
      {/* Avatar image */}
      <img
        src={designerAvatar}
        alt="Graphiste GPT"
        className={cn("avatar-image", sizeClasses[size])}
      />
      
      {/* Working indicator dot */}
      {isWorking && (
        <div className="working-indicator" />
      )}
    </div>
  );
}
