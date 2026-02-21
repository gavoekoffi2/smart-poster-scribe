import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Building2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

const BASE_BUSINESS_POSTERS = 12;
const BASE_BUSINESS_PRICE_USD = 17;
const BASE_BUSINESS_PRICE_FCFA = 9900;
const PRICE_PER_POSTER_USD = BASE_BUSINESS_PRICE_USD / BASE_BUSINESS_POSTERS;
const PRICE_PER_POSTER_FCFA = BASE_BUSINESS_PRICE_FCFA / BASE_BUSINESS_POSTERS;
const MAX_POSTERS = 50;

export function PricingSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isProcessingPayment, openFedaPayCheckout } = useSubscription();
  const [businessPosters, setBusinessPosters] = useState(BASE_BUSINESS_POSTERS);

  const businessPriceUSD = Math.round(businessPosters * PRICE_PER_POSTER_USD);
  const businessPriceFCFA = Math.round(businessPosters * PRICE_PER_POSTER_FCFA);
  const businessCredits = businessPosters * 2;

  const handleSubscribe = async (planSlug: string) => {
    if (planSlug === "free") {
      navigate("/auth");
      return;
    }

    if (!user) {
      toast.info("Veuillez vous connecter pour souscrire à un abonnement.");
      navigate("/auth");
      return;
    }

    try {
      toast.loading("Ouverture du paiement...", { id: "payment-init" });
      await openFedaPayCheckout(planSlug);
      toast.dismiss("payment-init");
    } catch (err) {
      toast.dismiss("payment-init");
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'initialisation du paiement");
    }
  };

  const plans = [
    {
      name: "Essai gratuit",
      price: "$0",
      priceSub: "(0 FCFA)",
      period: "",
      description: "Testez la création d'affiches",
      icon: Zap,
      slug: "free",
      features: [
        "5 crédits offerts (bonus unique)",
        "1 affiche = 2 crédits ≈ 2 affiches",
        "Résolution 1K uniquement",
        "Filigrane inclus",
        "Accès aux templates de base",
      ],
      cta: "Tester gratuitement",
      popular: false,
      gradient: "from-muted to-muted/50",
    },
    {
      name: "Populaire",
      price: "$7",
      priceSub: "(≈ 3 900 FCFA)",
      period: "/mois",
      description: "Pour les créateurs d'affiches",
      icon: Crown,
      slug: "pro",
      features: [
        "10 crédits",
        "1 affiche = 2 crédits ≈ 5 affiches",
        "Toutes les résolutions (1K, 2K, 4K)",
        "Sans filigrane",
        "Accès à tous les templates",
        "Téléchargement immédiat",
      ],
      cta: "Acheter maintenant",
      popular: true,
      gradient: "from-primary to-accent",
    },
  ];

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
          {/* Free & Popular plans */}
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
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold shadow-lg">
                    Le plus populaire
                  </div>
                )}

                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{plan.priceSub}</span>
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
                  disabled={isProcessingPayment}
                  className={`w-full py-6 rounded-full font-semibold ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground glow-orange"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {isProcessingPayment ? "Chargement..." : plan.cta}
                </Button>
              </motion.div>
            );
          })}

          {/* Business plan with slider */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative rounded-3xl p-8 bg-card/60 backdrop-blur-sm border border-border/50"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-6">
              <Building2 className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-2">Business</h3>
            <p className="text-muted-foreground text-sm mb-6">Pour les équipes et agences</p>

            {/* Dynamic price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">${businessPriceUSD}</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <span className="text-sm text-muted-foreground">(≈ {businessPriceFCFA.toLocaleString("fr-FR")} FCFA)</span>
            </div>

            {/* Poster slider */}
            <div className="mb-6 p-4 rounded-2xl bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Nombre d'affiches</span>
                <span className="text-2xl font-bold text-primary">{businessPosters}</span>
              </div>
              <Slider
                value={[businessPosters]}
                onValueChange={(v) => setBusinessPosters(v[0])}
                min={12}
                max={MAX_POSTERS}
                step={1}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>12 affiches</span>
                <span>{MAX_POSTERS} affiches</span>
              </div>
              <div className="mt-2 text-xs text-center text-muted-foreground">
                {businessCredits} crédits • 1 affiche = 2 crédits
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                `${businessCredits} crédits (≈ ${businessPosters} affiches)`,
                "Toutes les résolutions (1K, 2K, 4K)",
                "Sans filigrane",
                "Templates premium",
                "Support prioritaire",
                "Accès API (si applicable)",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleSubscribe("business")}
              disabled={isProcessingPayment}
              className="w-full py-6 rounded-full font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
            >
              {isProcessingPayment ? "Chargement..." : "Acheter maintenant"}
            </Button>
          </motion.div>
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
            <span className="text-primary font-medium">1 affiche = 2 crédits</span>, quelle que soit la résolution choisie
          </p>
        </motion.div>
      </div>
    </section>
  );
}
