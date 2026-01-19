import logoImage from "@/assets/logo-graphiste-gpt-icon.png";

interface LogoIconProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 40, className = "" }: LogoIconProps) {
  return (
    <img 
      src={logoImage} 
      alt="Graphiste GPT" 
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ 
        width: size, 
        height: size,
        background: "transparent"
      }}
    />
  );
}
