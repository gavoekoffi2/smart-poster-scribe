import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Play } from "lucide-react";
import { Link } from "react-router-dom";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-12 overflow-hidden">
      {/* Organic background shapes */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-accent/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1s" }} />
      
      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-fade-up">
              <span className="text-sm font-medium text-primary">Bonjour !</span>
            </div>

            {/* Main Title */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] animate-fade-up" style={{ animationDelay: "0.1s" }}>
              <span className="text-foreground">Graphiste</span>
              <br />
              <span className="gradient-text">GPT,</span>
              <br />
              <span className="text-foreground">Votre Designer IA</span>
            </h1>

            {/* Quote */}
            <div className="flex items-start gap-4 mb-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="text-4xl text-primary/40 font-serif">"</div>
              <div>
                <p className="text-muted-foreground text-lg italic mb-2">
                  Graphiste GPT transforme vos idées en visuels professionnels instantanément.
                  Hautement Recommandé.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <Button 
                size="lg" 
                onClick={onGetStarted}
                className="group glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8 py-6"
              >
                Portfolio
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Link to="/auth">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg border-border hover:bg-secondary hover:border-primary/50 px-8 py-6"
                >
                  Commencer
                </Button>
              </Link>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <div>
                <span className="text-3xl font-bold text-foreground">14+</span>
                <span className="text-muted-foreground ml-2">Années</span>
                <span className="text-muted-foreground block text-sm">d'Expérience</span>
              </div>
            </div>
          </div>

          {/* Right Content - Designer Illustration */}
          <div className="relative order-1 lg:order-2 flex justify-center animate-fade-up" style={{ animationDelay: "0.2s" }}>
            {/* Orange blob background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 md:w-[450px] md:h-[450px]">
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent rounded-full opacity-90" />
              <div className="absolute inset-4 bg-gradient-to-br from-accent to-primary rounded-full" />
            </div>
            
            {/* Designer placeholder - African designer with laptop */}
            <div className="relative z-10 w-72 h-80 md:w-96 md:h-[420px]">
              {/* Main designer silhouette */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 md:w-80">
                {/* Desk/Laptop area */}
                <div className="relative">
                  {/* Laptop */}
                  <div className="mx-auto w-48 md:w-56 h-32 md:h-36 bg-gradient-to-b from-secondary to-card rounded-t-lg border border-border/50 shadow-2xl flex items-center justify-center">
                    {/* Screen glow */}
                    <div className="w-44 md:w-52 h-28 md:h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                        <div className="text-xs text-muted-foreground">Graphiste GPT</div>
                      </div>
                    </div>
                  </div>
                  {/* Laptop base */}
                  <div className="mx-auto w-56 md:w-64 h-3 bg-secondary rounded-b-lg border-x border-b border-border/50" />
                  
                  {/* Designer figure */}
                  <div className="absolute -top-48 md:-top-56 left-1/2 -translate-x-1/2">
                    {/* Head */}
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-b from-amber-700 to-amber-800 mx-auto mb-2 shadow-lg relative overflow-hidden">
                      {/* Face features */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-900/30 rounded-full" /> {/* Smile */}
                    </div>
                    {/* Body */}
                    <div className="w-32 md:w-40 h-28 md:h-32 bg-gradient-to-b from-foreground/90 to-foreground/80 rounded-t-3xl mx-auto relative">
                      {/* Collar */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-muted rounded-b-lg" />
                    </div>
                  </div>
                  
                  {/* AI Robot companion */}
                  <div className="absolute -right-8 md:-right-12 -top-32 md:-top-36">
                    <div className="w-16 md:w-20 h-20 md:h-24 animate-float">
                      {/* Robot head */}
                      <div className="w-14 md:w-16 h-14 md:h-16 bg-gradient-to-b from-secondary to-card rounded-2xl border border-primary/30 mx-auto shadow-lg shadow-primary/20 relative">
                        {/* Robot eyes */}
                        <div className="absolute top-4 left-2 w-3 h-3 bg-primary rounded-full animate-pulse" />
                        <div className="absolute top-4 right-2 w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
                        {/* Antenna */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-4 bg-primary/60 rounded-full" />
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full animate-pulse" />
                      </div>
                      {/* Robot body */}
                      <div className="w-10 md:w-12 h-8 bg-gradient-to-b from-secondary to-card rounded-lg border border-primary/20 mx-auto mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
    </section>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364" />
    </svg>
  );
}
