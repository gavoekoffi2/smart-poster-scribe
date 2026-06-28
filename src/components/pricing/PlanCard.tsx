import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Infinity as InfinityIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/hooks/useSubscription";

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSubscribe: (planSlug: string) => void;
  isLoading: boolean;
  index: number;
  discountRate?: number;
}

const planIcons: Record<string, React.ReactNode> = {
  free: <Zap className="w-6 h-6" />,
  essentiel: <Sparkles className="w-6 h-6" />,
  illimite: <Crown className="w-6 h-6" />,
};

const planColors: Record<string, string> = {
  free: "from-muted to-muted/50",
  essentiel: "from-primary to-accent",
  illimite: "from-amber-500 to-orange-600",
};

export function PlanCard({ plan, isCurrentPlan, onSubscribe, isLoading, index }: PlanCardProps) {
  const isFree = plan.slug === "free";
  const isUnlimited = plan.credits_per_month >= 9999;

  const formatPrice = () => {
    if (isFree) {
      return { main: "Gratuit", sub: "Pour commencer" };
    }
    return {
      main: `${plan.price_fcfa.toLocaleString("fr-FR")} FCFA/mois`,
      sub: `(≈ $${plan.price_usd})`,
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
          {isFree ? (
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Affiches offertes</span>
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                3 affiches gratuites • Modifications illimitées
              </div>
            </div>
          ) : isUnlimited ? (
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Affiches / mois</span>
                <span className="text-xl font-bold text-primary flex items-center gap-1">
                  <InfinityIcon className="w-5 h-5" /> Illimité
                </span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Générations illimitées • Modifications gratuites
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Affiches / mois</span>
                <span className="text-xl font-bold text-primary">
                  {Math.floor(plan.credits_per_month / 2)}
                </span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Modifications illimitées incluses
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
                  : isUnlimited
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
                Souscrire
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
