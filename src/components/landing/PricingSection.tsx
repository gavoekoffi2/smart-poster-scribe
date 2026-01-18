import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Crown, Building2, Zap, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

const plans = [
  {
    name: "Essai gratuit",
    price: "0",
    currency: "FCFA",
    period: "",
    description: "Testez la plateforme avec 5 crédits offerts",
    icon: Zap,
    slug: "free",
    features: [
      "5 crédits offerts (bonus unique)",
      "Résolution 1K uniquement",
      "Filigrane inclus",
      "Accès aux templates de base",
    ],
    cta: "Tester gratuitement",
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
    slug: "pro",
    features: [
      "50 crédits par mois",
      "Toutes résolutions (1K, 2K, 4K)",
      "Sans filigrane",
      "Accès à tous les templates",
      "Support prioritaire",
    ],
    cta: "S'abonner maintenant",
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
    slug: "business",
    features: [
      "200 crédits par mois",
      "Toutes résolutions (1K, 2K, 4K)",
      "Sans filigrane",
      "Tous les templates premium",
      "Support dédié 24/7",
      "API access",
    ],
    cta: "S'abonner maintenant",
    popular: false,
    gradient: "from-accent to-primary",
  },
];

const WHATSAPP_NUMBER = "22893708178";

export function PricingSection() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = (planSlug: string) => {
    console.log("[PricingSection] Subscribe clicked for plan:", planSlug);

    // Free plan - go to app
    if (planSlug === "free") {
      navigate("/app");
      return;
    }

    // Paid plans - show modal to collect WhatsApp
    const plan = plans.find(p => p.slug === planSlug);
    if (plan) {
      setSelectedPlan(plan);
      setShowModal(true);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedPlan) return;
    
    if (!whatsappNumber.trim()) {
      toast.error("Veuillez entrer votre numéro WhatsApp");
      return;
    }

    // Clean the number (remove spaces, dashes, etc.)
    const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, "");
    
    if (cleanNumber.length < 8) {
      toast.error("Numéro WhatsApp invalide");
      return;
    }

    setIsSubmitting(true);

    // Build the WhatsApp message
    const message = `🎨 *NOUVELLE DEMANDE D'ABONNEMENT*

📋 *Plan sélectionné:* ${selectedPlan.name}
💰 *Prix:* ${selectedPlan.price} ${selectedPlan.currency}${selectedPlan.period}

✨ *Caractéristiques:*
${selectedPlan.features.map(f => `• ${f}`).join('\n')}

📱 *Numéro WhatsApp du client:* ${cleanNumber}

---
Message envoyé depuis Graphiste GPT`;

    // Encode for URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank");

    // Show success message
    toast.success(
      "Votre demande a été envoyée ! Nous allons vous contacter sur WhatsApp pour finaliser votre abonnement.",
      { duration: 6000 }
    );

    // Reset and close modal
    setWhatsappNumber("");
    setSelectedPlan(null);
    setShowModal(false);
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPlan(null);
    setWhatsappNumber("");
  };

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
                  onClick={() => handleSubscribe(plan.slug)}
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

      {/* WhatsApp Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-md bg-card rounded-3xl p-8 shadow-2xl border border-border/50"
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Finaliser votre abonnement
              </h3>
              <p className="text-muted-foreground text-sm">
                Entrez votre numéro WhatsApp pour recevoir le lien de paiement
              </p>
            </div>

            {/* Selected plan summary */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-border/50 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-foreground">{selectedPlan.name}</span>
                <span className="text-primary font-bold">
                  {selectedPlan.price} {selectedPlan.currency}{selectedPlan.period}
                </span>
              </div>
              <ul className="space-y-1">
                {selectedPlan.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3 h-3 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* WhatsApp input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Votre numéro WhatsApp
              </label>
              <Input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+228 90 00 00 00"
                className="bg-background/60 border-border/40 focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Nous vous contacterons sur ce numéro pour finaliser votre paiement
              </p>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSendWhatsApp}
              disabled={isSubmitting}
              className="w-full py-6 rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Envoyer ma demande via WhatsApp
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              En cliquant, vous serez redirigé vers WhatsApp pour confirmer votre demande
            </p>
          </motion.div>
        </div>
      )}
    </section>
  );
}
