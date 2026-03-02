import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </Link>

        <h1 className="font-display text-4xl font-bold mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-muted-foreground mb-10">Dernière mise à jour : 2 mars 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-foreground">
          <h2>1. Objet</h2>
          <p>Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme <strong>Graphiste GPT</strong> (ci-après « la Plateforme »), éditée par la société mentionnée dans les <Link to="/legal" className="text-primary hover:underline">Mentions Légales</Link>.</p>
          <p>En créant un compte ou en utilisant la Plateforme, l'utilisateur accepte sans réserve les présentes CGU.</p>

          <h2>2. Description du service</h2>
          <p>Graphiste GPT est une plateforme SaaS permettant la génération d'affiches publicitaires personnalisées grâce à l'intelligence artificielle, à partir de templates créés par des graphistes partenaires.</p>

          <h2>3. Inscription et compte utilisateur</h2>
          <p>L'accès aux fonctionnalités de génération nécessite la création d'un compte avec une adresse e-mail valide. L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité effectuée depuis son compte.</p>

          <h2>4. Système de crédits et tarification</h2>
          <p>La génération d'affiches consomme <strong>2 crédits par affiche</strong>, quelle que soit la résolution choisie. Les crédits sont achetés via les plans d'abonnement proposés. Les tarifs en vigueur sont affichés sur la page <Link to="/pricing" className="text-primary hover:underline">Tarifs</Link>.</p>
          <p>Les crédits achetés sont valables pour la durée de la période d'abonnement en cours et ne sont ni remboursables, ni transférables, sauf disposition contraire prévue par la loi applicable.</p>

          <h2>5. Propriété intellectuelle</h2>
          <p>Les templates et visuels de référence sont la propriété de leurs créateurs respectifs (graphistes partenaires). Les affiches générées par l'utilisateur via la Plateforme peuvent être utilisées à des fins commerciales et personnelles par l'utilisateur, sous réserve du respect des droits des tiers (images uploadées, logos, etc.).</p>
          <p>La marque Graphiste GPT, le logo et l'ensemble des éléments graphiques de la Plateforme sont protégés par le droit de la propriété intellectuelle.</p>

          <h2>6. Obligations de l'utilisateur</h2>
          <p>L'utilisateur s'engage à :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Ne pas utiliser la Plateforme à des fins illicites ou contraires aux bonnes mœurs</li>
            <li>Ne pas générer de contenu haineux, discriminatoire, pornographique ou incitant à la violence</li>
            <li>Ne pas tenter de contourner les mesures de sécurité ou les limitations techniques</li>
            <li>Respecter les droits de propriété intellectuelle des tiers</li>
          </ul>

          <h2>7. Limitation de responsabilité</h2>
          <p>La Plateforme est fournie « en l'état ». Graphiste GPT ne garantit pas un fonctionnement ininterrompu ni l'absence d'erreurs. En cas d'échec de génération, les crédits pourront être remboursés automatiquement.</p>
          <p>Graphiste GPT ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser la Plateforme.</p>

          <h2>8. Résiliation</h2>
          <p>L'utilisateur peut résilier son compte à tout moment. Graphiste GPT se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU, sans préavis ni indemnité.</p>

          <h2>9. Modification des CGU</h2>
          <p>Graphiste GPT se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle. La poursuite de l'utilisation de la Plateforme après modification vaut acceptation des nouvelles CGU.</p>

          <h2>10. Droit applicable</h2>
          <p>Les présentes CGU sont soumises au droit togolais. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents de Lomé, Togo.</p>

          <h2>11. Contact</h2>
          <p>Pour toute question relative aux présentes CGU, contactez-nous à : <strong>contact@graphistegpt.pro</strong></p>
        </div>
      </div>
    </div>
  );
}
