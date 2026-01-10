import { useState } from "react";
import { Upload, Palette, Sparkles, Download, ArrowRight, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Décrivez votre projet",
    description: "Expliquez ce que vous voulez créer : événement, promotion, concert, formation...",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500",
    glowColor: "rgba(249, 115, 22, 0.4)"
  },
  {
    number: "02",
    icon: Palette,
    title: "Choisissez un template",
    description: "Sélectionnez parmi nos designs créés par des graphistes pros ou uploadez votre référence.",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-500",
    glowColor: "rgba(139, 92, 246, 0.4)"
  },
  {
    number: "03",
    icon: Sparkles,
    title: "L'IA génère votre affiche",
    description: "Notre IA s'inspire du style choisi pour créer votre visuel personnalisé en quelques secondes.",
    color: "from-cyan-500 to-blue-500",
    bgColor: "bg-cyan-500",
    glowColor: "rgba(6, 182, 212, 0.4)"
  },
  {
    number: "04",
    icon: Download,
    title: "Téléchargez et partagez",
    description: "Récupérez votre affiche HD prête à l'impression ou au partage sur les réseaux sociaux.",
    color: "from-emerald-500 to-green-500",
    bgColor: "bg-emerald-500",
    glowColor: "rgba(16, 185, 129, 0.4)"
  }
];

