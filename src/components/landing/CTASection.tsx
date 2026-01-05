import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface CTASectionProps {
  onGetStarted: () => void;
}

export function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="relative rounded-3xl bg-gradient-to-br from-primary/20 via-card to-accent/20 border border-primary/30 p-12 md:p-16 text-center overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Commencez maintenant</span>
            </div>

            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="gradient-text">Prêt à créer des</span>
              <br />
              <span className="text-foreground">visuels exceptionnels ?</span>
            </h2>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Rejoignez des milliers de créateurs qui utilisent Graphiste GPT pour leurs designs professionnels.
            </p>

            <Button 
              size="xl" 
              onClick={onGetStarted}
              className="group glow-gold text-lg"
            >
              Créer mon premier visuel
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
