
# Intégration de GeniusPay

Ajout de GeniusPay (https://geniuspay.ci) en tant qu'agrégateur de paiement pour les abonnements, à côté des intégrations existantes (Moneroo, FedaPay). On utilisera le **mode Checkout hébergé** (recommandé par GeniusPay) — le client choisit son moyen de paiement (Wave, Orange, MTN, Moov, Airtel, Carte, PawaPay…) sur la page GeniusPay.

## 1. Secrets à ajouter (je te les demanderai via le formulaire sécurisé)

- `GENIUSPAY_API_KEY` — clé publique (`pk_sandbox_...` ou `pk_live_...`)
- `GENIUSPAY_API_SECRET` — clé secrète (`sk_sandbox_...` ou `sk_live_...`)
- `GENIUSPAY_WEBHOOK_SECRET` — secret webhook (`whsec_...`), obtenu en créant un webhook côté GeniusPay vers l'URL de l'edge function

## 2. Edge function `create-geniuspay-payment`

Nouvelle edge function (Lovable Cloud) qui :
- Vérifie le JWT utilisateur
- Charge le plan (`subscription_plans` par `slug`), refuse `free`/`enterprise`
- Crée une ligne `payment_transactions` (status `pending`, `payment_method='geniuspay'`)
- Appelle `POST https://geniuspay.ci/api/v1/merchant/payments` avec :
  - `amount` = `plan.price_fcfa`, `currency: 'XOF'`
  - `description`, `customer` (name/email/phone)
  - `success_url` / `error_url` vers `/account?payment=success|failed`
  - `metadata`: `{ user_id, plan_id, transaction_id, plan_slug }`
  - **pas** de `payment_method` → renvoie un `checkout_url`
- Met à jour la transaction avec la `reference` GeniusPay (stockée dans `metadata.geniuspay_reference`)
- Retourne `{ checkoutUrl, transactionId }`

## 3. Edge function `geniuspay-webhook` (publique, `verify_jwt = false`)

- Lit les headers `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-Event`
- Vérifie la signature : `HMAC-SHA256(timestamp + "." + rawBody, GENIUSPAY_WEBHOOK_SECRET)` avec `timingSafeEqual`
- Vérifie que le timestamp est récent (< 5 min) pour bloquer les rejeux
- Gère les événements :
  - `payment.success` → marque la transaction `completed` + active/renouvelle l'abonnement (réutilise la logique existante `admin_grant_subscription` style, ou met à jour `user_subscriptions` directement avec `credits_per_month` du plan)
  - `payment.failed` / `payment.cancelled` / `payment.expired` → marque la transaction `failed`/`cancelled`/`expired`
  - `payment.refunded` → marque `refunded` (et éventuellement notification)
- Idempotence : ignore si la transaction est déjà `completed`
- Le trigger SQL `record_referral_commission` existant prendra automatiquement la commission affilié sur passage à `completed`

## 4. UI — choix du fournisseur

Dans `src/hooks/useSubscription.ts` (et page abonnement) :
- Ajout d'un paramètre `provider: 'geniuspay' | 'moneroo'` dans `createCheckout`
- Sur la page tarifs/abonnement, ajout d'une option « Payer avec GeniusPay » (Wave, Orange, MTN, Moov, carte, PawaPay) à côté de l'option Moneroo existante
- Redirection vers le `checkout_url` retourné

## 5. Configuration côté GeniusPay (à faire par toi après déploiement)

Je te donnerai l'URL exacte du webhook à coller dans le dashboard GeniusPay (Settings → Webhooks), avec les events `payment.success`, `payment.failed`, `payment.cancelled`, `payment.expired`, `payment.refunded`. À la création tu récupéreras le `whsec_...` à me transmettre via le formulaire sécurisé.

## Détails techniques

- Pas de modification de schéma DB : on réutilise `payment_transactions` (`payment_method = 'geniuspay'`, référence stockée dans `metadata.geniuspay_reference`).
- Pas de SDK : appels HTTP directs avec `fetch` + headers `X-API-Key` / `X-API-Secret`.
- Signature webhook vérifiée avec `crypto.subtle.importKey` + `sign('HMAC')` puis comparaison constante.
- Toujours répondre `200` au webhook après traitement réussi (sinon GeniusPay rejouera).
- Logs concis dans la console des edge functions pour diagnostic.

## Ordre d'exécution une fois en build mode

1. Te demander les 3 secrets via `add_secret` (en deux temps : API key + secret d'abord, webhook secret après que tu l'aies créé côté GeniusPay).
2. Créer les deux edge functions.
3. Mettre à jour `useSubscription` + UI de paiement.
4. Te communiquer l'URL du webhook à configurer dans le dashboard GeniusPay.
