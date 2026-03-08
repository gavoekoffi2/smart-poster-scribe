import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Helmet } from "react-helmet-async";

const faqItems = [
  {
    question: "Qu'est-ce que Graphiste GPT ?",
    answer:
      "Graphiste GPT est une plateforme qui combine l'expertise de graphistes professionnels avec l'intelligence artificielle pour générer des affiches et visuels personnalisés en quelques secondes. Nos graphistes créent des templates de référence, et notre IA les adapte à vos besoins.",
  },
  {
    question: "Combien coûte la génération d'une affiche ?",
    answer:
      "Chaque affiche générée consomme 2 crédits. Les utilisateurs gratuits bénéficient de 3 générations gratuites. Ensuite, vous pouvez souscrire à un plan payant à partir de 2 500 FCFA/mois pour obtenir plus de crédits et accéder aux résolutions supérieures.",
  },
  {
    question: "Quels types de visuels puis-je créer ?",
    answer:
      "Vous pouvez créer des affiches pour des événements, des églises, des restaurants, des services, du e-commerce, des formations, de la mode, des miniatures YouTube et bien plus encore. Notre bibliothèque de templates couvre plus de 10 domaines.",
  },
  {
    question: "Puis-je utiliser mon propre logo ?",
    answer:
      "Oui ! Vous pouvez télécharger votre logo lors de la création d'une affiche. Vous pouvez également enregistrer un logo par défaut dans votre profil pour qu'il soit automatiquement proposé à chaque génération.",
  },
  {
    question: "Quelle est la résolution des images générées ?",
    answer:
      "La résolution dépend de votre plan. Le plan gratuit offre des images en 1K. Les plans payants débloquent les résolutions 2K et 4K pour des visuels adaptés à l'impression grand format.",
  },
  {
    question: "Comment devenir graphiste partenaire ?",
    answer:
      "Vous pouvez vous inscrire comme graphiste partenaire depuis la page dédiée. Une fois vérifié par notre équipe, vous pourrez soumettre vos templates et gagner des royalties à chaque utilisation par les clients.",
  },
  {
    question: "Les images générées sont-elles libres de droits ?",
    answer:
      "Oui, toutes les images générées via votre compte vous appartiennent. Vous pouvez les utiliser librement pour vos projets commerciaux et personnels sans restriction.",
  },
  {
    question: "Comment fonctionne le programme d'affiliation ?",
    answer:
      "En vous inscrivant au programme d'affiliation, vous recevez un lien de parrainage unique. Pour chaque utilisateur qui souscrit un plan payant via votre lien, vous recevez une commission de 10% sur le montant payé.",
  },
  {
    question: "Quels moyens de paiement sont acceptés ?",
    answer:
      "Nous acceptons les paiements via Mobile Money (MTN, Moov, Orange Money, Wave) et les cartes bancaires (Visa, Mastercard) grâce à notre partenaire de paiement Moneroo.",
  },
  {
    question: "Puis-je annuler mon abonnement ?",
    answer:
      "Oui, vous pouvez annuler votre abonnement à tout moment depuis votre page de compte. Vos crédits restants seront utilisables jusqu'à la fin de la période en cours.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function FAQPage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>FAQ - Graphiste GPT | Questions Fréquentes</title>
        <meta
          name="description"
          content="Trouvez les réponses à vos questions sur Graphiste GPT : tarifs, fonctionnalités, programme d'affiliation, graphistes partenaires et plus encore."
        />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar onGetStarted={() => navigate("/auth")} />

        <main className="container mx-auto max-w-4xl px-4 py-24">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Questions <span className="gradient-text">Fréquentes</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tout ce que vous devez savoir sur Graphiste GPT
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card/50 border border-border/50 rounded-xl px-6 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </main>

        <Footer />
      </div>
    </>
  );
}
