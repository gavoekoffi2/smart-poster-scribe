# Plan : API Publique GraphisteGPT (v2)

API REST pour permettre à des apps tierces (ex : une app de création de contenu social) de générer des affiches via notre plateforme — avec ou sans image de référence, en privilégiant la qualité maximale (`openai/gpt-image-2` en mode long).

## 1. Principes clés (mis à jour)

- **Référence optionnelle** : l'API accepte une image de référence MAIS ne l'exige pas. Si absente, on sélectionne automatiquement le meilleur template depuis `reference_templates` (notre DB) selon `domain` + similarité de sujet.
- **Cas d'usage principal** : app tierce envoie seulement `{ domain, subject, ...infos }` → on choisit le template + on génère.
- **Évolutif** : champ `reference_image_url` reste supporté pour d'autres clients futurs.
- **Qualité maximum par défaut** : toutes les générations API utilisent `openai/gpt-image-2`, `quality: "high"`, mode long (non-streaming, attente du résultat final).
- **Choix client** : paramètre optionnel `mode: "fast" | "quality"` (défaut `quality`).

## 2. Sélection auto du template de référence

Quand le client n'envoie pas d'image :

1. Filtrer `reference_templates` par `domain` (exact ou compatible).
2. Calculer un score de pertinence :
   - **Tags overlap** : chevauchement entre tags du template et mots-clés du sujet.
   - **Description similarité** : matching keyword sur `description`.
   - **Popularité** : bonus si `usage_count` élevé (templates qui marchent bien).
   - **Active** : `is_active = true`.
3. Retourner le top 1. Si aucun match : fallback sur template générique du domaine, puis génération libre sans référence.
4. La réponse API indique `template_used: { id, image_url }` pour transparence.

Optimisation future : embeddings vectoriels sur sujet/tags (pgvector). Phase 1 = matching keyword + tags, suffisant pour démarrer.

## 3. Endpoints

Edge Function unique `api-v1` avec routeur :

| Méthode | Path | Description |
|---|---|---|
| **POST** | `/v1/posters/generate` | **Endpoint principal**. Body : `{ domain, subject, mode?, title?, date?, location?, contact?, prices?, speakers?, colors?, logo_url?, reference_image_url?, aspect_ratio?, resolution? }`. Retourne `{ job_id, status }`. |
| GET | `/v1/posters/:jobId` | Statut + `image_url` quand `completed`. |
| GET | `/v1/templates` | Liste templates (filtres `domain`, `category`, `tags`). |
| POST | `/v1/templates/suggest` | Body `{ domain, subject }` → retourne le template auto-sélectionné (pour debug/preview côté client). |
| POST | `/v1/images/analyze` | Analyse OCR/contenu d'une image. |
| GET | `/v1/account/credits` | Crédits restants. |
| GET | `/v1/account/usage` | Historique 30j. |

Réponses normalisées : `{ success, data?, error?, request_id }`.

## 4. Paramètres de génération forcés côté API

```ts
{
  model: "openai/gpt-image-2",
  quality: mode === "fast" ? "low" : "high",
  stream: false,                  // mode long : attente du résultat final
  partial_images: 0,
  aspect_ratio: body.aspect_ratio ?? "9:16",
  resolution: body.resolution ?? "2K",
}
```

Le mode `fast` reste dispo mais documenté comme "preview rapide, qualité moindre". `quality` (défaut) est recommandé partout dans la doc.

## 5. Base de données (migration)

**`api_keys`** : id, user_id, name, key_hash (sha256), key_prefix (8 chars), scopes (text[]), is_active, last_used_at, expires_at, revoked_at, created_at.
- RLS : owner only. service_role full.

**`api_usage_logs`** : id, api_key_id, user_id, endpoint, status_code, credits_used, mode, template_used_id, request_id, ip, user_agent, duration_ms, created_at.
- RLS : owner read only.

**Fonction SQL** `validate_api_key(p_key_hash)` → user_id, scopes, is_active.
**Fonction SQL** `match_reference_template(p_domain, p_subject)` → template_id (matching tags + keywords).

## 6. Sécurité & quotas

- Clé : `gpt_live_<32 chars>` (ou `gpt_test_<...>` sandbox = pas de crédits). Hashée SHA-256, affichée 1 fois.
- Scopes : `posters:generate`, `posters:read`, `templates:read`, `images:analyze`, `account:read`.
- Rate limit : 60 req/min par clé (configurable).
- Crédits : `check_and_debit_credits` sur le compte propriétaire. Mode `quality` = coût standard (2 crédits) ; mode `fast` = même coût (logique existante).
- Validation Zod sur tous les payloads.
- CORS ouvert + headers `X-RateLimit-*`.

## 7. UI utilisateur (onglet API dans `/account`)

- Liste clés (prefix, nom, dernière utilisation, statut, mode par défaut).
- Bouton "Créer une clé" → modal (nom + scopes + env live/test) → affichage clair UNE fois.
- Bouton "Révoquer".
- Graph consommation 30j (requêtes, crédits, taux d'erreur).
- Quick-start : extrait curl + lien doc.

## 8. Documentation publique (`/docs/api`)

Nouvelle route React + page SEO-optimisée :

- **Introduction** : auth Bearer, environnements live/test.
- **Quick start** : exemple minimal `{ domain: "restaurant", subject: "Promo burger weekend" }` → image générée.
- **Sélection auto du template** : explication du fonctionnement, comment maximiser la pertinence via `subject` détaillé, comment forcer un template via `template_id`.
- **Référence endpoints** : params, body, exemples curl / JS (fetch) / Python (requests) / PHP.
- **Modes `fast` vs `quality`** : tableau comparatif, recommandation `quality`.
- **Domaines supportés** : liste avec exemples de sujets.
- **Codes d'erreur** + retry policy.
- **Limites & crédits** : 1 génération = 2 crédits.
- **OpenAPI 3.0** : `/docs/api/openapi.json` + `openapi.yaml` versionné dans le repo.
- **Webhooks** (phase 2) : section "Coming soon".

## 9. Étapes de livraison

1. **Migration DB** — `api_keys`, `api_usage_logs`, RLS, fonctions `validate_api_key` + `match_reference_template`.
2. **Edge Function `api-v1`** — routeur + middleware (auth/quota/rate-limit/log).
3. **Endpoint `/v1/posters/generate`** — avec sélection auto template + `gpt-image-2` mode long.
4. **Endpoints support** — `/v1/posters/:jobId`, `/v1/templates`, `/v1/templates/suggest`, `/v1/account/*`.
5. **UI gestion clés** — onglet API dans `/account`.
6. **Documentation `/docs/api`** — page React + OpenAPI spec + exemples multi-langages.
7. **Sandbox** — clés `gpt_test_*` qui ne consomment pas de crédits (limitées en volume).

## Points restants à confirmer

- **Sandbox/test mode** : on l'inclut dès la v1 ? (recommandé pour que les devs tiers testent sans payer)
- **Webhooks** : maintenant ou phase 2 ? (recommandé phase 2)
- **Plan API dédié** : on garde les crédits du compte standard pour v1, plan "API Business" plus tard ?
