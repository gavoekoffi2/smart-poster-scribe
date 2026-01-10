import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const caseStudies = [
  {
    category: "Consulting",
    title: "Stratégie et Planification",
    subtitle: "Construction d'Idées",
    image: "/reference-templates/event/concert-gospel-cct.jpg"
  },
  {
    category: "Consulting",
    title: "Finance d'Entreprise pour",
    subtitle: "les Marchés d'aide",
    image: "/reference-templates/formation/certification-rh.jpg"
  },
  {
    category: "Consulting",
    title: "Consulting pour les",
    subtitle: "Organisations Business",
    image: "/reference-templates/service/smart-design-flyer.jpg"
  }
];

export function CaseStudiesSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background shapes */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 flex flex-col gap-4 opacity-40">
        <div className="w-8 h-8 border-2 border-primary rotate-45" />
        <div className="w-8 h-8 border-2 border-primary rotate-45" />
        <div className="w-8 h-8 border-2 border-primary rotate-45" />
      </div>
      
      <div className="absolute top-20 right-20 w-32 h-32 rounded-full border-[20px] border-secondary opacity-50" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-bold">
              <span className="text-foreground">Nous Servons les Meilleurs Travaux</span>
              <br />
              <span className="text-foreground">Voir les </span>
              <span className="gradient-text">Études de Cas</span>
            </h2>
          </div>
          <Button className="glow-orange bg-gradient-to-r from-primary to-accent rounded-full px-6">
            Tous les Projets
            <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Case Studies Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {caseStudies.map((study, index) => (
            <div
              key={study.title}
              className="group relative rounded-3xl overflow-hidden cursor-pointer"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Image */}
              <div className="relative h-80 overflow-hidden">
                <img 
                  src={study.image} 
                  alt={study.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              </div>
              
              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm text-primary font-medium">{study.category}</span>
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-1">
                  {study.title}
                </h3>
                <p className="text-muted-foreground">
                  {study.subtitle}
                </p>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
