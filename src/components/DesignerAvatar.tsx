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
    <div className={cn("avatar-container", isWorking && "avatar-working", className)}>
      {/* Glow effect */}
      <div className="avatar-glow" />
      
      {/* Spinning ring */}
      <div className={cn("avatar-ring", sizeClasses[size])} style={{ padding: "3px" }}>
        <div className="w-full h-full rounded-full bg-background" />
      </div>
      
      {/* Avatar image */}
      <img
        src={designerAvatar}
        alt="Graphiste GPT"
        className={cn(
          "relative rounded-full object-cover z-10 border-2 border-background",
          sizeClasses[size],
          isWorking && "animate-bounce-subtle"
        )}
      />
      
      {/* Working particles */}
      {isWorking && (
        <div className="working-particles">
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="particle"
              style={{
                top: "50%",
                left: "50%",
                "--tx": `${Math.cos((i * 60 * Math.PI) / 180) * 40}px`,
                "--ty": `${Math.sin((i * 60 * Math.PI) / 180) * 40}px`,
                animation: `float-particle 1.5s ease-out infinite`,
                animationDelay: `${i * 0.2}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
