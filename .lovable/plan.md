## Problème identifié

L'API `POST /v1/posters/generate` appelle en interne `generate-image`, qui est **asynchrone** : elle renvoie immédiatement `{ success: true, jobId, status: 'processing' }` (HTTP 202) et fabrique l'affiche en arrière-plan.

Le wrapper `api-v1/index.ts` traite ce 202 comme un succès final et essaie d'extraire `imageUrl` d'une réponse qui n'en contient pas encore. Résultat côté développeur intégrateur :
- `image_url` vide ou absente
- `credits_used: 0`
- seul `template_used.image_url` (rempli localement par le wrapper) apparaît

C'est exactement ce qu'il décrit : « ça retourne un template, pas l'affiche finale ».

## Correctifs à apporter dans `supabase/functions/api-v1/index.ts`

### 1. Rendre `POST /v1/posters/generate` réellement synchrone (par défaut)

Après l'appel à `generate-image` :
- Récupérer le `jobId` renvoyé.
- Boucler (poll) la table `image_jobs` via le client admin jusqu'à `status === 'completed'` ou `'failed'`, avec :
  - intervalle ~1.5 s
  - timeout total ~110 s (en-dessous de la limite Edge Function de 150 s)
- Si `completed` → renvoyer `image_url = result_url`, `status: "completed"`, `job_id: <jobId>`, `credits_used` (lu depuis `params` ou via une requête `user_subscriptions` avant/après — version simple : laisser 1 en mode `quality`, 0 en `fast`/test).
- Si `failed` → renvoyer `GENERATION_FAILED` avec `error_message`.
- Si timeout → renvoyer `status: "processing"` + `job_id` pour que le client puisse poller `/v1/posters/:jobId` (voir point 2). HTTP 202.

### 2. Implémenter le endpoint manquant `GET /v1/posters/:jobId`

Déjà annoncé dans l'en-tête du fichier mais jamais routé. Ajouter :
- Route `GET /v1/posters/<uuid>` qui lit `image_jobs` (filtré par `user_id = ctx.userId`) et renvoie `{ job_id, status, image_url, error_message }`.
- Scope requis : `posters:generate` (ou nouveau `posters:read`).
- 404 si le job n'existe pas / n'appartient pas à la clé.

### 3. Petit nettoyage de l'extraction de réponse

Le code actuel essaie `imageUrl || image_url || url || data?.imageUrl`. Une fois le poll en place, on lit directement `result_url` de `image_jobs` → plus de devinette de champ.

### 4. Mettre à jour la doc API (`src/pages/ApiDocsPage.tsx`)

Documenter :
- Que `POST /v1/posters/generate` attend la fin de la génération (jusqu'à ~110 s) et renvoie l'`image_url` finale.
- Que si la réponse est `status: "processing"` + `job_id`, il faut poller `GET /v1/posters/:jobId`.
- Exemple de polling.

## Hors-scope

- Pas de changement de `generate-image` (le flux asynchrone reste utile pour l'app principale).
- Pas de modification de la facturation/crédits.
- Pas de touche à `src/integrations/supabase/client.ts` ni aux types auto-générés.

## Vérification après implémentation

- `supabase--curl_edge_functions` sur `/api-v1/v1/posters/generate` avec une vraie clé `gpt_live_...` pour vérifier qu'on reçoit bien `image_url` final.
- Test du `GET /v1/posters/:jobId` sur un job existant.
- Vérifier les logs `api-v1` et `generate-image` en cas d'échec.
