import { motion } from "framer-motion";
import { Link2, Copy, Users, DollarSign, TrendingUp, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAffiliate } from "@/hooks/useAffiliate";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function AffiliateTab() {
  const {
    affiliate,
    commissions,
    isLoading,
    activateAffiliate,
    getReferralLink,
    copyReferralLink,
  } = useAffiliate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Not yet an affiliate — show activation CTA
  if (!affiliate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 text-center"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
          <Gift className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Programme d'affiliation
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Recommandez Graphiste GPT et gagnez <strong className="text-primary">10% de commission</strong> sur chaque abonnement de vos filleuls. Les commissions sont récurrentes à chaque renouvellement.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <Link2 className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">1. Partagez</p>
            <p className="text-xs text-muted-foreground">votre lien unique</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <Users className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">2. Ils s'abonnent</p>
            <p className="text-xs text-muted-foreground">via votre lien</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">3. Vous gagnez</p>
            <p className="text-xs text-muted-foreground">10% à vie</p>
          </div>
        </div>
        <Button
          onClick={activateAffiliate}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
          size="lg"
        >
          <Gift className="w-5 h-5 mr-2" />
          Activer mon programme d'affiliation
        </Button>
      </motion.div>
    );
  }

  // Active affiliate — show dashboard
  const referralLink = getReferralLink();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Filleuls</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{affiliate.total_referrals}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">Gains totaux</span>
          </div>
          <p className="text-3xl font-bold text-foreground">${Number(affiliate.total_earnings).toFixed(2)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm text-muted-foreground">Commission</span>
          </div>
          <p className="text-3xl font-bold text-foreground">10%</p>
          <p className="text-xs text-muted-foreground">récurrente</p>
        </motion.div>
      </div>

      {/* Referral Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-primary" />
          Votre lien de parrainage
        </h3>
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="bg-muted/50 font-mono text-sm"
          />
          <Button onClick={copyReferralLink} variant="outline" className="gap-2 shrink-0">
            <Copy className="w-4 h-4" />
            Copier
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Partagez ce lien sur vos réseaux sociaux, WhatsApp, ou par email. Toute personne qui s'inscrit et s'abonne via ce lien vous rapporte 10% de commission.
        </p>
      </motion.div>

      {/* Commissions History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          Historique des commissions
        </h3>

        {commissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune commission pour le moment</p>
            <p className="text-sm mt-1">Partagez votre lien pour commencer à gagner !</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {commissions.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    c.status === "paid" ? "bg-green-500" : "bg-yellow-500"
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Commission ({(c.commission_rate * 100).toFixed(0)}%)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.status === "paid"
                      ? "bg-green-500/10 text-green-500"
                      : "bg-yellow-500/10 text-yellow-500"
                  }`}>
                    {c.status === "paid" ? "Payé" : "En attente"}
                  </span>
                  <span className="text-sm font-semibold text-green-500">
                    +${Number(c.amount).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
