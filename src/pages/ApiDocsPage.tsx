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
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link to="/" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary">Accueil</Link>
            <Link to="/pricing" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary">Tarifs</Link>
            <Link to="/docs/api" className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground">API</Link>
            <Link to="/faq" className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary">FAQ</Link>
          </nav>
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
            ["pitfalls", "Erreurs fréquentes"],
            ["quickstart", "Démarrage rapide"],
            ["auth", "Authentification"],
            ["subject-vs-title", "subject vs title"],
            ["aspect-ratios", "Formats (aspect_ratio)"],
            ["sync-async", "Sync vs Async"],
            ["idempotency", "Idempotence"],
            ["warnings", "Warnings & champs inconnus"],
            ["template-selection", "Sélection auto du template"],
            ["modes", "Qualité (toujours premium)"],
            ["endpoint-generate", "POST /posters/generate"],
            ["endpoint-poster-status", "GET /posters/:jobId"],
            ["endpoint-domains", "GET /domains"],
            ["endpoint-templates", "GET /templates"],
            ["endpoint-suggest", "POST /templates/suggest"],
            ["endpoint-analyze", "POST /images/analyze"],
            ["endpoint-credits", "GET /account/credits"],
            ["openapi", "OpenAPI 3.1"],
            ["errors", "Codes d'erreur"],
            ["limits", "Limites & tarification"],
            ["changelog", "Changelog & versioning"],
            ["migration", "Migration guide"],
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

          <Section id="pitfalls" title="Erreurs d'intégration fréquentes">
            <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/5 space-y-2 text-sm">
              <p>❌ <strong>Ne pas envoyer <code>prompt</code></strong> — ce champ est ignoré. Utilisez <code>subject</code> pour la direction créative.</p>
              <p>❌ <strong>Ne pas omettre <code>aspect_ratio</code></strong> — défaut <code>9:16</code>. Une affiche LinkedIn doit explicitement demander <code>1.91:1</code> ou <code>1:1</code>.</p>
              <p>❌ <strong>Appels navigateur interdits</strong> — la clé <code>gpt_live_*</code> doit rester serveur-à-serveur.</p>
              <p>❌ <strong>Ne pas confondre <code>template_used.image_url</code> et <code>data.image_url</code></strong> — l'image finale est <strong>toujours</strong> dans <code>data.image_url</code>.</p>
              <p>❌ <strong>Ne pas retry sans <code>Idempotency-Key</code></strong> — un retry sans clé d'idempotence peut être re-facturé.</p>
              <p>✅ <strong>Tout champ inconnu</strong> apparaît dans le tableau <code>warnings[]</code> de la réponse. Lisez-le en CI.</p>
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

          <Section id="subject-vs-title" title="subject vs title (et pas de prompt)">
            <p className="text-sm">
              <code>subject</code> est le seul champ de direction créative. Il décrit librement ce que doit raconter l'affiche.
              <code>title</code> est juste le texte qui apparaîtra en gros. Le champ <code>prompt</code> de certains SDK
              concurrents <strong>n'existe pas ici</strong> ; s'il est envoyé il finit dans <code>warnings[]</code> sans effet.
            </p>
            <Code>{`{
  "domain": "evenement",
  "title": "Soirée Gala 2026",
  "subject": "Gala de charité élégant, dress code black-tie, ambiance dorée, public urbain africain"
}`}</Code>
          </Section>

          <Section id="aspect-ratios" title="Formats supportés (aspect_ratio)">
            <p className="text-sm">
              <strong>Si vous omettez <code>aspect_ratio</code>, le défaut est <code>9:16</code></strong> (story/TikTok).
              Une valeur invalide retourne <code>400 INVALID_ASPECT_RATIO</code>. La réponse renvoie toujours
              <code>aspect_ratio</code>, <code>width</code>, <code>height</code>, <code>format: "png"</code>.
            </p>
            <table className="w-full text-sm border-collapse mt-2">
              <thead><tr className="border-b border-border/50"><th className="text-left py-2">Ratio</th><th className="text-left py-2">Usage</th><th className="text-left py-2">Dimensions (2K)</th></tr></thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30"><td><code>9:16</code></td><td>Story IG, TikTok, Reels, Shorts</td><td>1152 × 2048</td></tr>
                <tr className="border-b border-border/30"><td><code>16:9</code></td><td>YouTube, présentation, bannière X</td><td>2048 × 1152</td></tr>
                <tr className="border-b border-border/30"><td><code>1:1</code></td><td>Feed Instagram, Facebook, LinkedIn</td><td>2048 × 2048</td></tr>
                <tr className="border-b border-border/30"><td><code>4:5</code></td><td>Feed IG portrait</td><td>1640 × 2048</td></tr>
                <tr className="border-b border-border/30"><td><code>1.91:1</code></td><td>LinkedIn link preview, Facebook OG</td><td>2048 × 1072</td></tr>
                <tr className="border-b border-border/30"><td><code>4:3</code> / <code>3:4</code></td><td>Affiche classique</td><td>2048 × 1536 / 1536 × 2048</td></tr>
                <tr className="border-b border-border/30"><td><code>2:3</code> / <code>3:2</code></td><td>Print A4-like</td><td>1368 × 2048 / 2048 × 1368</td></tr>
              </tbody>
            </table>
          </Section>

          <Section id="sync-async" title="Sync vs Async">
            <p className="text-sm">
              Le mode est explicite via <code>mode: "sync" | "async"</code>. Défaut : <code>sync</code>.
            </p>
            <ul className="list-disc pl-6 text-sm space-y-1">
              <li><strong>sync</strong> : la requête attend jusqu'à ~110 s. Si la génération dépasse ce délai, la réponse devient <code>202</code> avec <code>status_url</code> absolue à poller.</li>
              <li><strong>async</strong> : réponse <code>202</code> immédiate avec <code>job_id</code> + <code>status_url</code>. Recommandé pour les plateformes serverless (<strong>Netlify ~26 s, Vercel ~60 s, Supabase ~150 s</strong>).</li>
            </ul>
            <Code>{`// 1) Démarrer en async
const start = await fetch("${API_BASE}/v1/posters/generate", {
  method: "POST",
  headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ domain: "restaurant", subject: "Brunch dominical", aspect_ratio: "1:1", mode: "async" }),
});
const { data } = await start.json();              // { job_id, status_url, ... }

// 2) Poller status_url (URL absolue déjà fournie)
while (true) {
  await new Promise(r => setTimeout(r, 3000));
  const r = await fetch(data.status_url, { headers: { Authorization: "Bearer " + KEY } });
  const j = (await r.json()).data;
  if (j.status === "completed") return j.image_url;
  if (j.status === "failed") throw new Error("failed");
}`}</Code>
          </Section>

          <Section id="idempotency" title="Idempotence (anti-double-facturation)">
            <p className="text-sm">
              Envoyez un header <code>Idempotency-Key: &lt;votre-uuid&gt;</code> sur <code>POST /v1/posters/generate</code>.
              Tout retry avec la même clé (≤ 24 h) renvoie la réponse mise en cache <strong>sans re-débiter</strong> les crédits.
              La réponse rejouée contient <code>idempotent_replay: true</code>.
            </p>
            <Code>{`curl -X POST ${API_BASE}/v1/posters/generate \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: 9b1f...c7e2" \\
  -d '{ "domain": "restaurant", "subject": "Promo burger" }'`}</Code>
          </Section>

          <Section id="warnings" title="Warnings & champs inconnus">
            <p className="text-sm">
              Pour ne jamais casser une intégration existante, les champs inconnus ne renvoient pas un 400 mais
              sont listés dans <code>warnings[]</code>. <strong>Loggez ce tableau en intégration continue.</strong>
            </p>
            <Code>{`{
  "success": true,
  "data": { "...": "..." },
  "warnings": [
    "champ 'prompt' ignoré : utilisez 'subject' pour la direction créative",
    "aspect_ratio non fourni, défaut 9:16 appliqué"
  ],
  "request_id": "..."
}`}</Code>
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

          <Section id="modes" title="Qualité : toujours premium (GPT Image 2)">
            <div className="p-4 rounded-lg border border-border/50 bg-card/50">
              <p className="font-semibold">premium <Badge className="ml-2">forcé</Badge></p>
              <p className="text-sm text-muted-foreground mt-1">
                Toutes les requêtes API utilisent <code>openai/gpt-image-2</code> en mode haute qualité.
                Le champ <code>quality</code> (ou <code>mode</code>) du body est ignoré : <code>quality: "fast"</code> est
                automatiquement écrasé en <code>"premium"</code>. Aucun fallback Gemini / Nano Banana / Kie / Lovable AI
                n'est utilisé sur l'API publique. Si GPT Image 2 n'est pas disponible, l'API retourne l'erreur{" "}
                <code>PREMIUM_MODEL_UNAVAILABLE</code> au lieu de générer avec un modèle inférieur.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                La réponse contient toujours <code>quality</code>, <code>model</code>, <code>provider</code> et{" "}
                <code>fallback_used</code>. Le champ <code>template_used.image_url</code> est une référence interne et n'est
                jamais retourné comme image finale — l'image finale est dans <code>data.image_url</code>.
              </p>
            </div>
          </Section>


          <Section id="endpoint-generate" title="POST /v1/posters/generate">
            <p>Génère une affiche. Champs supportés :</p>
            <Code>{`{
  "domain": "restaurant" | "evenement" | "formation" | "youtube_thumbnail" | ...,
  "subject": "Description détaillée du sujet",
  "quality": "premium",               // ignoré : toujours forcé à "premium" (gpt-image-2)
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
  }),
});
const { data } = await res.json();
console.log(data.image_url, data.model, data.provider, data.fallback_used);`}</Code>
            <p className="text-sm">Exemple Python :</p>
            <Code>{`import requests, os
r = requests.post(
    "${API_BASE}/v1/posters/generate",
    headers={"Authorization": f"Bearer {os.environ['GRAPHISTEGPT_API_KEY']}"},
    json={"domain": "restaurant", "subject": "Soirée DJ rooftop"},
)
print(r.json()["data"]["image_url"])`}</Code>
            <p className="text-sm mt-4">
              <strong>Réponse synchrone :</strong> l'endpoint attend la fin de la génération (jusqu'à ~110s) et renvoie directement <code>data.image_url</code> avec <code>status: "completed"</code>.
            </p>
            <p className="text-sm">
              <strong>Si la génération dépasse 110s :</strong> la réponse HTTP 202 contient <code>status: "processing"</code> + <code>job_id</code>. Il faut alors poller <code>GET /v1/posters/&lt;job_id&gt;</code> jusqu'à <code>status: "completed"</code>.
            </p>
            <Code>{`// Polling exemple
const { data } = await (await fetch("${API_BASE}/v1/posters/generate", { /* ... */ })).json();
if (data.status === "completed") return data.image_url;

while (true) {
  await new Promise(r => setTimeout(r, 3000));
  const r = await fetch(\`${API_BASE}/v1/posters/\${data.job_id}\`, {
    headers: { Authorization: "Bearer " + API_KEY },
  });
  const j = (await r.json()).data;
  if (j.status === "completed") return j.image_url;
  if (j.status === "failed") throw new Error(j.error_message);
}`}</Code>
          </Section>

          <Section id="endpoint-poster-status" title="GET /v1/posters/:jobId">
            <p>Endpoint canonique de polling. Toujours retourné via <code>status_url</code> dans les réponses 202.</p>
            <Code>{`{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "processing" | "completed" | "failed",
    "image_url": "https://..." | null,
    "aspect_ratio": "1:1",
    "width": 2048, "height": 2048, "format": "png",
    "quality": "premium", "model": "gpt-image-2",
    "provider": "openai", "fallback_used": false,
    "error": null
  }
}`}</Code>
          </Section>

          <Section id="endpoint-domains" title="GET /v1/domains">
            <p>Liste les valeurs valides pour <code>domain</code>. Toujours préférer <code>business</code> comme défaut générique fiable.</p>
            <Code>{`{ "domains": [{ "id": "restaurant", "label": "Restaurant" }, ...], "default": "business" }`}</Code>
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

          <Section id="openapi" title="OpenAPI 3.1">
            <p className="text-sm">
              Une spec machine-lisible est servie en JSON pour générer un client sans deviner un seul nom de champ.
            </p>
            <Code>{`GET ${API_BASE}/v1/openapi.json`}</Code>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <a href={`${API_BASE}/v1/openapi.json`} target="_blank" rel="noreferrer">Télécharger la spec OpenAPI 3.1</a>
            </Button>
          </Section>

          <Section id="errors" title="Codes d'erreur">
            <p className="text-sm text-muted-foreground">Toutes les erreurs suivent le même format : <code>{`{ success: false, error: { code, message, request_id } }`}</code>.</p>
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b border-border/50"><th className="text-left py-2">Code</th><th className="text-left py-2">HTTP</th><th className="text-left py-2">Description</th></tr></thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30"><td className="py-2"><code>UNAUTHENTICATED</code></td><td>401</td><td>Clé manquante ou format invalide</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>INVALID_API_KEY</code></td><td>401</td><td>Clé révoquée, expirée ou inconnue</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>FORBIDDEN</code></td><td>403</td><td>Scope manquant pour l'endpoint</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>MISSING_DOMAIN</code></td><td>400</td><td>Champ <code>domain</code> obligatoire</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>MISSING_SUBJECT</code></td><td>400</td><td>Fournir au moins <code>subject</code> ou <code>title</code></td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>INVALID_ASPECT_RATIO</code></td><td>400</td><td>Valeur non supportée. La réponse liste les valeurs autorisées.</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>INSUFFICIENT_CREDITS</code></td><td>402</td><td>Crédits épuisés</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>RATE_LIMITED</code></td><td>429</td><td>Plus de 60 requêtes/min. Headers <code>Retry-After</code> + <code>X-RateLimit-*</code>.</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>PREMIUM_MODEL_UNAVAILABLE</code></td><td>502</td><td>GPT Image 2 indisponible — aucun fallback autorisé sur l'API.</td></tr>
                <tr className="border-b border-border/30"><td className="py-2"><code>GENERATION_FAILED</code></td><td>502</td><td>Échec moteur. Réessayez avec <code>Idempotency-Key</code> pour éviter une double facturation.</td></tr>
              </tbody>
            </table>
          </Section>

          <Section id="limits" title="Limites & tarification">
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Rate limit</strong> : 60 requêtes/minute par clé. Headers : <code>X-RateLimit-Limit/Remaining/Reset</code>, <code>Retry-After</code> sur 429.</li>
              <li><strong>Génération d'affiche</strong> : 2 crédits (toujours premium).</li>
              <li><strong>Lecture (templates, domains, account)</strong> : gratuit.</li>
              <li><strong>Sandbox (clés <code>gpt_test_…</code>)</strong> : aucune consommation, image fictive qui <em>respecte</em> l'<code>aspect_ratio</code> demandé.</li>
              <li><strong>Délais</strong> : sync ≤ ~110 s, sinon passe en 202 avec <code>status_url</code>. Sur Netlify (~26 s) / Vercel (~60 s) / Supabase (~150 s), préférez <code>mode: "async"</code>.</li>
              <li><strong>Server-to-server uniquement</strong> : ne jamais exposer la clé côté navigateur (clé jamais loggée côté serveur non plus).</li>
            </ul>
          </Section>

          <Section id="changelog" title="Changelog & versioning">
            <p className="text-sm">
              <code>/v1</code> est stable. Tout changement cassant donnera lieu à <code>/v2</code> avec une période
              de dépréciation publique. Les nouveautés ci-dessous sont <strong>additives</strong> et n'exigent
              aucune modification des intégrations existantes.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>v1.1</strong> — Champs inconnus listés dans <code>warnings[]</code> ; <code>mode: sync|async</code> explicite ; <code>status_url</code> absolue ; écho complet du format (<code>aspect_ratio/width/height/format</code>) ; header <code>Idempotency-Key</code> ; nouveaux endpoints <code>/v1/domains</code> et <code>/v1/openapi.json</code> ; header <code>Retry-After</code> sur 429.</li>
              <li><strong>v1.0</strong> — Lancement. Forçage premium (GPT Image 2), <code>data.image_url</code> canonique.</li>
            </ul>
          </Section>

          <Section id="migration" title="Migration guide (intégrateurs existants)">
            <p className="text-sm">Rien à changer pour continuer à fonctionner. Pour bénéficier de v1.1, opt-in progressif :</p>
            <ol className="list-decimal pl-6 space-y-1 text-sm">
              <li>Loggez le tableau <code>warnings</code> en CI — vous y verrez vos champs ignorés (probablement <code>prompt</code> ou camelCase).</li>
              <li>Envoyez toujours un <code>aspect_ratio</code> explicite adapté au réseau cible.</li>
              <li>Sur serverless, passez en <code>mode: "async"</code> et pollez <code>status_url</code>.</li>
              <li>Ajoutez un header <code>Idempotency-Key</code> sur chaque génération pour rendre les retries gratuits.</li>
              <li>Lisez l'image finale via <code>data.image_url</code>, jamais via <code>template_used.image_url</code>.</li>
            </ol>
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
