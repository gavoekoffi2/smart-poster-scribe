## Objectif

1. Tout utilisateur qui s'inscrit via un lien `?ref=XXXX` bénéficie automatiquement de **-10%** sur son premier (et seul) abonnement payant.
2. L'affilié continue de toucher **30% de commission récurrente** (déjà en place) — calculée sur le montant **réellement payé** par le filleul.
3. L'affilié voit dans son tableau de bord la **liste de ses filleuls** avec leur statut (inscrit / abonné / payant) en plus des stats déjà présentes.
4. Mettre en avant la remise dans la communication (lien copié, page d'inscription).

## 1. Remise filleul -10%

- Lecture du champ `profiles.referred_by` au moment du checkout dans `src/hooks/useSubscription.ts` (méthodes `openFedaPayCheckout` et le flux GeniusPay correspondant).
- Si `referred_by` est non nul **et** qu'aucun paiement `completed` n'existe encore pour ce user (première souscription), appliquer `priceFcfa * 0.9` et `priceUsd * 0.9`.
- Enregistrer la remise dans `payment_transactions.metadata` : `{ referral_discount: 0.10, referred_by: '<code>' }` pour traçabilité.
- Côté edge function `create-geniuspay-payment` : accepter un `discount_rate` optionnel et l'appliquer aux montants envoyés à GeniusPay (cohérent avec ce que voit l'utilisateur).
- La commission 30% (`record_referral_commission`) sera naturellement calculée sur `amount_usd` du transaction record, donc sur le **montant remisé** — c'est le comportement voulu.

## 2. Affichage de la remise

- `src/pages/AuthPage.tsx` : bandeau vert "🎁 Tu bénéficies de -10% sur ton premier abonnement grâce à ton parrain" si `?ref=` présent dans l'URL ou dans localStorage.
- `src/pages/PricingPage.tsx` : afficher le prix barré + prix -10% sur chaque plan si l'utilisateur est filleul éligible.
- `src/components/affiliate/AffiliateTab.tsx` : reformuler le texte du lien — "Vos filleuls bénéficient de **-10%**, vous touchez **30%** à vie".

## 3. Tableau de bord affilié — liste des filleuls

Ajouter une section "Mes filleuls" dans `AffiliateTab.tsx` montrant :

| Filleul | Inscrit le | Statut | Plan | Vos gains |
|---|---|---|---|---|

- Récupération via une nouvelle SQL function `get_affiliate_referrals(p_affiliate_id)` (security definer) qui joint `profiles` (filtrés sur `referred_by = code`) ↔ `user_subscriptions` ↔ `subscription_plans` ↔ somme `referral_commissions`. Évite d'exposer la table profiles côté RLS.
- Statut : `Inscrit` (pas d'abo payant), `Essai` (plan free), `Abonné` (plan payant actif), `Expiré`.
- Anonymisation légère : prénom + première lettre du nom (ex: "Jean K."), pour la confidentialité.

## 4. Détails techniques

- **Migration SQL** :
  - Fonction `get_affiliate_referrals(uuid)` retournant `(referral_name text, joined_at timestamptz, status text, plan_name text, total_earned numeric)`.
  - Vérification que l'appelant est bien le propriétaire de l'`affiliate_id`.
- **Hook** : étendre `useAffiliate` avec `referrals: Referral[]` chargés en parallèle des commissions.
- **Eligibilité remise** : helper `useReferralDiscount()` qui retourne `{ eligible, rate, code }` en croisant `profile.referred_by` et l'absence de paiement `completed` précédent.
- **Anti-abus** : la remise s'applique uniquement à la **première transaction completed** du user — vérifiée côté hook et re-vérifiée dans la webhook si nécessaire (pas d'altération du webhook ici, le contrôle frontend suffit puisque le user ne peut pas modifier son `referred_by` après inscription).

## Fichiers touchés

- `src/hooks/useSubscription.ts` — appliquer la remise
- `src/hooks/useAffiliate.ts` — charger les filleuls + helper discount
- `src/components/affiliate/AffiliateTab.tsx` — nouvelle section filleuls + texte
- `src/pages/AuthPage.tsx` — bandeau remise
- `src/pages/PricingPage.tsx` — prix barré pour filleuls
- `supabase/functions/create-geniuspay-payment/index.ts` — paramètre `discount_rate`
- Migration : fonction `get_affiliate_referrals`

## Hors-scope

- Modification du taux 30% (déjà en place).
- Multiples codes promo cumulables.
- Remise sur renouvellements (seulement le premier abonnement).
