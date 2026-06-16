## Problème

Les nouveaux plans ont bien été enregistrés en base de données le 03/06 :

| Plan | Prix | Crédits | Affiches |
|------|------|---------|----------|
| Gratuit | 0 $ / 0 FCFA | 6 | ≈ 3 |
| Essentiel | 8 $ / 5 000 FCFA / mois | 40 | 20 |
| Illimité (populaire) | 42 $ / 25 000 FCFA / mois | ∞ | Illimité |

La page `/pricing` charge déjà ces plans depuis la base, mais **la section « Tarifs » de la page d'accueil** (`src/components/landing/PricingSection.tsx`) affiche encore les ANCIENS prix codés en dur : *Essai gratuit*, *Populaire 7 $*, et un *Business 17 $* avec un slider. C'est ce que voit le visiteur depuis l'accueil — d'où l'impression que rien n'a été mis à jour.

## Objectif

Faire afficher à la page d'accueil exactement les mêmes plans que ceux en base, sans toucher aux prix ni au flux de paiement (formulaire + WhatsApp) qui sont déjà corrects sur `/pricing`.

## Changements

### 1. `src/components/landing/PricingSection.tsx` (refonte de l'affichage)

- Supprimer les constantes codées en dur (`BASE_BUSINESS_POSTERS`, prix Business, slider).
- Charger les plans actifs depuis le hook `useSubscription` (déjà disponible), au lieu du tableau `plans` codé en dur.
- Afficher 3 cartes correspondant aux slugs `free`, `essentiel`, `illimite` :
  - **Gratuit** : 0 $ (0 FCFA), « 6 crédits offerts (≈ 3 affiches) », features depuis la base.
  - **Essentiel** : 8 $ / mois (≈ 5 000 FCFA), « 20 affiches / mois », features depuis la base.
  - **Illimité** (badge « Le plus populaire ») : 42 $ / mois (≈ 25 000 FCFA), affichage `∞ Illimité` quand `credits_per_month >= 9999`.
- Retirer entièrement le slider Business et son calcul au prorata.
- CTA :
  - Gratuit → redirige vers `/auth`.
  - Essentiel / Illimité → redirige vers `/pricing` (où le `SubscriptionRequestModal` WhatsApp existe déjà).
- Bloc « Consommation des crédits » : garder « 1 affiche = 2 crédits ».

### 2. Vérifications passives (lecture seule, pas de modif si OK)

- `src/pages/PricingPage.tsx` : déjà branché sur la base — vérifier qu'il n'y a pas de texte résiduel parlant de « Populaire / Business / 12 affiches ».
- `src/components/pricing/PlanCard.tsx` : vérifier qu'il gère bien les slugs `essentiel` et `illimite` (affichage ∞).
- `src/components/credits/CreditBalance.tsx` : vérifier que le quota affiché correspond au nouveau plan (≈ 3 affiches pour 6 crédits gratuits, etc.).
- `src/components/credits/UpgradeModal.tsx` : remplacer toute mention résiduelle de l'ancien Pro/Business par Essentiel/Illimité si présente.

Si l'un de ces fichiers contient encore des libellés des anciens plans, je les corrigerai dans le même passage (libellés uniquement, pas de logique).

## Hors-scope

- Pas de changement des montants en base (déjà corrects).
- Pas de changement du flux de paiement WhatsApp.
- Pas de changement de la fonction SQL `check_and_debit_credits` (déjà à 2 crédits / affiche).
