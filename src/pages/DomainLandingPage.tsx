import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Check, ArrowRight } from "lucide-react";

type DomainContent = {
  slug: string;
  title: string;
  h1: string;
  intro: string;
  description: string;
  benefits: string[];
  examples: string[];
};

const DOMAINS: Record<string, DomainContent> = {
  eglise: {
    slug: "eglise",
    title: "Affiches d'église IA — Créez des visuels chrétiens en 1 minute",
    h1: "Affiches pour église créées par IA",
    intro: "Générez des affiches professionnelles pour vos cultes, conventions et événements chrétiens.",
    description: "Graphiste GPT crée des affiches d'église modernes, inspirantes et fidèles à votre identité. Plus besoin de graphiste : décrivez votre événement, l'IA s'occupe du reste.",
    benefits: ["Templates chrétiens validés", "Personnages photoréalistes africains", "Textes bibliques préservés sans déformation", "Export HD pour impression et réseaux"],
    examples: ["Affiche dimanche", "Convention pastorale", "Veillée de prière", "Concert gospel", "Conférence chrétienne"],
  },
  mariage: {
    slug: "mariage",
    title: "Faire-part et affiches de mariage IA",
    h1: "Affiches de mariage personnalisées par IA",
    intro: "Créez des faire-part et affiches élégantes pour votre grand jour.",
    description: "Mariage civil, religieux, réception : générez des visuels romantiques et raffinés en quelques secondes.",
    benefits: ["Styles élégants et modernes", "Photos des mariés intégrées", "Couleurs personnalisables", "Formats imprimables"],
    examples: ["Faire-part", "Affiche cérémonie", "Plan de table", "Menu de réception"],
  },
  restaurant: {
    slug: "restaurant",
    title: "Menus et affiches restaurant IA",
    h1: "Affiches & menus restaurant créés par IA",
    intro: "Promotions, menus du jour, ouverture : créez tous vos visuels en quelques secondes.",
    description: "Mettez en avant vos plats avec des visuels gourmands, professionnels et adaptés aux réseaux sociaux.",
    benefits: ["Visuels gourmands", "Adaptés Instagram/Facebook", "Prix mis en valeur", "Multilangue"],
    examples: ["Menu du jour", "Happy hour", "Ouverture", "Nouvelle carte"],
  },
  ecommerce: {
    slug: "ecommerce",
    title: "Visuels e-commerce et publicités produit IA",
    h1: "Affiches publicitaires e-commerce par IA",
    intro: "Boostez vos ventes avec des visuels produits convertissants.",
    description: "Promotions flash, soldes, lancements : générez des bannières et posts professionnels prêts à publier.",
    benefits: ["Conversions optimisées", "Tailles réseaux + bannières", "Mise en avant produit", "Codes promo intégrés"],
    examples: ["Black Friday", "Soldes", "Lancement produit", "Code promo"],
  },
  youtube: {
    slug: "youtube",
    title: "Miniatures YouTube IA haute conversion",
    h1: "Miniatures YouTube générées par IA",
    intro: "Augmentez votre CTR avec des miniatures pensées pour cliquer.",
    description: "Format 16:9, couleurs saturées, expression forte : nos miniatures sont optimisées pour l'algorithme YouTube.",
    benefits: ["Format 16:9 natif", "Hyper-saturation", "Expressions dynamiques", "Texte ultra lisible"],
    examples: ["Vlog", "Tutoriel", "Réaction", "Interview", "Gaming"],
  },
  evenement: {
    slug: "evenement",
    title: "Affiches d'événement professionnel IA",
    h1: "Affiches d'événement créées par IA",
    intro: "Concerts, conférences, festivals : créez vos affiches en quelques minutes.",
    description: "Couvrez tous vos besoins événementiels avec une qualité graphiste pro.",
    benefits: ["Multi-formats", "Sponsors intégrés", "QR code billetterie", "Print et web"],
    examples: ["Conférence", "Concert", "Festival", "Séminaire", "Atelier"],
  },
  immobilier: {
    slug: "immobilier",
    title: "Affiches immobilier IA (vente, location)",
    h1: "Affiches immobilier IA",
    intro: "Mettez en valeur vos biens avec des visuels percutants.",
    description: "Photos de biens, infos clés, branding agence : générez des annonces qui se distinguent.",
    benefits: ["Photos optimisées", "Infos lisibles", "Branding agence", "Formats portes ouvertes"],
    examples: ["Vente", "Location", "Portes ouvertes", "Nouveau bien"],
  },
  formation: {
    slug: "formation",
    title: "Affiches de formation et webinaires IA",
    h1: "Affiches formation par IA",
    intro: "Formations en présentiel ou en ligne : générez vos visuels promotionnels.",
    description: "Bootcamps, ateliers, masterclass : créez des affiches engageantes qui inscrivent.",
    benefits: ["Programme mis en avant", "Photo formateur", "Tarifs visibles", "Appel à l'action fort"],
    examples: ["Webinaire", "Bootcamp", "Masterclass", "Atelier"],
  },
};

export default function DomainLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const content = slug ? DOMAINS[slug] : null;

  if (!content) return <Navigate to="/" replace />;

  const url = `https://graphistegpt.pro/domaines/${content.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: content.h1,
    description: content.description,
    provider: { "@type": "Organization", name: "Graphiste GPT" },
    areaServed: "Worldwide",
    offers: { "@type": "Offer", priceCurrency: "USD", price: "8" },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{content.title}</title>
        <meta name="description" content={content.intro} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={content.title} />
        <meta property="og:description" content={content.intro} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Navbar onGetStarted={() => navigate("/auth")} />
      <main className="flex-1">
        <section className="container mx-auto max-w-4xl px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" />IA Graphiste
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">{content.h1}</h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{content.description}</p>
          <Button size="lg" className="gap-2" onClick={() => navigate("/app")}>
            Créer mon affiche gratuitement <ArrowRight className="w-4 h-4" />
          </Button>
        </section>

        <section className="container mx-auto max-w-4xl px-4 pb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Pourquoi Graphiste GPT pour {content.slug} ?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {content.benefits.map((b) => (
              <Card key={b}><CardContent className="pt-6 flex gap-3"><Check className="w-5 h-5 text-primary shrink-0 mt-0.5" /><span className="text-sm">{b}</span></CardContent></Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto max-w-4xl px-4 pb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Exemples d'affiches générées</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {content.examples.map((e) => (
              <span key={e} className="px-4 py-2 rounded-full bg-muted text-sm">{e}</span>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" onClick={() => navigate("/app")} className="gap-2">Essayer maintenant <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export { DOMAINS };
