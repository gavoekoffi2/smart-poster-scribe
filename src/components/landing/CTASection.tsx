import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

interface CTASectionProps {
  onGetStarted: () => void;
}

export function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section id="contact" className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[200px]" />
      
      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="relative rounded-[40px] bg-gradient-to-br from-card/80 to-card/40 border border-primary/20 p-12 md:p-20 text-center overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-primary/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
          
          {/* Floating elements */}
          <div className="absolute top-10 right-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 animate-float opacity-60" />
          <div className="absolute bottom-10 left-10 w-16 h-16 rounded-xl bg-gradient-to-br from-accent/30 to-primary/30 border border-accent/20 animate-float opacity-60" style={{ animationDelay: "1s" }} />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/20 border border-primary/30 mb-8">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Commencez maintenant</span>
            </div>

            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-foreground">Prêt à créer des</span>
              <br />
              <span className="gradient-text">visuels exceptionnels ?</span>
            </h2>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Rejoignez des milliers de créateurs qui utilisent Graphiste GPT pour leurs designs professionnels.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={onGetStarted}
                className="group glow-orange bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-10 py-7"
              >
                Créer mon premier visuel
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg border-border hover:bg-secondary hover:border-primary/50 px-10 py-7"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Voir la démo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
