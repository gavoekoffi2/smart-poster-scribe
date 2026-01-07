import { Lightbulb, Layers, HeadphonesIcon, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    icon: Lightbulb,
    title: "Idée Generate",
    description: "Décrivez votre projet et laissez notre IA générer des concepts créatifs."
  },
  {
    number: "2",
    icon: Layers,
    title: "System Design",
    description: "Notre système crée automatiquement des designs professionnels adaptés."
  },
  {
    number: "3",
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description: "Une assistance continue pour tous vos besoins de création graphique."
  },
  {
    number: "4",
    icon: TrendingUp,
    title: "Sales Generate",
    description: "Des visuels qui convertissent et génèrent plus de ventes pour vous."
  }
];

const brands = [
  "TECHNOLOGY",
  "travel WORLD",
  "CONNECT",
  "ZETRA Z",
  "TECHNOLOGY"
];

export function ProcessSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden bg-secondary/30">
      {/* Diagonal line decorations */}
      <div className="absolute top-0 right-0 w-1/3 h-full">
        <div className="absolute top-20 right-20 w-40 h-40 rounded-full bg-primary/10 blur-[60px]" />
      </div>
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left - Process Steps */}
          <div className="grid grid-cols-2 gap-6">
            {steps.map((step, index) => (
              <div 
                key={step.title}
                className="group relative p-6 rounded-3xl bg-card/60 border border-border/40 hover:border-primary/40 transition-all duration-300 hover:-translate-y-2"
              >
                {/* Number badge */}
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white shadow-lg">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-secondary/80 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                
                <h3 className="font-display text-lg font-bold mb-2">
                  <span className="text-foreground">{step.title.split(" ")[0]} </span>
                  <span className="gradient-text">{step.title.split(" ").slice(1).join(" ")}</span>
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          
          {/* Right - Content */}
          <div className="lg:pl-8">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              <span className="text-foreground">La Méthode la Plus Rapide pour Atteindre le</span>{" "}
              <span className="gradient-text">Technology Consulting</span>
            </h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Pourquoi Choisir <span className="gradient-text">Graphiste GPT</span> ? Découvrez qui nous sommes
            </h3>
            
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Nous créons une valeur de marque mondiale avant de traiter les données de manière transparente. 
              Collaborativement, nous initions une expertise stratégique après des modèles fonctionnalisés. 
              Synergiquement, nous optimisons le front-end et la convergence alors que la ressource apprend.
            </p>
            
            <Button className="glow-orange bg-gradient-to-r from-primary to-accent rounded-full px-8 py-6 text-lg group">
              Plus d'infos
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
        
        {/* Brands row */}
        <div className="mt-20 pt-12 border-t border-border/30">
          <p className="text-center text-muted-foreground mb-8">Plus de 5K+ Marques travaillent avec Graphiste GPT</p>
          <div className="flex flex-wrap justify-center items-center gap-12">
            {brands.map((brand, i) => (
              <div 
                key={i}
                className="text-2xl font-display font-bold text-muted-foreground/50 hover:text-primary transition-colors duration-300"
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
