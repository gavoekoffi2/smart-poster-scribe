import { motion } from "framer-motion";
import designerAvatar from "@/assets/designer-avatar.png";

interface TutorialMascotProps {
  isWaving?: boolean;
  isPointing?: boolean;
  size?: "sm" | "md" | "lg";
}

export function TutorialMascot({ isWaving = false, isPointing = false, size = "md" }: TutorialMascotProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  return (
    <motion.div 
      className={`relative ${sizeClasses[size]}`}
      animate={isWaving ? { 
        rotate: [0, -5, 5, -5, 0],
        y: [0, -5, 0]
      } : isPointing ? {
        x: [0, 10, 0],
        rotate: [0, 5, 0]
      } : {
        y: [0, -8, 0]
      }}
      transition={{
        duration: isWaving ? 0.8 : 2,
        repeat: isWaving ? 0 : Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
      
      {/* Avatar container */}
      <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-primary shadow-xl shadow-primary/30">
        <img 
          src={designerAvatar} 
          alt="Graphiste GPT Assistant" 
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Speech indicator */}
      <motion.div
        className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <span className="text-primary-foreground text-xs">💬</span>
      </motion.div>
    </motion.div>
  );
}
