import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </Link>

        <h1 className="font-display text-4xl font-bold mb-2">Politique de Confidentialité</h1>
        <p className="text-muted-foreground mb-10">Dernière mise à jour : 2 mars 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-foreground">
          <h2>1. Responsable du traitement</h2>
          <p><strong>Graphiste GPT</strong>, dont les coordonnées figurent dans les <Link to="/legal" className="text-primary hover:underline">Mentions Légales</Link>, est responsable du traitement des données personnelles collectées sur la Plateforme.</p>

          <h2>2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Données d'inscription</strong> : nom complet, adresse e-mail, numéro de téléphone (facultatif), nom de l'entreprise (facultatif)</li>
            <li><strong>Données de profil</strong> : logo, palette de couleurs préférées, secteur d'activité</li>
            <li><strong>Données d'utilisation</strong> : historique des générations, prompts utilisés, images uploadées</li>
            <li><strong>Données de paiement</strong> : les paiements sont traités par nos partenaires (FedaPay, Moneroo). Nous ne stockons pas les données bancaires.</li>
            <li><strong>Données techniques</strong> : adresse IP, type de navigateur, pages consultées</li>
          </ul>

          <h2>3. Finalités du traitement</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fournir et améliorer le service de génération d'affiches</li>
            <li>Gérer votre compte et vos abonnements</li>
            <li>Traiter les paiements et émettre les factures</li>
            <li>Assurer la sécurité et prévenir la fraude</li>
            <li>Communiquer avec vous (support, notifications importantes)</li>
            <li>Améliorer la qualité des générations IA</li>
          </ul>

          <h2>4. Base juridique</h2>
          <p>Le traitement de vos données repose sur :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>L'exécution du contrat</strong> : pour fournir le service souscrit</li>
            <li><strong>L'intérêt légitime</strong> : pour améliorer nos services et assurer la sécurité</li>
            <li><strong>Le consentement</strong> : pour les communications marketing (le cas échéant)</li>
          </ul>

          <h2>5. Durée de conservation</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Données de compte</strong> : conservées pendant la durée de votre inscription + 3 ans après suppression du compte</li>
            <li><strong>Images générées</strong> : conservées pendant la durée de votre abonnement actif</li>
            <li><strong>Données de paiement</strong> : conservées pendant 10 ans (obligations comptables)</li>
            <li><strong>Images temporaires</strong> : supprimées dans un délai raisonnable après la génération</li>
          </ul>

          <h2>6. Partage des données</h2>
          <p>Vos données peuvent être partagées avec :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Prestataires de paiement</strong> : FedaPay, Moneroo (traitement des paiements)</li>
            <li><strong>Services d'IA</strong> : pour la génération d'affiches (les prompts sont envoyés de manière anonymisée)</li>
            <li><strong>Hébergeur</strong> : Lovable Cloud (stockage sécurisé des données)</li>
          </ul>
          <p>Nous ne vendons jamais vos données personnelles à des tiers.</p>

          <h2>7. Sécurité</h2>
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données : chiffrement en transit (HTTPS), contrôle d'accès basé sur les rôles (RLS), authentification sécurisée.</p>

          <h2>8. Vos droits</h2>
          <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
            <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
            <li><strong>Droit de suppression</strong> : demander l'effacement de vos données</li>
            <li><strong>Droit de portabilité</strong> : recevoir vos données dans un format structuré</li>
            <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
          </ul>
          <p>Pour exercer vos droits, contactez-nous à : <strong>contact@graphistegpt.pro</strong></p>

          <h2>9. Cookies</h2>
          <p>La Plateforme utilise uniquement des cookies techniques essentiels au fonctionnement du service :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Cookie d'authentification</strong> : maintien de votre session</li>
            <li><strong>Cookie de préférences</strong> : thème sombre/clair, langue</li>
          </ul>
          <p>Aucun cookie publicitaire ou de traçage n'est utilisé.</p>

          <h2>10. Transferts internationaux</h2>
          <p>Vos données peuvent être transférées vers des serveurs situés en dehors du Togo pour le traitement IA et l'hébergement. Ces transferts sont encadrés par des garanties appropriées.</p>

          <h2>11. Modifications</h2>
          <p>Nous nous réservons le droit de modifier la présente Politique de Confidentialité. Toute modification substantielle sera notifiée aux utilisateurs.</p>

          <h2>12. Contact</h2>
          <p>Pour toute question relative à la protection de vos données : <strong>contact@graphistegpt.pro</strong></p>
        </div>
      </div>
    </div>
  );
}
