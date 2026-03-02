import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </Link>

        <h1 className="font-display text-4xl font-bold mb-2">Mentions Légales</h1>
        <p className="text-muted-foreground mb-10">Dernière mise à jour : 2 mars 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-foreground">
          <h2>1. Éditeur du site</h2>
          <p><strong>Graphiste GPT</strong></p>
          <ul className="list-none pl-0 space-y-1">
            <li>Adresse : Lomé, quartier Hédranawoé à côté de la radio Zéphyr, Togo</li>
            <li>Téléphone : +228 93708178</li>
            <li>E-mail : contact@graphistegpt.pro</li>
          </ul>

          <h2>2. Directeur de la publication</h2>
          <p>Le directeur de la publication est le représentant légal de la société éditrice de Graphiste GPT.</p>

          <h2>3. Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <ul className="list-none pl-0 space-y-1">
            <li><strong>Lovable Cloud</strong></li>
            <li>Infrastructure basée sur des serveurs sécurisés</li>
          </ul>

          <h2>4. Propriété intellectuelle</h2>
          <p>L'ensemble du contenu du site (textes, images, graphismes, logo, icônes, sons, logiciels) est la propriété exclusive de Graphiste GPT ou de ses partenaires graphistes, et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.</p>
          <p>Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site est interdite sans autorisation écrite préalable.</p>

          <h2>5. Données personnelles</h2>
          <p>Les informations relatives au traitement des données personnelles sont détaillées dans notre <Link to="/privacy" className="text-primary hover:underline">Politique de Confidentialité</Link>.</p>

          <h2>6. Cookies</h2>
          <p>Le site utilise des cookies techniques nécessaires au fonctionnement du service (authentification, préférences). Pour plus d'informations, consultez notre <Link to="/privacy" className="text-primary hover:underline">Politique de Confidentialité</Link>.</p>

          <h2>7. Liens hypertextes</h2>
          <p>Le site peut contenir des liens vers d'autres sites internet. Graphiste GPT n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.</p>

          <h2>8. Contact</h2>
          <p>Pour toute question concernant les mentions légales : <strong>contact@graphistegpt.pro</strong></p>
        </div>
      </div>
    </div>
  );
}
