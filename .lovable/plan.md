

# Audit Abonnements, Roles & Affiliation - Corrections

## Problemes critiques identifies

### 1. CRITIQUE - Triggers dupliques (commissions x3)
Les triggers `record_referral_commission` sont attaches **3 fois** sur `payment_transactions` :
- `on_payment_completed_record_commission`
- `on_payment_completed`
- `record_referral_commission_trigger`

Meme chose pour `track_referral_signup` (2x) et `reset_monthly_counters` (2x).

**Impact** : Chaque paiement valide enregistre la commission d'affiliation 3 fois au lieu d'1. Les credits mensuels sont renouveles 2 fois.

**Correction** : Migration SQL pour supprimer les doublons et ne garder qu'un trigger par fonction.

### 2. CRITIQUE - Webhook ignore custom_credits (plan Business slider)
Quand un utilisateur choisit 30 affiches sur le slider Business, le metadata contient `custom_credits: 60`, mais le webhook (ligne 131) utilise `plan.credits_per_month` (la valeur fixe du plan, 24). L'utilisateur paie pour 30 affiches mais recoit seulement 12.

**Correction** : Le webhook doit lire `custom_credits` du metadata et l'utiliser s'il est present.

### 3. CRITIQUE - Client met "completed" avant verification serveur
Dans `useSubscription.ts` (ligne 198-205), le `onComplete` du widget FedaPay met directement `payment_transactions.status = "completed"` cote client. Cela declenche les triggers de commission AVANT que le webhook serveur ne verifie la transaction aupres de FedaPay.

**Impact** : Un utilisateur malveillant pourrait simuler un `onComplete` sans payer reellement, et les commissions seraient enregistrees.

**Correction** : Le client ne doit **jamais** mettre le statut a "completed". Il doit seulement mettre un statut intermediaire ("client_confirmed") et laisser le webhook serveur le passer a "completed" apres verification.

### 4. BUG - amount_usd incorrect pour Business slider
`useSubscription.ts` ligne 161 : `amount_usd: plan.price_usd` utilise le prix fixe du plan (17$) meme quand le slider est a 30 affiches. Le montant enregistre ne correspond pas au montant reel paye.

**Correction** : Calculer `amount_usd` proportionnellement au `customPriceFcfa`.

### 5. IMPORTANT - Admin grant fonctionne mais ne gere pas le plan "free"
La fonction `admin_grant_subscription` permet d'attribuer le plan gratuit, ce qui n'a pas de sens. Il faudrait filtrer le plan "free" dans l'UI du dialog d'attribution.

---

## Plan de corrections

### Phase 1 - Migration SQL (triggers + webhook)

Migration pour :
- Supprimer les triggers dupliques, garder 1 seul par fonction
- Aucune autre modification de schema necessaire

### Phase 2 - Webhook fedapay-webhook

Modifier pour :
- Lire `custom_credits` du metadata et l'utiliser au lieu de `plan.credits_per_month` quand present
- Enregistrer le bon nombre de credits dans `credit_transactions`

### Phase 3 - useSubscription.ts (securite client)

- Le `onComplete` ne doit plus mettre `status: "completed"` mais `status: "processing"` (statut intermediaire qui ne declenche pas les triggers)
- Corriger `amount_usd` pour utiliser le prix proportionnel quand customPriceFcfa est utilise

### Phase 4 - AdminSubscriptions UI

- Filtrer le plan "free" de la liste des plans dans le dialog d'attribution d'abonnement
- Le dialog fonctionne deja correctement avec `admin_grant_subscription` RPC

