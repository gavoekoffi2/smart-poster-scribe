import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Building2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/hooks/useSubscription";

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSubscribe: (planSlug: string) => void;
  isLoading: boolean;
  index: number;
}

const planIcons: Record<string, React.ReactNode> = {
  free: <Zap className="w-6 h-6" />,
  pro: <Sparkles className="w-6 h-6" />,
  business: <Crown className="w-6 h-6" />,
};

const planColors: Record<string, string> = {
  free: "from-muted to-muted/50",
  pro: "from-primary to-accent",
  business: "from-amber-500 to-orange-600",
};

const BASE_BUSINESS_POSTERS = 12;
const BASE_BUSINESS_PRICE_USD = 17;
const BASE_BUSINESS_PRICE_FCFA = 9900;
const PRICE_PER_POSTER_USD = BASE_BUSINESS_PRICE_USD / BASE_BUSINESS_POSTERS;
const PRICE_PER_POSTER_FCFA = BASE_BUSINESS_PRICE_FCFA / BASE_BUSINESS_POSTERS;
const MAX_POSTERS = 50;

export function PlanCard({ plan, isCurrentPlan, onSubscribe, isLoading, index }: PlanCardProps) {
  const isFree = plan.slug === "free";
  const isBusiness = plan.slug === "business";
  const [businessPosters, setBusinessPosters] = useState(BASE_BUSINESS_POSTERS);

  const businessPriceUSD = Math.round(businessPosters * PRICE_PER_POSTER_USD);
  const businessPriceFCFA = Math.round(businessPosters * PRICE_PER_POSTER_FCFA);
  const businessCredits = businessPosters * 2;

  const formatPrice = () => {
    if (isFree) {
      return { main: "Gratuit", sub: "Pour commencer" };
    }
    if (isBusiness) {
      return {
        main: `$${businessPriceUSD}/mois`,
        sub: `(≈ ${businessPriceFCFA.toLocaleString("fr-FR")} FCFA)`,
      };
    }
    return {
      main: `$${plan.price_usd}/mois`,
      sub: `(≈ ${plan.price_fcfa.toLocaleString("fr-FR")} FCFA)`,
    };
  };

  const price = formatPrice();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={cn(
        "relative group",
        plan.is_popular && "lg:-mt-4 lg:mb-4"
      )}
    >
      {plan.is_popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="px-4 py-1.5 bg-gradient-to-r from-primary to-accent rounded-full text-sm font-semibold text-primary-foreground shadow-lg"
          >
            ⭐ Plus populaire
          </motion.div>
        </div>
      )}

      <div
        className={cn(
          "relative h-full rounded-3xl overflow-hidden transition-all duration-500",
          "bg-card/80 backdrop-blur-xl border border-border/50",
          plan.is_popular && "border-primary/50 shadow-2xl shadow-primary/20",
          "hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
          "group-hover:-translate-y-2"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
            `bg-gradient-to-br ${planColors[plan.slug] || planColors.pro}`
          )}
        />

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute top-10 right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-pulse delay-300" />
        </div>

        <div className="relative z-10 p-8 flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <div
              className={cn(
                "inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4",
                `bg-gradient-to-br ${planColors[plan.slug] || planColors.pro}`,
                "text-white shadow-lg"
              )}
            >
              {planIcons[plan.slug] || planIcons.pro}
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
            <p className="text-muted-foreground text-sm">{plan.description}</p>
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="text-3xl font-bold text-foreground">{price.main}</div>
            <div className="text-sm text-muted-foreground">{price.sub}</div>
          </div>

          {/* Credits info */}
          {isBusiness ? (
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Nombre d'affiches</span>
                <span className="text-xl font-bold text-primary">{businessPosters}</span>
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
                <span>12</span>
                <span>{MAX_POSTERS}</span>
              </div>
              <div className="mt-2 text-xs text-center text-muted-foreground">
                {businessCredits} crédits • 1 affiche = 2 crédits
              </div>
            </div>
          ) : !isFree ? (
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Crédits</span>
                <span className="text-xl font-bold text-primary">{plan.credits_per_month}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                1 affiche = 2 crédits ≈ {Math.floor(plan.credits_per_month / 2)} affiches
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Crédits offerts</span>
                <span className="text-xl font-bold text-primary">5</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                1 affiche = 2 crédits ≈ 2 affiches (bonus unique)
              </div>
            </div>
          )}

          {/* Features */}
          <ul className="space-y-3 mb-8 flex-1">
            {plan.features.map((feature, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                viewport={{ once: true }}
                className="flex items-start gap-3"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-foreground/80">{feature}</span>
              </motion.li>
            ))}
          </ul>

          {/* CTA Button */}
          <Button
            onClick={() => onSubscribe(plan.slug)}
            disabled={isLoading || isCurrentPlan}
            className={cn(
              "w-full h-12 text-base font-semibold rounded-xl transition-all duration-300",
              plan.is_popular
                ? "bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30"
                : isFree
                  ? "bg-muted hover:bg-muted/80 text-foreground"
                  : isBusiness
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
                    : "bg-card border border-primary/50 text-primary hover:bg-primary/10"
            )}
          >
            {isCurrentPlan ? (
              "Plan actuel"
            ) : isFree ? (
              "Tester gratuitement"
            ) : (
              <>
                Acheter maintenant
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
