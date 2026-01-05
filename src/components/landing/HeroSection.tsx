import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, Palette } from "lucide-react";
import { Link } from "react-router-dom";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="container mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Propulsé par l'IA</span>
        </div>

        {/* Main Title */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <span className="gradient-text">Créez des Visuels</span>
          <br />
          <span className="text-foreground">Professionnels</span>
          <br />
          <span className="text-primary">en Quelques Clics</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          Graphiste GPT génère des affiches, flyers et visuels marketing de qualité professionnelle grâce à l'intelligence artificielle.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Button 
            size="xl" 
            onClick={onGetStarted}
            className="group glow-gold text-lg"
          >
            Commencer Gratuitement
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
          <Link to="/auth">
            <Button variant="outline" size="xl" className="text-lg border-primary/30 hover:bg-primary/10">
              Se Connecter
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-20 animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">10K+</div>
            <div className="text-sm text-muted-foreground">Images Générées</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">50+</div>
            <div className="text-sm text-muted-foreground">Templates Pro</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">99%</div>
            <div className="text-sm text-muted-foreground">Satisfaction</div>
          </div>
        </div>
      </div>

      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
