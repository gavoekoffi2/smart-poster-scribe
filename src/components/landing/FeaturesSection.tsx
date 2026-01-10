import { Sparkles, Palette, Zap, Image, MessageSquare, Download, Layers, Clock, ArrowUpRight } from "lucide-react";

const services = [
  {
    icon: Sparkles,
    title: "Pour les Utilisateurs",
    description: "Créez vos affiches en quelques clics grâce à l'IA. Uploadez une référence ou choisissez un template, l'IA fait le reste.",
    image: "/reference-templates/service/designer-professionnel.jpg"
  },
  {
    icon: Palette,
    title: "Pour les Graphistes",
    description: "Soumettez vos designs et gagnez des royalties à chaque utilisation. Concentrez-vous sur la créativité, l'IA automatise le reste.",
    image: "/reference-templates/event/worship-xperience.jpg"
  },
  {
    icon: Layers,
    title: "Marketplace de Templates",
    description: "Des designs professionnels pour tous les secteurs : église, restaurant, événement, formation, e-commerce et plus encore.",
    image: "/reference-templates/event/praise-worship-concert.jpg"
  }
];

const features = [
  {
    icon: MessageSquare,
    title: "Conversation Naturelle",
    description: "Décrivez votre projet en langage naturel, notre IA comprend vos besoins.",
  },
  {
    icon: Palette,
    title: "Palette de Couleurs",
    description: "Personnalisez les couleurs de votre visuel avec notre sélecteur intelligent.",
  },
  {
    icon: Layers,
    title: "Templates Pro",
    description: "Plus de 50 templates professionnels adaptés à chaque domaine d'activité.",
  },
  {
    icon: Image,
    title: "Références Visuelles",
    description: "Uploadez des images de référence pour guider la création.",
  },
  {
    icon: Zap,
    title: "Génération Rapide",
    description: "Obtenez vos visuels en quelques secondes grâce à notre IA optimisée.",
  },
  {
    icon: Clock,
    title: "Historique Complet",
    description: "Retrouvez toutes vos créations dans votre espace personnel.",
  },
  {
    icon: Download,
    title: "Export HD",
    description: "Téléchargez vos créations en haute définition, prêtes à l'impression.",
  },
  {
    icon: Sparkles,
    title: "IA Avancée",
    description: "Notre IA apprend de vos préférences pour des résultats toujours meilleurs.",
  }
];

export function FeaturesSection() {
  return (
    <section id="services" className="py-24 px-4 relative overflow-hidden">
      {/* Diagonal stripes background */}
      <div className="absolute inset-0 diagonal-stripes opacity-50" />
      
      {/* Organic shapes */}
      <div className="absolute top-20 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-foreground">Pour Vous et Pour les </span>
            <span className="gradient-text">Graphistes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une plateforme où les utilisateurs créent des affiches en secondes, et les graphistes monétisent leur créativité.
          </p>
        </div>

        {/* Services Cards - Large showcase cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group service-card relative rounded-3xl bg-card/60 border border-border/40 overflow-hidden cursor-pointer"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>
              
              {/* Content */}
              <div className="p-6 relative">
                <h3 className="font-display text-2xl font-bold mb-2 text-foreground">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>

              {/* Arrow button */}
              <div className="absolute bottom-6 right-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                  <ArrowUpRight className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-3 mb-24">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <div className="w-3 h-3 rounded-full bg-muted" />
          <div className="w-3 h-3 rounded-full bg-muted" />
        </div>

        {/* Features Grid */}
        <div id="features" className="pt-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Fonctionnalités</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              <span className="gradient-text">Tout ce dont vous avez besoin</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="group p-6 rounded-2xl bg-card/40 border border-border/40 hover:border-primary/40 transition-all duration-500 hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="font-display text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
