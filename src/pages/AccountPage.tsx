import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Crown, History, CreditCard, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditBalance } from "@/components/credits/CreditBalance";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const { subscription, transactions, refreshSubscription } = useSubscription();

  // Handle payment success redirect
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast.success("Paiement réussi ! Votre abonnement est maintenant actif.");
      refreshSubscription();
      // Clean URL
      window.history.replaceState({}, "", "/account");
    }
  }, [searchParams, refreshSubscription]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth?redirect=/account");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const planName = subscription?.plan?.name || "Gratuit";
  const periodEnd = subscription?.current_period_end
    ? format(new Date(subscription.current_period_end), "d MMMM yyyy", { locale: fr })
    : null;

  const transactionTypeLabels: Record<string, string> = {
    subscription_renewal: "Renouvellement",
    purchase: "Achat",
    generation: "Génération",
    refund: "Remboursement",
    bonus: "Bonus",
    free_generation: "Génération gratuite",
  };

  return (
    <div className="min-h-screen bg-background animated-gradient">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/app")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'app
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Mon compte</span>
          </div>

          <Button variant="ghost" onClick={handleSignOut} className="gap-2 text-destructive">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* User info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            Bonjour 👋
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Credits & Subscription */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credit balance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CreditBalance onUpgrade={() => navigate("/pricing")} />
            </motion.div>

            {/* Current subscription */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Abonnement actuel
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/pricing")}
                >
                  Changer de plan
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-foreground">{planName}</div>
                    {periodEnd && (
                      <div className="text-sm text-muted-foreground">
                        Prochain renouvellement: {periodEnd}
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscription?.status === "active"
                      ? "bg-green-500/10 text-green-500 border border-green-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}>
                    {subscription?.status === "active" ? "Actif" : "Inactif"}
                  </div>
                </div>
              </div>

              {subscription?.plan?.slug === "free" && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground">Passez à Pro</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Débloquez toutes les résolutions, supprimez le filigrane et obtenez 50 crédits par mois.
                      </div>
                      <Button
                        size="sm"
                        className="mt-3 bg-gradient-to-r from-primary to-accent"
                        onClick={() => navigate("/pricing")}
                      >
                        Voir les plans
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Transaction history */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" />
                Historique des crédits
              </h2>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune transaction pour le moment
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          tx.amount > 0 ? "bg-green-500" : "bg-primary"
                        }`} />
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {transactionTypeLabels[tx.type] || tx.type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(tx.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                            {tx.resolution_used && ` • ${tx.resolution_used}`}
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        tx.amount > 0 ? "text-green-500" : "text-foreground"
                      }`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right column - Quick actions */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
            >
              <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate("/app")}
                >
                  <Sparkles className="w-4 h-4" />
                  Créer une affiche
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate("/pricing")}
                >
                  <CreditCard className="w-4 h-4" />
                  Acheter des crédits
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Settings className="w-4 h-4" />
                  Paramètres
                  <span className="ml-auto text-xs text-muted-foreground">Bientôt</span>
                </Button>
              </div>
            </motion.div>

            {/* Support */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
            >
              <h2 className="text-lg font-semibold mb-2">Besoin d'aide ?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Notre équipe est disponible pour répondre à vos questions.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = "mailto:support@graphiste-gpt.com"}
              >
                Contacter le support
              </Button>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
