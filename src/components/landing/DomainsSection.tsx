import { Church, UtensilsCrossed, GraduationCap, Store, Calendar, Briefcase, Sparkles } from "lucide-react";

const domains = [
  {
    icon: Church,
    name: "Église",
    description: "Affiches de culte, concerts gospel, retraites spirituelles",
    color: "from-amber-400 to-orange-500"
  },
  {
    icon: UtensilsCrossed,
    name: "Restaurant",
    description: "Menus, promotions, événements culinaires",
    color: "from-red-400 to-rose-500"
  },
  {
    icon: GraduationCap,
    name: "Formation",
    description: "Webinaires, certifications, cours en ligne",
    color: "from-blue-400 to-indigo-500"
  },
  {
    icon: Store,
    name: "E-commerce",
    description: "Promotions, soldes, nouveaux produits",
    color: "from-emerald-400 to-teal-500"
  },
  {
    icon: Calendar,
    name: "Événement",
    description: "Concerts, festivals, conférences",
    color: "from-purple-400 to-violet-500"
  },
  {
    icon: Briefcase,
    name: "Service",
    description: "Offres professionnelles, portfolios",
    color: "from-cyan-400 to-blue-500"
  }
];

export function DomainsSection() {
  return (
    <section id="domains" className="py-24 px-4 relative bg-gradient-to-b from-transparent via-primary/5 to-transparent">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Domaines</span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Adapté à votre secteur</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Des templates et styles optimisés pour chaque domaine d'activité.
          </p>
        </div>

        {/* Domains Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {domains.map((domain, index) => (
            <div
              key={domain.name}
              className="group relative p-8 rounded-3xl bg-card/40 border border-border/40 hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${domain.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${domain.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <domain.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="font-display text-2xl font-bold mb-3 text-foreground">
                {domain.name}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {domain.description}
              </p>

              {/* Decorative element */}
              <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br ${domain.color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
