import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Zap, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

const planIcons: Record<string, typeof Zap> = {
  free: Zap,
  essentiel: Sparkles,
  illimite: Crown,
};

const planGradients: Record<string, string> = {
  free: "from-muted to-muted/50",
  essentiel: "from-primary to-accent",
  illimite: "from-amber-500 to-orange-600",
};

export function PricingSection() {
  const navigate = useNavigate();
  const { plans, isLoading } = useSubscription();

  const handleSubscribe = (planSlug: string) => {
    if (planSlug === "free") {
      navigate("/auth?redirect=/app", { state: { redirectTo: "/app" } });
      return;
    }
    const params = new URLSearchParams({ plan: planSlug, subscribe: "1" });
    navigate(`/pricing?${params.toString()}`);
  };

  // Order: free, essentiel, illimite
  const ordered = [...plans].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section id="pricing" className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" />

      <div className="container mx-auto max-w-6xl relative z-10">
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

        {isLoading && ordered.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[500px] rounded-3xl bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {ordered.map((plan, index) => {
              const Icon = planIcons[plan.slug] || Sparkles;
              const gradient = planGradients[plan.slug] || "from-primary to-accent";
              const isFree = plan.slug === "free";
              const isUnlimited = plan.credits_per_month >= 9999;
              const postersCount = isUnlimited ? null : Math.floor(plan.credits_per_month / 2);

              const priceMain = isFree
                ? "$0"
                : `$${plan.price_usd}`;
              const priceSub = isFree
                ? "(0 FCFA)"
                : `(≈ ${plan.price_fcfa.toLocaleString("fr-FR")} FCFA)`;
              const period = isFree ? "" : "/mois";

              const cta = isFree
                ? "Tester gratuitement"
                : isUnlimited
                  ? "Passer à l'Illimité"
                  : "Souscrire maintenant";

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-3xl p-8 ${
                    plan.is_popular
                      ? "bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/50 shadow-2xl shadow-primary/20 lg:scale-105"
                      : "bg-card/60 backdrop-blur-sm border border-border/50"
                  }`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold shadow-lg">
                      Le plus populaire
                    </div>
                  )}

                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>
                  )}

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">{priceMain}</span>
                      <span className="text-muted-foreground">{period}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{priceSub}</span>
                  </div>

                  {/* Quota highlight */}
                  <div className="mb-6 p-3 rounded-xl bg-muted/50 border border-border/50 text-center">
                    {isUnlimited ? (
                      <div className="flex items-center justify-center gap-2 text-primary font-bold text-lg">
                        <InfinityIcon className="w-5 h-5" /> Affiches illimitées
                      </div>
                    ) : isFree ? (
                      <div className="text-sm text-foreground">
                        <span className="font-bold text-primary">≈ 3 affiches</span>{" "}
                        <span className="text-muted-foreground">(bonus unique)</span>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground">
                        <span className="font-bold text-primary">{postersCount} affiches</span>{" "}
                        <span className="text-muted-foreground">/ mois</span>
                      </div>
                    )}
                  </div>

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

                  <Button
                    onClick={() => handleSubscribe(plan.slug)}
                    className={`w-full py-6 rounded-full font-semibold ${
                      plan.is_popular
                        ? "bg-gradient-to-r from-primary to-accent text-primary-foreground glow-orange"
                        : isFree
                          ? "bg-muted hover:bg-muted/80 text-foreground"
                          : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
                    }`}
                  >
                    {cta}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 p-6 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/50 text-center"
        >
          <h4 className="font-semibold text-foreground mb-2">Consommation des crédits</h4>
          <p className="text-muted-foreground text-sm">
            <span className="text-primary font-medium">1 affiche = 2 crédits</span>, quelle que soit la résolution choisie. Les modifications sont toujours gratuites.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
