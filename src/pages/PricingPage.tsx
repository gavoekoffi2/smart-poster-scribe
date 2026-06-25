import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/pricing/PlanCard";
import { SubscriptionRequestModal } from "@/components/pricing/SubscriptionRequestModal";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
const Scene3D = lazy(() => import("@/components/landing/Scene3D").then(m => ({ default: m.Scene3D })));

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { plans, subscription, isProcessingPayment, openGeniusPayCheckout } = useSubscription();
  const [requestModal, setRequestModal] = useState<{ open: boolean; planName: string; planSlug: string; planPrice: string }>({
    open: false, planName: "", planSlug: "", planPrice: ""
  });

  const [hasOpenedRequestedPlan, setHasOpenedRequestedPlan] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  const openSubscriptionModal = useCallback((planSlug: string) => {
    const plan = plans.find(p => p.slug === planSlug);
    if (!plan) {
      toast.error("Plan introuvable. Veuillez choisir un abonnement.");
      return;
    }

    setRequestModal({
      open: true,
      planName: plan.name,
      planSlug,
      planPrice: `${plan.price_fcfa.toLocaleString("fr-FR")} FCFA / mois`,
    });
  }, [plans]);

  useEffect(() => {
    if (authLoading || user) return;

    const shouldAutoSubscribe = searchParams.get("subscribe") === "1";
    const requestedPlan = searchParams.get("plan") || sessionStorage.getItem("pendingSubscriptionPlan");

    if (!shouldAutoSubscribe || !requestedPlan || requestedPlan === "free") return;

    const params = new URLSearchParams({ plan: requestedPlan, subscribe: "1" });
    const promo = searchParams.get("promo");
    if (promo) params.set("promo", promo);

    const redirectTo = `/pricing?${params.toString()}`;
    sessionStorage.setItem("pendingSubscriptionPlan", requestedPlan);
    navigate(`/auth?redirect=${encodeURIComponent(redirectTo)}`, { state: { redirectTo }, replace: true });
  }, [authLoading, navigate, searchParams, user]);

  const buildCheckoutRedirect = useCallback((planSlug: string) => {
    const params = new URLSearchParams({ plan: planSlug, subscribe: "1" });
    const promo = searchParams.get("promo");
    if (promo) params.set("promo", promo);
    return `/pricing?${params.toString()}`;
  }, [searchParams]);

  const startCheckout = useCallback(async (planSlug: string) => {
    if (planSlug === "free") {
      if (authLoading) return;
      navigate(user ? "/app" : "/auth?redirect=/app", { state: { redirectTo: "/app" } });
      return;
    }

    if (authLoading || isStartingCheckout || isProcessingPayment) {
      if (authLoading) toast.info("Connexion en cours de vérification, réessayez dans un instant.");
      return;
    }

    if (!user) {
      const redirectTo = buildCheckoutRedirect(planSlug);
      sessionStorage.setItem("pendingSubscriptionPlan", planSlug);
      sessionStorage.setItem("authRedirectTo", redirectTo);
      toast.info("Connectez-vous pour finaliser votre abonnement");
      navigate(`/auth?redirect=${encodeURIComponent(redirectTo)}`, { state: { redirectTo } });
      return;
    }

    setIsStartingCheckout(true);
    sessionStorage.setItem("pendingSubscriptionPlan", planSlug);
    try {
      await openGeniusPayCheckout(planSlug);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Impossible d'ouvrir le paiement");
      openSubscriptionModal(planSlug);
    } finally {
      setIsStartingCheckout(false);
    }
  }, [authLoading, buildCheckoutRedirect, isProcessingPayment, isStartingCheckout, navigate, openGeniusPayCheckout, openSubscriptionModal, user]);

  useEffect(() => {
    if (authLoading || !user || hasOpenedRequestedPlan) return;

    const shouldAutoSubscribe = searchParams.get("subscribe") === "1";
    const requestedPlan = searchParams.get("plan") || sessionStorage.getItem("pendingSubscriptionPlan");

    if (!shouldAutoSubscribe || !requestedPlan || requestedPlan === "free") return;

    setHasOpenedRequestedPlan(true);
    startCheckout(requestedPlan);
    sessionStorage.removeItem("pendingSubscriptionPlan");
  }, [authLoading, hasOpenedRequestedPlan, searchParams, startCheckout, user]);

  const handleSubscribe = (planSlug: string) => {
    startCheckout(planSlug);
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
      title: "Activation manuelle",
      description: "Nous vérifions et activons votre compte après paiement",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden animated-gradient">
      {/* 3D Background */}
      <Suspense fallback={null}><Scene3D /></Suspense>

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

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/docs/api")} className="hidden sm:inline-flex">
                API
              </Button>
              {user ? (
                <Button variant="outline" size="sm" onClick={() => navigate("/account")}>
                  Mon compte
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                  Connexion
                </Button>
              )}
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={subscription?.plan_id === plan.id}
                  onSubscribe={handleSubscribe}
                  isLoading={isProcessingPayment || isStartingCheckout}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4 bg-card/30 backdrop-blur-sm border-y border-border/50">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-bold mb-6">Comment ça marche ?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: "1", title: "Choisissez un plan", desc: "Sélectionnez le plan qui correspond à vos besoins" },
                { step: "2", title: "Envoyez le formulaire", desc: "Remplissez votre nom et numéro de téléphone" },
                { step: "3", title: "Activation", desc: "Nous vérifions et activons votre compte après paiement" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="p-6 rounded-2xl bg-card/60 border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center mx-auto mb-3">{item.step}</div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-card/30 backdrop-blur-sm border-y border-border/50">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-3xl font-bold mb-4">
                Comment fonctionnent les <span className="gradient-text">affiches</span> ?
              </h2>
              <p className="text-muted-foreground">
                Choisissez votre modèle : <span className="text-primary font-medium">Rapide (NanoBanana Pro)</span> pour des résultats instantanés, ou <span className="text-primary font-medium">Pro (GPT Image 2)</span> pour la qualité maximale.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { plan: "Essai", credits: "3 affiches", posters: "Pour découvrir", desc: "Aucune carte requise" },
                { plan: "Essentiel", credits: "20 affiches", posters: "5 000 FCFA/mois", desc: "Tous modèles, tous domaines" },
                { plan: "Illimité", credits: "∞ illimité", posters: "25 000 FCFA/mois", desc: "Qualité Pro + Templates premium" },
              ].map((item, index) => (
                <motion.div
                  key={item.plan}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-2xl bg-card/60 border border-border/50 text-center"
                >
                  <div className="text-2xl font-bold gradient-text mb-2">{item.plan}</div>
                  <div className="text-lg font-semibold text-foreground mb-1">
                    {item.credits} • {item.posters}
                  </div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </motion.div>
              ))}
            </div>
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
                  a: "Absolument ! Vous recevez 5 crédits d'essai (≈ 2 affiches), sans carte bancaire requise.",
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

      <SubscriptionRequestModal
        open={requestModal.open}
        onOpenChange={(open) => setRequestModal(prev => ({ ...prev, open }))}
        planName={requestModal.planName}
        planSlug={requestModal.planSlug}
        planPrice={requestModal.planPrice}
      />
    </div>
  );
}
