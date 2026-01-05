import { Sparkles, Palette, Zap, Image, MessageSquare, Download, Layers, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: MessageSquare,
    title: "Conversation Naturelle",
    description: "Décrivez votre projet en langage naturel, notre IA comprend vos besoins.",
    gradient: "from-violet-500 to-purple-600"
  },
  {
    icon: Palette,
    title: "Palette de Couleurs",
    description: "Personnalisez les couleurs de votre visuel avec notre sélecteur intelligent.",
    gradient: "from-pink-500 to-rose-600"
  },
  {
    icon: Layers,
    title: "Templates Pro",
    description: "Plus de 50 templates professionnels adaptés à chaque domaine d'activité.",
    gradient: "from-blue-500 to-cyan-600"
  },
  {
    icon: Image,
    title: "Références Visuelles",
    description: "Uploadez des images de référence pour guider la création.",
    gradient: "from-emerald-500 to-teal-600"
  },
  {
    icon: Zap,
    title: "Génération Rapide",
    description: "Obtenez vos visuels en quelques secondes grâce à notre IA optimisée.",
    gradient: "from-amber-500 to-orange-600"
  },
  {
    icon: Clock,
    title: "Historique Complet",
    description: "Retrouvez toutes vos créations dans votre espace personnel.",
    gradient: "from-indigo-500 to-blue-600"
  },
  {
    icon: Download,
    title: "Export HD",
    description: "Téléchargez vos créations en haute définition, prêtes à l'impression.",
    gradient: "from-fuchsia-500 to-pink-600"
  },
  {
    icon: Sparkles,
    title: "IA Avancée",
    description: "Notre IA apprend de vos préférences pour des résultats toujours meilleurs.",
    gradient: "from-purple-500 to-violet-600"
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 relative">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Fonctionnalités</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Tout ce dont vous avez besoin</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Des outils puissants pour créer des visuels professionnels sans compétences en design.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="group bg-card/50 border-border/40 hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6 relative">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
