import { Lightbulb, Layers, HeadphonesIcon, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    icon: Lightbulb,
    title: "Décrivez votre projet",
    description: "Expliquez ce que vous voulez : événement, promotion, concert, formation..."
  },
  {
    number: "2",
    icon: Layers,
    title: "Choisissez un template",
    description: "Sélectionnez parmi nos designs créés par des graphistes pros ou uploadez une référence."
  },
  {
    number: "3",
    icon: HeadphonesIcon,
    title: "L'IA génère votre affiche",
    description: "Notre IA s'inspire du style choisi pour créer votre visuel personnalisé."
  },
  {
    number: "4",
    icon: TrendingUp,
    title: "Téléchargez et partagez",
    description: "Récupérez votre affiche HD prête à l'impression ou au partage sur les réseaux."
  }
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
              <span className="text-foreground">Comment ça </span>
              <span className="gradient-text">marche ?</span>
            </h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-4">
              La puissance des <span className="gradient-text">graphistes</span> + l'efficacité de <span className="gradient-text">l'IA</span>
            </h3>
            
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Graphiste GPT combine la créativité des designers professionnels avec la puissance de l'IA. 
              Les graphistes créent les templates et perçoivent des royalties à chaque utilisation. 
              L'IA automatise la personnalisation. Résultat : des visuels de qualité en quelques secondes.
            </p>
            
            <Button className="glow-orange bg-gradient-to-r from-primary to-accent rounded-full px-8 py-6 text-lg group">
              Créer mon affiche
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
