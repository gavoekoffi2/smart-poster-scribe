import { Helmet } from "react-helmet-async";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Graphiste GPT",
  url: "https://graphiste-gpt.lovable.app",
  logo: "https://graphiste-gpt.lovable.app/favicon.png",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+228-93708178",
    contactType: "customer service",
    availableLanguage: "French",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Lomé",
    addressCountry: "TG",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Graphiste GPT",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description:
    "Créez des affiches professionnelles uniques avec l'intelligence artificielle. Génération d'images haute qualité pour tous vos projets créatifs.",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "0",
    highPrice: "25000",
    priceCurrency: "XOF",
    offerCount: "4",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Graphiste GPT",
  url: "https://graphiste-gpt.lovable.app",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://graphiste-gpt.lovable.app/app?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export function JsonLd() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(softwareSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
}
