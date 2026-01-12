import { useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  tiltAmount?: number;
  glareEnabled?: boolean;
  scale?: number;
}

export function TiltCard({ 
  children, 
  className,
  tiltAmount = 10,
  glareEnabled = true,
  scale = 1.02
}: TiltCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate rotation based on mouse position
    const rotateYValue = (mouseX / (rect.width / 2)) * tiltAmount;
    const rotateXValue = -(mouseY / (rect.height / 2)) * tiltAmount;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative transition-transform duration-300 ease-out",
        className
      )}
      style={{
        perspective: "1000px",
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHovered ? scale : 1})`,
          transformStyle: "preserve-3d",
        }}
      >
        {children}
        
        {/* Glare effect */}
        {glareEnabled && (
          <div 
            className={cn(
              "absolute inset-0 rounded-inherit pointer-events-none transition-opacity duration-300",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: `linear-gradient(
                ${135 + rotateY * 2}deg,
                transparent 40%,
                rgba(255, 255, 255, 0.1) 50%,
                transparent 60%
              )`,
              transform: "translateZ(1px)",
            }}
          />
        )}
      </div>
    </div>
  );
}
