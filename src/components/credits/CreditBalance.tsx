import { motion } from "framer-motion";
import { Coins, Zap, AlertTriangle, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

interface CreditBalanceProps {
  compact?: boolean;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
}

export function CreditBalance({ compact = false, showUpgrade = true, onUpgrade }: CreditBalanceProps) {
  const { subscription, getRemainingCredits, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className={cn(
        "animate-pulse rounded-xl bg-muted/50",
        compact ? "h-8 w-24" : "h-20 w-full"
      )} />
    );
  }

  const { credits, freeRemaining, isFree } = getRemainingCredits();
  const displayCredits = isFree ? freeRemaining : credits;
  const maxCredits = isFree ? 5 : (subscription?.plan?.credits_per_month || 50);
  const percentage = Math.max(0, Math.min(100, (displayCredits / maxCredits) * 100));
  const isLow = percentage < 20;
  const planName = subscription?.plan?.name || "Gratuit";

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
          isLow
            ? "bg-destructive/10 text-destructive border border-destructive/30"
            : "bg-primary/10 text-primary border border-primary/30"
        )}
      >
        {isLow ? (
          <AlertTriangle className="w-4 h-4" />
        ) : isFree ? (
          <Zap className="w-4 h-4" />
        ) : (
          <Coins className="w-4 h-4" />
        )}
        <span>
          {displayCredits} {isFree ? "restants" : "crédits"}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isFree ? (
            <div className="p-2 rounded-lg bg-muted">
              <Zap className="w-5 h-5 text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Crown className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-foreground">{planName}</div>
            <div className="text-xs text-muted-foreground">
              {isFree ? "Plan gratuit" : "Plan actif"}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={cn(
            "text-2xl font-bold",
            isLow ? "text-destructive" : "text-primary"
          )}>
            {displayCredits}
          </div>
          <div className="text-xs text-muted-foreground">
            {isFree ? `sur 5 affiches` : `sur ${maxCredits} crédits`}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full transition-colors",
            isLow
              ? "bg-gradient-to-r from-destructive to-red-400"
              : "bg-gradient-to-r from-primary to-accent"
          )}
        />
      </div>

      {/* Low credits warning */}
      {isLow && showUpgrade && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-destructive">
                Crédits faibles
              </div>
              <div className="text-xs text-destructive/80 mt-0.5">
                {isFree
                  ? "Passez à Pro pour des crédits illimités et toutes les résolutions"
                  : "Renouvelez votre abonnement ou passez au plan supérieur"}
              </div>
            </div>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="text-xs font-medium text-primary hover:underline"
              >
                Upgrade
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Resolution info for free users */}
      {isFree && !isLow && (
        <div className="mt-3 text-xs text-muted-foreground text-center">
          Résolution 1K uniquement • Filigrane inclus
        </div>
      )}
    </motion.div>
  );
}
