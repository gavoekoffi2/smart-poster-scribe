import { Button } from "@/components/ui/button";
import { ArrowRight, Star, CheckCircle, Play } from "lucide-react";
import heroImage from "@/assets/hero-designer-robot.png";
import { useState, useRef } from "react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate rotation based on mouse position (max 15 degrees)
    const rotateYValue = (mouseX / (rect.width / 2)) * 15;
    const rotateXValue = -(mouseY / (rect.height / 2)) * 15;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <section className="relative min-h-screen flex items-center px-4 pt-16 pb-8 overflow-hidden">
      {/* Organic background shapes */}
      <div className="absolute top-10 right-[20%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[150px] animate-pulse-glow" />
      <div className="absolute bottom-10 left-[10%] w-[400px] h-[400px] rounded-full bg-accent/15 blur-[120px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      
      {/* Decorative shapes */}
      <div className="absolute top-24 left-8 w-16 h-16 border-2 border-primary/30 rounded-lg rotate-12 animate-float opacity-40" />
      <div className="absolute bottom-32 right-12 w-12 h-12 bg-primary/20 rounded-full animate-float opacity-60" style={{ animationDelay: "0.5s" }} />
      <div className="absolute top-1/3 left-4 flex flex-col gap-2">
        <div className="w-3 h-3 border border-primary/50 rotate-45" />
        <div className="w-3 h-3 border border-primary/50 rotate-45" />
      </div>
      
      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-6 items-center">
          {/* Left Content */}
          <div className="text-left order-2 lg:order-1 pt-4 lg:pt-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6 animate-fade-up">
              <span className="text-sm font-medium text-primary">👋 Bienvenue !</span>
            </div>

            {/* Main Title */}
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-[1.1] animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <span className="text-foreground">Créez des </span>
              <span className="gradient-text">affiches pro</span>
              <span className="text-foreground"> en </span>
              <span className="gradient-text">quelques secondes</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground mb-8 max-w-lg animate-fade-up" style={{ animationDelay: "0.15s" }}>
              Uploadez une affiche de référence ou choisissez parmi nos templates créés par des graphistes pros. 
              L'IA s'inspire de leur design pour générer votre affiche personnalisée.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-start mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <Button 
                size="lg" 
                onClick={onGetStarted}
                className="group glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8 py-6 rounded-full"
              >
                Commencer
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg border-border hover:bg-secondary hover:border-primary/50 px-8 py-6 rounded-full group"
              >
                <Play className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                Voir la démo
              </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 pt-6 border-t border-border/30 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              {[
                { value: "5K+", label: "Visuels Créés" },
                { value: "50+", label: "Graphistes" },
                { value: "10+", label: "Domaines" },
                { value: "98%", label: "Satisfaction" },
              ].map((stat, i) => (
                <div key={i} className="text-left">
                  <span className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</span>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Hero Image with 3D Effect */}
          <div 
            ref={imageRef}
            className="relative order-1 lg:order-2 flex justify-center animate-fade-up lg:mt-8" 
            style={{ 
              animationDelay: "0.2s",
              perspective: "1000px",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Orange blob background - larger and more prominent */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-out"
              style={{
                transform: `translate(-50%, -50%) rotateX(${rotateX * 0.5}deg) rotateY(${rotateY * 0.5}deg)`,
              }}
            >
              <div className="w-[340px] h-[380px] md:w-[480px] md:h-[520px] lg:w-[520px] lg:h-[560px] relative">
                {/* Main organic orange shape */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary rounded-[60%_40%_30%_70%/60%_30%_70%_40%] animate-morph opacity-90" />
                <div className="absolute inset-4 bg-gradient-to-tl from-accent via-primary to-accent rounded-[40%_60%_70%_30%/40%_70%_30%_60%] animate-morph opacity-80" style={{ animationDelay: "1s" }} />
                {/* Additional glow layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-accent/50 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] blur-xl animate-morph opacity-60" />
              </div>
            </div>
            
            {/* Main hero image - African designer with robot - 3D tilt effect */}
            <div 
              className="relative z-10 w-full max-w-[480px] lg:max-w-[540px] aspect-[4/3] transition-transform duration-300 ease-out cursor-pointer"
              style={{
                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`,
                transformStyle: "preserve-3d",
              }}
            >
              <img 
                src={heroImage} 
                alt="Graphiste africain assisté par un robot IA" 
                className="w-full h-full object-cover rounded-2xl shadow-2xl shadow-primary/30"
                style={{
                  transform: "translateZ(30px)",
                }}
              />
              
              {/* Shine overlay effect on hover */}
              <div 
                className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  transform: "translateZ(40px)",
                }}
              />
              
              {/* Floating stats cards with 3D effect */}
              <div 
                className="absolute top-4 right-4 md:top-8 md:right-[-20px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-3 md:p-4 shadow-xl animate-float z-20"
                style={{
                  transform: `translateZ(50px) rotateX(${rotateX * 0.3}deg) rotateY(${rotateY * 0.3}deg)`,
                }}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Star className="w-4 h-4 md:w-5 md:h-5 text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-foreground">4.9</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Note clients</p>
                  </div>
                </div>
              </div>
              
              <div 
                className="absolute bottom-4 left-4 md:bottom-8 md:left-[-20px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-3 md:p-4 shadow-xl animate-float z-20" 
                style={{ 
                  animationDelay: "1s",
                  transform: `translateZ(50px) rotateX(${rotateX * 0.3}deg) rotateY(${rotateY * 0.3}deg)`,
                }}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-base md:text-lg font-bold text-foreground">+50K</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Visuels créés</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative dots pattern */}
            <div className="absolute bottom-0 right-0 grid grid-cols-3 gap-2 opacity-40">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-8 h-1 bg-primary rounded-full" />
        <div className="w-1 h-1 bg-primary/50 rounded-full" />
        <div className="w-1 h-1 bg-primary/30 rounded-full" />
      </div>
    </section>
  );
}
