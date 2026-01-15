import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/pricing/PlanCard";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Scene3D } from "@/components/landing/Scene3D";

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans, subscription, isProcessingPayment, initializePayment } = useSubscription();

  const handleSubscribe = async (planSlug: string) => {
    if (planSlug === "enterprise") {
      // Open email or contact form for enterprise plan
      window.location.href = "mailto:contact@graphiste-gpt.com?subject=Demande%20Plan%20Entreprise";
      return;
    }

    if (planSlug === "free") {
      // Just navigate to app for free plan
      navigate("/app");
      return;
    }

    if (!user) {
      // Redirect to auth with return URL
      toast.info("Connectez-vous pour souscrire à un abonnement");
      navigate("/auth?redirect=/pricing");
      return;
    }

    try {
      const checkoutUrl = await initializePayment(planSlug);
      if (checkoutUrl) {
        // Redirect to Moneroo checkout
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du paiement");
    }
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Génération ultra-rapide",
      description: "Créez des affiches professionnelles en moins de 30 secondes",
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Paiement Mobile Money",
      description: "Orange Money, MTN MoMo, Wave, et cartes bancaires acceptées",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Sécurisé par Moneroo",
      description: "Vos paiements sont protégés par une technologie de pointe",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden animated-gradient">
      {/* 3D Background */}
      <Scene3D />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">Graphiste GPT</span>
            </div>

            {user ? (
              <Button variant="outline" onClick={() => navigate("/account")}>
                Mon compte
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Connexion
              </Button>
            )}
          </div>
        </header>

        {/* Hero */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Choisissez votre{" "}
                <span className="gradient-text">plan</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Des tarifs adaptés à vos besoins. Commencez gratuitement et évoluez selon votre croissance.
              </p>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-10"
            >
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/60 border border-border/50"
                >
                  <div className="text-primary">{feature.icon}</div>
                  <span className="text-sm text-muted-foreground">{feature.title}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20 px-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {plans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={subscription?.plan_id === plan.id}
                  onSubscribe={handleSubscribe}
                  isLoading={isProcessingPayment}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Credit explanation */}
        <section className="py-16 px-4 bg-card/30 backdrop-blur-sm border-y border-border/50">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-3xl font-bold mb-4">
                Comment fonctionnent les <span className="gradient-text">crédits</span> ?
              </h2>
              <p className="text-muted-foreground">
                La consommation de crédits dépend de la résolution choisie
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { resolution: "1K", credits: 1, use: "Réseaux sociaux", desc: "Facebook, Instagram, WhatsApp" },
                { resolution: "2K", credits: 2, use: "HD réseaux sociaux", desc: "Stories, publications haute qualité" },
                { resolution: "4K", credits: 4, use: "Impression", desc: "Flyers, affiches, bannières print" },
              ].map((item, index) => (
                <motion.div
                  key={item.resolution}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-2xl bg-card/60 border border-border/50 text-center"
                >
                  <div className="text-4xl font-bold gradient-text mb-2">{item.resolution}</div>
                  <div className="text-lg font-semibold text-foreground mb-1">
                    {item.credits} crédit{item.credits > 1 ? "s" : ""}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{item.use}</div>
                  <div className="text-xs text-muted-foreground/70">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment methods */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold mb-6">
                Moyens de paiement acceptés
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {["Orange Money", "MTN MoMo", "Wave", "Moov Money", "Visa", "Mastercard"].map((method) => (
                  <div
                    key={method}
                    className="px-4 py-2 rounded-lg bg-card/60 border border-border/50 text-sm text-muted-foreground"
                  >
                    {method}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Paiements sécurisés par <span className="text-primary font-medium">Moneroo</span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-4 bg-card/30 backdrop-blur-sm border-t border-border/50">
          <div className="container mx-auto max-w-3xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-center mb-10"
            >
              Questions fréquentes
            </motion.h2>

            <div className="space-y-4">
              {[
                {
                  q: "Puis-je changer de plan à tout moment ?",
                  a: "Oui, vous pouvez passer à un plan supérieur à tout moment. Vos crédits restants seront conservés.",
                },
                {
                  q: "Que se passe-t-il si je n'utilise pas tous mes crédits ?",
                  a: "Les crédits non utilisés expirent à la fin de chaque période de facturation mensuelle.",
                },
                {
                  q: "Le plan gratuit est-il vraiment sans engagement ?",
                  a: "Absolument ! Créez jusqu'à 5 affiches par mois gratuitement, sans carte bancaire requise.",
                },
                {
                  q: "Comment fonctionne le filigrane sur le plan gratuit ?",
                  a: "Les affiches générées avec le plan gratuit incluent un petit logo 'Graphiste GPT' discret. Les plans payants suppriment ce filigrane.",
                },
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-2xl bg-card/60 border border-border/50"
                >
                  <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto p-8 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30"
            >
              <h2 className="text-3xl font-bold mb-4">
                Prêt à créer des affiches <span className="gradient-text">exceptionnelles</span> ?
              </h2>
              <p className="text-muted-foreground mb-6">
                Commencez gratuitement dès maintenant, aucune carte bancaire requise.
              </p>
              <Button
                size="lg"
                onClick={() => navigate(user ? "/app" : "/auth")}
                className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                Commencer gratuitement
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
