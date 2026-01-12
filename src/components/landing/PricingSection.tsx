import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Building2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Gratuit",
    price: "0",
    currency: "FCFA",
    period: "/mois",
    description: "Parfait pour découvrir la plateforme",
    icon: Zap,
    features: [
      "5 affiches par mois",
      "Résolution 1K uniquement",
      "Filigrane inclus",
      "Accès aux templates de base",
    ],
    cta: "Commencer gratuitement",
    popular: false,
    gradient: "from-muted to-muted/50",
  },
  {
    name: "Pro",
    price: "9 900",
    currency: "FCFA",
    period: "/mois",
    description: "Pour les professionnels et créateurs",
    icon: Crown,
    features: [
      "50 crédits par mois",
      "Toutes résolutions (1K, 2K, 4K)",
      "Sans filigrane",
      "Accès à tous les templates",
      "Support prioritaire",
    ],
    cta: "Passer à Pro",
    popular: true,
    gradient: "from-primary to-accent",
  },
  {
    name: "Business",
    price: "29 900",
    currency: "FCFA",
    period: "/mois",
    description: "Pour les équipes et agences",
    icon: Building2,
    features: [
      "200 crédits par mois",
      "Toutes résolutions (1K, 2K, 4K)",
      "Sans filigrane",
      "Tous les templates premium",
      "Support dédié 24/7",
      "API access",
    ],
    cta: "Contacter l'équipe",
    popular: false,
    gradient: "from-accent to-primary",
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Tarifs</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
          >
            <span className="text-foreground">Des tarifs </span>
            <span className="gradient-text">transparents</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Choisissez le plan adapté à vos besoins. Commencez gratuitement et évoluez selon votre croissance.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-3xl p-8 ${
                  plan.popular
                    ? "bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/50 shadow-2xl shadow-primary/20 scale-105"
                    : "bg-card/60 backdrop-blur-sm border border-border/50"
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold shadow-lg">
                    Le plus populaire
                  </div>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Plan name */}
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.currency}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={() => navigate("/pricing")}
                  className={`w-full py-6 rounded-full font-semibold ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground glow-orange"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Credit info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-6 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/50 text-center"
        >
          <h4 className="font-semibold text-foreground mb-2">Consommation des crédits</h4>
          <p className="text-muted-foreground text-sm">
            <span className="text-primary font-medium">1 crédit</span> pour 1K • 
            <span className="text-primary font-medium ml-2">2 crédits</span> pour 2K • 
            <span className="text-primary font-medium ml-2">4 crédits</span> pour 4K
          </p>
        </motion.div>
      </div>
    </section>
  );
}
