import { Church, UtensilsCrossed, GraduationCap, Store, Calendar, Briefcase, Sparkles, ArrowUpRight } from "lucide-react";

const domains = [
  {
    icon: Church,
    name: "Église",
    description: "Affiches de culte, concerts gospel, retraites spirituelles",
    image: "/reference-templates/church/church-flyer-french.jpg"
  },
  {
    icon: UtensilsCrossed,
    name: "Restaurant",
    description: "Menus, promotions, événements culinaires",
    image: "/reference-templates/restaurant/favours-kitchen.jpg"
  },
  {
    icon: GraduationCap,
    name: "Formation",
    description: "Webinaires, certifications, cours en ligne",
    image: "/reference-templates/formation/formation-1.jpg"
  },
  {
    icon: Store,
    name: "E-commerce",
    description: "Promotions, soldes, nouveaux produits",
    image: "/reference-templates/ecommerce/mega-sales-event.jpg"
  },
  {
    icon: Calendar,
    name: "Événement",
    description: "Concerts, festivals, conférences",
    image: "/reference-templates/event/concert-gospel-cct.jpg"
  },
  {
    icon: Briefcase,
    name: "Service",
    description: "Offres professionnelles, portfolios",
    image: "/reference-templates/service/smart-design-flyer.jpg"
  }
];

export function DomainsSection() {
  return (
    <section id="domains" className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[150px] -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[120px] -translate-y-1/2" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Domaines</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="gradient-text">Adapté à votre secteur</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des templates et styles optimisés pour chaque domaine d'activité.
          </p>
        </div>

        {/* Domains Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {domains.map((domain, index) => (
            <div
              key={domain.name}
              className="group service-card relative rounded-3xl bg-card/40 border border-border/40 overflow-hidden cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={domain.image} 
                  alt={domain.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                
                {/* Icon badge */}
                <div className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                  <domain.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 relative">
                <h3 className="font-display text-2xl font-bold mb-2 text-foreground">
                  {domain.name}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {domain.description}
                </p>
              </div>

              {/* Hover arrow */}
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                </div>
              </div>

              {/* Decorative glow */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
