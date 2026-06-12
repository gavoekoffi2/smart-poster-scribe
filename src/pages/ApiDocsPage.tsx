import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, KeyRound, Zap, Sparkles, ShieldCheck, BookOpen } from "lucide-react";

const API_BASE = "https://bbfzfgcdioewzbmlgaqy.supabase.co/functions/v1/api-v1";

function Code({ children }: { children: string }) {
  return (
    <pre className="text-xs md:text-sm bg-card/80 border border-border/50 rounded-lg p-4 overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <Button asChild size="sm">
            <Link to="/account?tab=api"><KeyRound className="w-4 h-4 mr-2" />Mes clés API</Link>
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-[220px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="md:sticky md:top-20 md:self-start space-y-1 text-sm">
          <p className="font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-xs">Documentation API</p>
          {[
            ["intro", "Introduction"],
            ["quickstart", "Démarrage rapide"],
            ["auth", "Authentification"],
            ["template-selection", "Sélection auto du template"],
            ["modes", "Modes : fast vs quality"],
            ["endpoint-generate", "POST /posters/generate"],
            ["endpoint-templates", "GET /templates"],
            ["endpoint-suggest", "POST /templates/suggest"],
            ["endpoint-analyze", "POST /images/analyze"],
            ["endpoint-credits", "GET /account/credits"],
            ["errors", "Codes d'erreur"],
            ["limits", "Limites & tarification"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">{label}</a>
          ))}
        </aside>

        {/* Main content */}
        <main className="space-y-10 min-w-0">
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-card/50 to-accent/10 p-8 md:p-12">
            <Badge className="mb-3" variant="secondary">v1 — stable</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3 flex-wrap">
              <BookOpen className="w-10 h-10 text-primary" />API GraphisteGPT
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mb-6">
              Intégrez la génération d'affiches professionnelles dans vos propres applications.
              Envoyez juste un domaine et un sujet — nous nous occupons de tout le reste.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="neon">
                <Link to="/account?tab=api"><KeyRound className="w-5 h-5 mr-2" />Obtenir ma clé API</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#quickstart">Voir le démarrage rapide</a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Connexion requise. Clés sandbox gratuites disponibles immédiatement.
            </p>
          </div>

          <Section id="intro" title="Introduction">
            <p>L'API GraphisteGPT expose les capacités de la plateforme via une interface REST simple. Tous les endpoints retournent du JSON.</p>
            <p><strong>URL de base</strong> : <code className="bg-muted px-1 rounded">{API_BASE}</code></p>
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <Zap className="w-5 h-5 text-primary mb-2" />
                <p className="font-semibold text-sm">Aucune image requise</p>
                <p className="text-xs text-muted-foreground">Le template est sélectionné automatiquement.</p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <Sparkles className="w-5 h-5 text-primary mb-2" />
                <p className="font-semibold text-sm">Qualité maximale</p>
                <p className="text-xs text-muted-foreground">GPT-Image-2 mode long par défaut.</p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <ShieldCheck className="w-5 h-5 text-primary mb-2" />
                <p className="font-semibold text-sm">Sandbox gratuit</p>
                <p className="text-xs text-muted-foreground">Clés test sans consommation de crédits.</p>
              </div>
            </div>
          </Section>

          <Section id="quickstart" title="Démarrage rapide">
            <p>Une seule requête suffit pour générer une affiche :</p>
            <Code>{`curl -X POST ${API_BASE}/v1/posters/generate \\
  -H "Authorization: Bearer VOTRE_CLE_API" \\
  -H "Content-Type: application/json" \\
  -d '{
    "domain": "restaurant",
    "subject": "Promo burger weekend - moules frites a volonte"
  }'`}</Code>
            <p className="text-sm">Réponse :</p>
            <Code>{`{
  "success": true,
  "data": {
    "job_id": "...",
    "status": "completed",
    "image_url": "https://.../affiche.png",
    "mode": "quality",
    "credits_used": 2,
    "template_used": { "id": "...", "image_url": "..." }
  },
  "request_id": "..."
}`}</Code>
          </Section>

          <Section id="auth" title="Authentification">
            <p>
              Toutes les requêtes nécessitent une clé API dans l'en-tête <code className="bg-muted px-1 rounded">Authorization</code>.
              Créez vos clés depuis <Link to="/account?tab=api" className="underline text-primary">Mon compte → API</Link>.
            </p>
            <Code>{`Authorization: Bearer gpt_live_xxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
            <p className="text-sm">
              Deux environnements : <strong>live</strong> (consomme des crédits) et <strong>test</strong> (sandbox gratuit, retourne une image fictive).
            </p>
          </Section>

          <Section id="template-selection" title="Sélection automatique du template">
            <p>
              Si vous n'envoyez pas <code className="bg-muted px-1 rounded">reference_image_url</code>,
              l'API choisit le meilleur template de référence depuis notre base, en fonction du domaine et du sujet.
              Plus votre <code className="bg-muted px-1 rounded">subject</code> est détaillé, meilleure est la sélection.
            </p>
            <p>Pour tester la sélection sans générer :</p>
            <Code>{`POST /v1/templates/suggest
{ "domain": "formation", "subject": "Formation marketing digital pour entrepreneurs" }`}</Code>
            <p>Vous pouvez aussi fournir directement une image de référence :</p>
            <Code>{`{
  "domain": "evenement",
  "subject": "Concert reggae plage",
  "reference_image_url": "https://votre-cdn.com/inspiration.jpg"
}`}</Code>
          </Section>

          <Section id="modes" title="Modes : fast vs quality">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <p className="font-semibold">quality <Badge className="ml-2">recommandé</Badge></p>
                <p className="text-sm text-muted-foreground mt-1">GPT-Image-2, qualité haute. Idéal pour la production. ~30–60s.</p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <p className="font-semibold">fast</p>
                <p className="text-sm text-muted-foreground mt-1">Aperçu rapide, qualité moindre. ~5–10s.</p>
              </div>
            </div>
          </Section>

          <Section id="endpoint-generate" title="POST /v1/posters/generate">
            <p>Génère une affiche. Champs supportés :</p>
            <Code>{`{
  "domain": "restaurant" | "evenement" | "formation" | "youtube_thumbnail" | ...,
  "subject": "Description détaillée du sujet",
  "mode": "quality" | "fast",         // défaut: quality
  "title": "Titre principal",
  "date": "15 mars 2026",
  "location": "Cotonou, Bénin",
  "contact": "+229 00 00 00 00",
  "prices": ["Standard 5000 FCFA", "VIP 15000 FCFA"],
  "speakers": ["Jean Dupont", "Marie Diallo"],
  "colors": ["#FF6B35", "#1A1A2E"],
  "logo_urls": ["https://.../logo.png"],
  "reference_image_url": "https://...",  // optionnel
  "aspect_ratio": "9:16",                // défaut: 9:16
  "resolution": "2K"                     // 1K | 2K
}`}</Code>
            <p className="text-sm">Exemple JavaScript :</p>
            <Code>{`const res = await fetch("${API_BASE}/v1/posters/generate", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + process.env.GRAPHISTEGPT_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    domain: "formation",
    subject: "Webinaire IA pour PME",
    title: "Boostez votre PME avec l'IA",
    date: "20 mars 2026",
    mode: "quality",
  }),
});
const { data } = await res.json();
console.log(data.image_url);`}</Code>
            <p className="text-sm">Exemple Python :</p>
            <Code>{`import requests, os
r = requests.post(
    "${API_BASE}/v1/posters/generate",
    headers={"Authorization": f"Bearer {os.environ['GRAPHISTEGPT_API_KEY']}"},
    json={"domain": "restaurant", "subject": "Soirée DJ rooftop"},
)
print(r.json()["data"]["image_url"])`}</Code>
          </Section>

          <Section id="endpoint-templates" title="GET /v1/templates">
            <p>Liste les templates de référence disponibles.</p>
            <Code>{`GET /v1/templates?domain=restaurant&limit=20`}</Code>
          </Section>

          <Section id="endpoint-suggest" title="POST /v1/templates/suggest">
            <p>Retourne le template auto-sélectionné pour un domaine + sujet (sans générer).</p>
            <Code>{`POST /v1/templates/suggest
{ "domain": "formation", "subject": "Bootcamp dev web" }`}</Code>
          </Section>

          <Section id="endpoint-analyze" title="POST /v1/images/analyze">
            <p>Analyse une image (extraction de texte, contenu visuel).</p>
            <Code>{`POST /v1/images/analyze
{ "imageUrl": "https://.../poster.jpg" }`}</Code>
          </Section>

          <Section id="endpoint-credits" title="GET /v1/account/credits">
            <p>Retourne les crédits restants du compte propriétaire de la clé.</p>
            <Code>{`{
  "credits_remaining": 248,
  "free_generations_used": 3,
  "period_end": "2026-07-08T...",
  "status": "active",
  "plan": { "name": "Pro", "slug": "pro" }
}`}</Code>
          </Section>

          <Section id="errors" title="Codes d'erreur">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b border-border/50"><th className="text-left py-2">Code</th><th className="text-left py-2">HTTP</th><th className="text-left py-2">Description</th></tr></thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30"><td className="py-2"><code>UNAUTHENTICATED</code></td><td>401</td><td>Clé manquante ou format invalide</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>INVALID_API_KEY</code></td><td>401</td><td>Clé révoquée, expirée ou inconnue</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>FORBIDDEN</code></td><td>403</td><td>Scope manquant pour l'endpoint</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>MISSING_DOMAIN</code></td><td>400</td><td>Champ <code>domain</code> obligatoire</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>INSUFFICIENT_CREDITS</code></td><td>402</td><td>Crédits épuisés</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>RATE_LIMITED</code></td><td>429</td><td>Plus de 60 requêtes/min</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>GENERATION_FAILED</code></td><td>502</td><td>Échec du moteur de génération (sera retenté)</td></tr>
              </tbody>
            </table>
          </Section>

          <Section id="limits" title="Limites & tarification">
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Rate limit</strong> : 60 requêtes/minute par clé.</li>
              <li><strong>Génération d'affiche</strong> : 2 crédits (mode <code>quality</code> ou <code>fast</code>).</li>
              <li><strong>Lecture (templates, account)</strong> : gratuit.</li>
              <li><strong>Sandbox (clés <code>gpt_test_…</code>)</strong> : aucune consommation, image fictive.</li>
            </ul>
            <p className="text-sm">
              Les crédits sont débités sur le compte propriétaire de la clé. Voir <Link to="/pricing" className="underline text-primary">les abonnements</Link>.
            </p>
          </Section>

          <div className="p-6 rounded-2xl border border-border/50 bg-card/50">
            <p className="font-semibold mb-2">Besoin d'aide ?</p>
            <p className="text-sm text-muted-foreground mb-3">Contactez-nous pour toute question d'intégration.</p>
            <Button asChild variant="outline" size="sm"><a href="mailto:support@graphiste-gpt.com">Contacter le support</a></Button>
          </div>
        </main>
      </div>
    </div>
  );
}
