import { useState } from "react";
import { Upload, Palette, Sparkles, Download, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Décrivez votre projet",
    description: "Expliquez ce que vous voulez créer : événement, promotion, concert, formation...",
    color: "from-orange-500 to-amber-500",
    glowColor: "orange",
    visual: "upload"
  },
  {
    number: "02",
    icon: Palette,
    title: "Choisissez un template",
    description: "Sélectionnez parmi nos designs créés par des graphistes pros ou uploadez votre référence.",
    color: "from-violet-500 to-purple-500",
    glowColor: "violet",
    visual: "templates"
  },
  {
    number: "03",
    icon: Sparkles,
    title: "L'IA génère votre affiche",
    description: "Notre IA s'inspire du style choisi pour créer votre visuel personnalisé en quelques secondes.",
    color: "from-cyan-500 to-blue-500",
    glowColor: "cyan",
    visual: "ai"
  },
  {
    number: "04",
    icon: Download,
    title: "Téléchargez et partagez",
    description: "Récupérez votre affiche HD prête à l'impression ou au partage sur les réseaux sociaux.",
    color: "from-emerald-500 to-green-500",
    glowColor: "emerald",
    visual: "download"
  }
];

function Step3DCard({ step, index, isActive, onClick }: { 
  step: typeof steps[0]; 
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = step.icon;
  
  return (
    <div 
      className={`relative cursor-pointer transition-all duration-500 ${isActive ? 'scale-105 z-10' : 'scale-100 opacity-70 hover:opacity-90'}`}
      onClick={onClick}
      style={{ 
        perspective: '1000px',
        animationDelay: `${index * 0.15}s`
      }}
    >
      {/* 3D Card Container */}
      <div 
        className={`relative transform-gpu transition-all duration-700 ${isActive ? 'rotate-y-0' : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isActive ? 'rotateY(0deg) rotateX(0deg)' : `rotateY(${index % 2 === 0 ? -5 : 5}deg) rotateX(2deg)`
        }}
      >
        {/* Glow Effect */}
        <div 
          className={`absolute -inset-4 rounded-3xl bg-gradient-to-r ${step.color} opacity-0 blur-2xl transition-opacity duration-500 ${isActive ? 'opacity-30' : ''}`}
        />
        
        {/* Main Card */}
        <div className={`relative p-8 rounded-3xl bg-card/80 backdrop-blur-xl border-2 transition-all duration-500 ${isActive ? 'border-primary/60 shadow-2xl' : 'border-border/40'}`}>
          {/* Number Badge - Floating */}
          <div 
            className={`absolute -top-4 -right-4 w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-lg shadow-lg transform transition-transform duration-500 ${isActive ? 'scale-110 rotate-6' : 'rotate-0'}`}
            style={{
              boxShadow: isActive ? `0 10px 40px -10px ${step.glowColor === 'orange' ? 'rgba(249, 115, 22, 0.5)' : step.glowColor === 'violet' ? 'rgba(139, 92, 246, 0.5)' : step.glowColor === 'cyan' ? 'rgba(6, 182, 212, 0.5)' : 'rgba(16, 185, 129, 0.5)'}` : 'none'
            }}
          >
            {step.number}
          </div>
          
          {/* 3D Icon Container */}
          <div className="relative mb-6">
            <div 
              className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center transform transition-all duration-500 ${isActive ? 'scale-110' : ''}`}
              style={{
                boxShadow: isActive ? `0 20px 40px -15px ${step.glowColor === 'orange' ? 'rgba(249, 115, 22, 0.4)' : step.glowColor === 'violet' ? 'rgba(139, 92, 246, 0.4)' : step.glowColor === 'cyan' ? 'rgba(6, 182, 212, 0.4)' : 'rgba(16, 185, 129, 0.4)'}` : 'none',
                transform: isActive ? 'translateZ(20px)' : 'translateZ(0)'
              }}
            >
              <Icon className="w-10 h-10 text-white" />
            </div>
            
            {/* Floating particles */}
            {isActive && (
              <>
                <div className="absolute -top-2 -left-2 w-3 h-3 rounded-full bg-primary/60 animate-float" />
                <div className="absolute top-4 -right-4 w-2 h-2 rounded-full bg-accent/60 animate-float" style={{ animationDelay: '0.5s' }} />
                <div className="absolute -bottom-1 left-6 w-2 h-2 rounded-full bg-primary/40 animate-float" style={{ animationDelay: '1s' }} />
              </>
            )}
          </div>
          
          {/* Content */}
          <h3 className="font-display text-xl font-bold mb-3 text-foreground">
            {step.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed text-sm">
            {step.description}
          </p>
          
          {/* Progress Line - Only show when active */}
          {isActive && (
            <div className="mt-6 h-1 rounded-full bg-secondary overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${step.color} animate-shimmer`}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessVisual({ activeStep }: { activeStep: number }) {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center">
      {/* Central 3D Phone/Device Mockup */}
      <div 
        className="relative w-72 h-[500px] rounded-[3rem] bg-gradient-to-b from-card to-card/80 border-4 border-border/60 shadow-2xl overflow-hidden"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Screen */}
        <div className="absolute inset-3 rounded-[2.5rem] bg-background overflow-hidden">
          {/* Dynamic content based on step */}
          <div className="relative w-full h-full">
            {/* Step 1: Upload Visual */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 transition-all duration-700 ${activeStep === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="w-32 h-32 rounded-3xl border-4 border-dashed border-primary/40 flex items-center justify-center mb-6 animate-pulse">
                <Upload className="w-12 h-12 text-primary/60" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Décrivez votre projet</p>
                <div className="h-2 w-48 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full animate-shimmer" />
                </div>
              </div>
              {/* Floating text bubbles */}
              <div className="absolute top-8 right-4 px-3 py-2 rounded-xl bg-primary/20 text-xs text-primary animate-float">
                Concert gospel 🎵
              </div>
              <div className="absolute bottom-20 left-4 px-3 py-2 rounded-xl bg-accent/20 text-xs text-accent animate-float" style={{ animationDelay: '0.5s' }}>
                Restaurant africain 🍽️
              </div>
            </div>
            
            {/* Step 2: Templates Visual */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 transition-all duration-700 ${activeStep === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="grid grid-cols-2 gap-3 w-full">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i}
                    className={`aspect-[3/4] rounded-xl bg-gradient-to-br ${i === 1 ? 'from-primary to-accent ring-2 ring-primary ring-offset-2 ring-offset-background' : 'from-muted to-muted/50'} flex items-center justify-center transition-all duration-500`}
                    style={{ 
                      animationDelay: `${i * 0.1}s`,
                      transform: i === 1 ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    <Palette className={`w-6 h-6 ${i === 1 ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                +500 templates pros
              </p>
            </div>
            
            {/* Step 3: AI Generation Visual */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 transition-all duration-700 ${activeStep === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="relative w-40 h-40">
                {/* Rotating rings */}
                <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-spin-slow" />
                <div className="absolute inset-4 rounded-full border-4 border-accent/30 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '4s' }} />
                <div className="absolute inset-8 rounded-full border-4 border-primary/20 animate-spin-slow" style={{ animationDuration: '6s' }} />
                
                {/* Center sparkle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-sm text-primary font-medium mt-6 animate-pulse">
                Génération en cours...
              </p>
              <div className="flex gap-1 mt-3">
                {[0, 1, 2].map((i) => (
                  <div 
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
            
            {/* Step 4: Download Visual */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 transition-all duration-700 ${activeStep === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="relative">
                <div className="w-36 h-48 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary shadow-2xl flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/reference-templates/event/concert-gospel-cct.jpg')] bg-cover bg-center opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="h-2 w-full bg-white/30 rounded-full mb-1" />
                    <div className="h-2 w-2/3 bg-white/20 rounded-full" />
                  </div>
                </div>
                {/* Checkmark badge */}
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-scale-in">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-green-500 font-medium mt-6">
                Affiche prête ! ✨
              </p>
              <div className="flex gap-3 mt-4">
                <div className="px-3 py-1.5 rounded-full bg-primary/20 text-xs text-primary">HD</div>
                <div className="px-3 py-1.5 rounded-full bg-accent/20 text-xs text-accent">Print</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Notch */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-background" />
        
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-muted-foreground/30" />
      </div>
      
      {/* Floating decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl animate-float" />
      <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.3 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
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
          {/* Left: Interactive 3D Visual */}
          <div className="order-2 lg:order-1 hidden lg:block">
            <ProcessVisual activeStep={activeStep} />
          </div>
          
          {/* Right: Step Cards */}
          <div className="order-1 lg:order-2 space-y-6">
            {steps.map((step, index) => (
              <Step3DCard
                key={step.number}
                step={step}
                index={index}
                isActive={activeStep === index}
                onClick={() => setActiveStep(index)}
              />
            ))}
            
            {/* CTA Button */}
            <div className="pt-6">
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
            <div className="relative w-48 h-80 rounded-[2rem] bg-gradient-to-b from-card to-card/80 border-2 border-border/60 shadow-xl overflow-hidden">
              <div className="absolute inset-2 rounded-[1.5rem] bg-background flex items-center justify-center">
                <div className="text-center p-4">
                  <Sparkles className="w-10 h-10 text-primary mx-auto mb-3 animate-pulse" />
                  <p className="text-xs text-muted-foreground">Étape {activeStep + 1}/4</p>
                  <p className="text-sm font-medium text-foreground mt-1">{steps[activeStep].title}</p>
                </div>
              </div>
            </div>
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
    </section>
  );
}