// Animated 3D Arrow Component
function AnimatedArrow({ isActive, direction = "down" }: { isActive: boolean; direction?: "down" | "right" }) {
  return (
    <div className={`relative flex items-center justify-center ${direction === "down" ? "h-16 my-2" : "w-16 mx-2"}`}>
      {/* Arrow line with animation */}
      <div className={`relative ${direction === "down" ? "w-1 h-full" : "h-1 w-full"}`}>
        {/* Base line */}
        <div className={`absolute inset-0 bg-gradient-to-${direction === "down" ? "b" : "r"} from-primary/40 via-primary/60 to-primary/40 rounded-full`} />
        
        {/* Animated pulse traveling along the line */}
        <div 
          className={`absolute ${direction === "down" ? "w-full h-4 left-0" : "h-full w-4 top-0"} bg-gradient-to-${direction === "down" ? "b" : "r"} from-transparent via-primary to-transparent rounded-full ${isActive ? "animate-pulse-travel" : ""}`}
          style={{
            animation: isActive ? `pulseTravelY 1.5s ease-in-out infinite` : "none"
          }}
        />
      </div>
      
      {/* Arrow head - 3D effect */}
      <div className={`absolute ${direction === "down" ? "bottom-0" : "right-0"} transform`}>
        <div 
          className={`relative ${direction === "down" ? "rotate-0" : "-rotate-90"}`}
          style={{
            filter: isActive ? `drop-shadow(0 0 8px hsl(var(--primary)))` : "none"
          }}
        >
          {/* 3D Arrow head */}
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className={`transition-all duration-300 ${isActive ? "scale-125" : "scale-100"}`}
          >
            <defs>
              <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <path 
              d="M12 4L20 12L12 20L10 18L15 13H4V11H15L10 6L12 4Z" 
              fill="url(#arrowGradient)"
              transform="rotate(90 12 12)"
            />
          </svg>
          
          {/* Glow effect */}
          {isActive && (
            <div className="absolute inset-0 bg-primary/30 blur-md rounded-full animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

// 3D Step Card with Icon
function Step3DCard({ step, index, isActive, onClick }: { 
  step: typeof steps[0]; 
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = step.icon;
  
  return (
    <div 
      className={`relative cursor-pointer transition-all duration-500 ${isActive ? 'scale-105 z-10' : 'scale-100 opacity-80 hover:opacity-100'}`}
      onClick={onClick}
      style={{ perspective: '1000px' }}
    >
      {/* Glow Effect */}
      <div 
        className={`absolute -inset-2 rounded-3xl bg-gradient-to-r ${step.color} opacity-0 blur-xl transition-opacity duration-500 ${isActive ? 'opacity-40' : ''}`}
      />
      
      {/* Main Card */}
      <div 
        className={`relative p-6 rounded-2xl bg-card/80 backdrop-blur-xl border-2 transition-all duration-500 ${isActive ? 'border-primary/60 shadow-2xl' : 'border-border/40'}`}
        style={{
          transform: isActive ? 'rotateX(0deg) rotateY(0deg) translateZ(10px)' : `rotateX(2deg) rotateY(${index % 2 === 0 ? -3 : 3}deg)`,
          transformStyle: 'preserve-3d',
          boxShadow: isActive ? `0 25px 50px -12px ${step.glowColor}` : 'none'
        }}
      >
        {/* Number Badge */}
        <div 
          className={`absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg transform transition-transform duration-500 ${isActive ? 'scale-110 rotate-6' : ''}`}
        >
          {step.number}
        </div>
        
        {/* 3D Icon Container */}
        <div className="flex items-start gap-4">
          <div 
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isActive ? 'scale-110' : ''}`}
            style={{
              boxShadow: isActive ? `0 10px 30px -10px ${step.glowColor}` : 'none',
              transform: isActive ? 'translateZ(15px)' : 'translateZ(0)'
            }}
          >
            <Icon className="w-7 h-7 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold mb-1 text-foreground">
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>
        
        {/* Progress indicator when active */}
        {isActive && (
          <div className="mt-4 h-1 rounded-full bg-secondary overflow-hidden">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${step.color}`}
              style={{ 
                width: '100%',
                animation: 'shimmer 2s ease-in-out infinite'
              }}
            />
          </div>
        )}
        
        {/* Floating particles when active */}
        {isActive && (
          <>
            <div className="absolute -top-2 left-4 w-2 h-2 rounded-full bg-primary/60 animate-float" />
            <div className="absolute top-1/2 -right-2 w-1.5 h-1.5 rounded-full bg-accent/60 animate-float" style={{ animationDelay: '0.5s' }} />
          </>
        )}
      </div>
    </div>
  );
}

// Central 3D Visual Display
function ProcessVisual({ activeStep }: { activeStep: number }) {
  const currentStep = steps[activeStep];
  const Icon = currentStep.icon;
  
  return (
    <div className="relative w-full aspect-square max-w-md mx-auto flex items-center justify-center">
      {/* Background glow */}
      <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentStep.color} opacity-20 blur-3xl transition-all duration-700`}
      />
      
      {/* Outer rotating ring */}
      <div 
        className="absolute inset-8 rounded-full border-2 border-primary/20 animate-spin-slow"
        style={{ animationDuration: '20s' }}
      >
        {/* Dots on the ring */}
        {[0, 90, 180, 270].map((deg, i) => (
          <div 
            key={i}
            className={`absolute w-3 h-3 rounded-full ${currentStep.bgColor} shadow-lg`}
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateX(calc(50% + 120px)) translateY(-50%)`
            }}
          />
        ))}
      </div>
      
      {/* Inner rotating ring - opposite direction */}
      <div 
        className="absolute inset-20 rounded-full border-2 border-accent/20 animate-spin-slow"
        style={{ animationDuration: '15s', animationDirection: 'reverse' }}
      >
        {[45, 135, 225, 315].map((deg, i) => (
          <div 
            key={i}
            className="absolute w-2 h-2 rounded-full bg-accent/60"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateX(calc(50% + 70px)) translateY(-50%)`
            }}
          />
        ))}
      </div>
      
      {/* Central icon container */}
      <div 
        className={`relative z-10 w-32 h-32 rounded-3xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center shadow-2xl transition-all duration-700`}
        style={{
          boxShadow: `0 25px 60px -15px ${currentStep.glowColor}`
        }}
      >
        <Icon className="w-16 h-16 text-white" />
        
        {/* Pulse effect */}
        <div 
          className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${currentStep.color} animate-ping opacity-30`}
          style={{ animationDuration: '2s' }}
        />
      </div>
      
      {/* Step indicator */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
        {steps.map((_, i) => (
          <div 
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeStep ? 'bg-primary w-6' : 'bg-muted-foreground/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ProcessSection() {
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  return (
    <section id="process" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-primary/10 blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-accent/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Play className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple & Rapide</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-foreground">Comment </span>
            <span className="gradient-text">ça marche ?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            De l'idée à l'affiche professionnelle en 4 étapes simples. 
            L'IA fait le travail, vous récoltez les résultats.
          </p>
        </div>
        
        {/* Main Content - 2 Column Layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Interactive 3D Visual - Desktop only */}
          <div className="order-2 lg:order-1 hidden lg:block">
            <ProcessVisual activeStep={activeStep} />
          </div>
          
          {/* Right: Step Cards with Arrows */}
          <div className="order-1 lg:order-2">
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={step.number}>
                  <Step3DCard
                    step={step}
                    index={index}
                    isActive={activeStep === index}
                    onClick={() => setActiveStep(index)}
                  />
                  
                  {/* Animated Arrow between steps */}
                  {index < steps.length - 1 && (
                    <AnimatedArrow isActive={activeStep === index} direction="down" />
                  )}
                </div>
              ))}
            </div>
            
            {/* CTA Button */}
            <div className="pt-8">
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full md:w-auto glow-orange bg-gradient-to-r from-primary to-accent rounded-full px-8 py-6 text-lg group"
              >
                Créer mon affiche maintenant
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Visual - Simplified */}
        <div className="lg:hidden mt-12">
          <div className="flex justify-center">
            <ProcessVisual activeStep={activeStep} />
          </div>
        </div>
        
        {/* Bottom tagline */}
        <div className="text-center mt-16 pt-8 border-t border-border/20">
          <p className="text-xl font-display font-semibold">
            <span className="text-foreground">Les graphistes créent, </span>
            <span className="gradient-text">l'IA automatise.</span>
            <span className="text-foreground"> Tout le monde gagne.</span>
          </p>
        </div>
      </div>
      
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes pulseTravelY {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(300%); opacity: 0; }
        }
        
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </section>
  );
}
