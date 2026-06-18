# Forcer GPT Image 2 (premium) sur l'API publique

L'endpoint `POST /v1/posters/generate` doit toujours générer en mode premium avec `openai/gpt-5.4-image-2` via OpenRouter, sans fallback Gemini / Nano Banana / Kie / Lovable AI, et sans jamais renvoyer le template comme image finale.

## 1. `supabase/functions/api-v1/index.ts` — `routeGenerate`

- Ignorer `body.mode` / `body.quality` : forcer en interne `mode = "quality"` et `quality = "premium"`.
- Si l'appelant envoie explicitement `quality: "fast"` ou `mode: "fast"`, soit l'écraser silencieusement en premium (option retenue), soit retourner `400 QUALITY_NOT_ALLOWED`. → on écrase silencieusement pour ne pas casser les clients existants, mais on log `requested_quality` vs `forced_quality`.
- Ajouter au payload envoyé à `generate-image` un flag `apiStrictPremium: true` (nouveau).
- Adapter l'extraction de l'image finale : ne JAMAIS retomber sur `referenceImage` / `template_used.image_url`. Si le job termine sans `result_url`, retourner `PREMIUM_MODEL_UNAVAILABLE`.
- Réponse enrichie sur succès et sur polling terminé :
  ```json
  {
    "job_id": "...",
    "status": "completed",
    "image_url": "...",
    "quality": "premium",
    "model": "gpt-image-2",
    "provider": "openai",
    "fallback_used": false,
    "credits_used": 2,
    "template_used": { "id": "...", "image_url": "..." }
  }
  ```
- Réponse async (timeout polling) : ajouter `quality`, `model`, `provider`, `fallback_used: false`.
- Idem dans `routePosterStatus` : enrichir avec `quality/model/provider/fallback_used` (lire depuis `image_jobs` si disponible, sinon valeurs constantes pour les jobs API).
- Logs structurés par requête : `{ request_id, job_id, requested_quality, forced_quality: "premium", actual_model, actual_provider, fallback_used, template_id, status }`.
- Quand un template auto-sélectionné est cassé (erreur `Impossible de charger l'image de référence`), réessayer une fois avec un autre template (`suggestTemplate` doit retourner le N+1) avant d'échouer ; ne pas renvoyer cette erreur si elle vient d'un template interne.

## 2. `supabase/functions/generate-image/index.ts`

- Lire `apiStrictPremium` dans le body. Quand vrai :
  - Forcer `quality = "premium"`.
  - Skip `tryGoogle`, `tryKie`, `tryLovable` : si OpenRouter échoue ou si `OPENROUTER_API_KEY` est absent, marquer `error = "PREMIUM_MODEL_UNAVAILABLE"` avec message « GPT Image 2 is required for all API generations. No fast or fallback model was used. » et déclencher le remboursement automatique existant.
  - Écrire sur le job (`image_jobs`) deux nouvelles colonnes optionnelles ou champs dans `metadata` : `model_used = "gpt-image-2"`, `provider_used = "openai"`, `fallback_used = false`. Si la colonne n'existe pas, écrire un JSON dans `error_message` n'est pas idéal → préférer ajouter ces champs via une migration légère sur `image_jobs` (nullable) **ou** stocker dans un champ JSON existant. À confirmer après lecture de la table.
- Pour les appels NON-API (mode actuel), comportement inchangé : fallback chaîne Gemini→Kie→Lovable conservé.

## 3. `image_jobs` — colonnes additionnelles

Migration : ajouter `model_used text`, `provider_used text`, `fallback_used boolean default false` (nullable, sans changement RLS). Permet à `routePosterStatus` de renvoyer ces champs fidèlement.

## 4. Limitation du texte dans l'affiche (point 7 du brief)

Dans `routeGenerate`, quand on construit le prompt via `buildPromptFromStructured`, append une consigne stricte :
« L'image doit contenir : un titre court (≤6 mots), 2 à 5 mots-clés, 1 CTA court. Aucun paragraphe long. » — uniquement pour les requêtes API.

## 5. Tests Deno (`supabase/functions/api-v1/index.test.ts`)

Nouveaux cas (mock de `callGenerateImage`) :
- Requête sans `quality` → `forced_quality === "premium"`, `model === "gpt-image-2"`.
- Requête avec `quality: "fast"` → également forcée en premium.
- Réponse contient toujours `model`, `provider`, `quality`, `fallback_used`.
- Si `generate-image` retourne `PREMIUM_MODEL_UNAVAILABLE` → propagé tel quel avec status 502.
- `template_used.image_url` ≠ `data.image_url` ; si pas d'image finale → erreur, jamais le template.
- Async : `job_id` retourné puis `GET /v1/posters/:jobId` renvoie l'image finale enrichie.

## 6. Documentation `src/pages/ApiDocsPage.tsx`

Mettre à jour la doc :
- Indiquer que `quality` est ignoré et toujours `premium` (`gpt-image-2`).
- Documenter le code d'erreur `PREMIUM_MODEL_UNAVAILABLE`.
- Documenter les champs de réponse `quality/model/provider/fallback_used`.

## Hors-scope

- Pas de changement à l'UI `/app` (mode rapide reste disponible pour les utilisateurs connectés).
- Pas de changement aux webhooks de paiement, à l'auth, ni aux autres edge functions.
- Pas de modification de la chaîne de fallback pour les générations internes (non-API).
