## Objectif

Renforcer l'API publique `/v1/posters/generate` pour qu'elle soit intégrable sans deviner : champs validés, format en sortie, sync/async explicite, polling canonique, image finale stable, spec OpenAPI publiée. Tout en restant rétrocompatible avec `/v1` (changements additifs).

## Détails techniques

### 1. `supabase/functions/api-v1/index.ts` — validation & comportement

**Champs autorisés (strict)** dans `POST /v1/posters/generate` :
- requis : `domain`, et au moins un de (`subject` | `title`)
- optionnels documentés : `subject`, `title`, `date`, `location`, `contact`, `prices`, `speakers`, `colors`, `extra_instructions`, `aspect_ratio`, `resolution`, `reference_image_url`, `logo_url`, `logo_urls`, `mode` (`sync`|`async`), `webhook_url`, `idempotency_key` (alias du header)
- alias tolérés : `logo_url` → `logo_urls`, camelCase équivalent normalisé en snake_case avec warning
- TOUT autre champ (`prompt`, `usageType`, `waitForCompletion`, `returnImage`, `returnUrl`, `quality`, etc.) → ajouté dans `warnings: ["champ 'prompt' ignoré : utilisez 'subject' pour la direction créative", ...]` dans la réponse. Pas de 400 dur (rétrocompat) ; warning systématique.
- Note : `quality` reste accepté mais toujours forcé à `premium` (politique stricte déjà en place) avec warning explicite si différent.

**`aspect_ratio`** :
- liste blanche : `9:16`, `4:5`, `1:1`, `16:9`, `1.91:1`, `4:3`, `3:4`, `2:3`, `3:2`
- si omis → défaut `9:16` + warning `"aspect_ratio non fourni, défaut 9:16 appliqué"`
- si invalide → 400 `INVALID_ASPECT_RATIO` listant les valeurs supportées (jamais de fallback silencieux)
- réponse renvoie toujours `aspect_ratio`, `width`, `height`, `format: "png"` (table de mapping par ratio × resolution)

**Mode sync/async explicite** :
- `mode: "sync"` (défaut historique) : comportement actuel (poll interne ≤110 s)
- `mode: "async"` : réponse immédiate **202** avec `{ job_id, status: "processing", status_url: "<URL ABSOLUE>/v1/posters/{job_id}", webhook_url?, aspect_ratio, width, height, model, provider }`
- `webhook_url` (optionnel) : enregistré dans `image_jobs.params.webhook_url` ; déclenché plus tard (placeholder, pas d'envoi tant que pas d'infra signature — documenté "à venir"). Pour ce livrable : on stocke + on documente, l'envoi réel est out of scope sauf si demandé.
- URL absolue calculée depuis l'origine de la requête (`req.url`).

**Image finale canonique** :
- garantir un seul champ `data.image_url` (raster PNG public). Déjà le cas ; renforcer en supprimant doublons hypothétiques et en documentant.
- `template_used` reste séparé sous `data.template_used.{id,image_url}` (clairement étiqueté "référence, pas l'image finale").

**Idempotence** :
- lire header `Idempotency-Key` (ou body `idempotency_key`). Hash (api_key_id + key) → table `api_idempotency_keys` (nouvelle, voir migration). Si hit < 24 h → renvoyer la réponse stockée, ne pas re-débiter.
- TTL 24 h, purge paresseuse.

**Rate-limit headers** :
- déjà en place ; ajouter `Retry-After` sur 429.

**Endpoint `GET /v1/domains`** :
- nouvelle route publique (auth requise quand même) listant les `domain` distincts depuis `reference_templates` actifs + libellé + un domaine générique `business` toujours présent.

**Endpoint `GET /v1/openapi.json`** :
- sert la spec OpenAPI 3.1 (statique, hardcodée dans le fichier).

**Mode test (sandbox)** :
- générer une image factice qui respecte `aspect_ratio` réel (URL `https://placehold.co/{width}x{height}/png?text=API+test`).

### 2. Migration SQL — idempotence

Nouvelle table :
```sql
CREATE TABLE public.api_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  response_body jsonb NOT NULL,
  status_code int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  UNIQUE (api_key_id, idempotency_key)
);
GRANT ALL ON public.api_idempotency_keys TO service_role;
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;
-- pas de policy : accès service_role only via edge function
CREATE INDEX idx_idem_expires ON public.api_idempotency_keys(expires_at);
```

### 3. `src/pages/ApiDocsPage.tsx` — refonte doc

Ajouts :
- encadré « erreurs d'intégration fréquentes » (pas de `prompt`, toujours `aspect_ratio`, server-to-server only).
- section « `subject` vs `title` » avec exemple riche.
- tableau `aspect_ratio` ↔ réseaux (LinkedIn 1.91:1, IG feed 1:1, IG story/TikTok 9:16, YouTube 16:9, etc.) avec dimensions de sortie réelles.
- pour chaque champ : type, requis, défaut, comportement si omis (aspect_ratio en gras).
- exemples curl : sync 200, async 202 + boucle de polling, 400 UNKNOWN_FIELD/INVALID_ASPECT_RATIO, 429 avec Retry-After, idempotence.
- guide délais : sync ≤ ~110 s, recommander `mode: async` + polling pour serverless (avertissement Netlify 26 s / Vercel 60 s / Supabase 150 s).
- section versioning + changelog v1.1 (additif) + politique dépréciation.
- lien direct vers `GET /v1/openapi.json` et bouton « Télécharger OpenAPI 3.1 ».
- mini « migration guide » pour intégrateurs existants (rien à changer ; bénéfices opt-in via `mode`, `Idempotency-Key`, lecture des `warnings`).

### 4. Spec OpenAPI 3.1

Servie par `GET /v1/openapi.json` (hardcodée dans `api-v1/index.ts`). Couvre tous les endpoints, schémas de réponse (succès, warnings, erreurs normalisées), enum `aspect_ratio`, enum `domain` (référence dynamique), exemples.

## Critères d'acceptation (mappés)

1. Champ inconnu → `warnings[]` systématique dans la réponse (option 400 stricte non retenue pour rétrocompat).
2. `aspect_ratio` omis → défaut documenté + warning ; valeur invalide → 400 ; réponse renvoie toujours `aspect_ratio/width/height/format`.
3. `mode: "async"` → 202 immédiat + `job_id` + `status_url` absolue.
4. `data.image_url` = PNG raster public ; jamais le template (déjà garanti, conservé).
5. OpenAPI 3.1 servie sur `/v1/openapi.json` + lien depuis la doc.
6. Sandbox renvoie une image au bon format.

## Hors-scope

- Envoi réel de webhooks signés (stocké + documenté "bientôt").
- Bump `/v2`.
- Modifs UI hors `ApiDocsPage.tsx`.
- Refonte du pipeline interne `generate-image`.
