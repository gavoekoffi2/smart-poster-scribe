

## Mise a jour des plans tarifaires

### Changements demandes

| Plan | Prix | Credits | Affiches |
|------|------|---------|----------|
| Essai gratuit | $0 (0 FCFA) | 5 (bonus unique) | ~2 |
| Populaire | $7 (~3 900 FCFA) | 10 | ~5 |
| Business | $17 (~9 900 FCFA) | 24 | ~12 |

Nouveau systeme de credits : **1 affiche = 2 credits** (uniforme, quelle que soit la resolution).
Le plan "Entreprise" est supprime. Le plan "Pro" est renomme "Populaire".

---

### Details techniques

#### 1. Migration base de donnees

- **Mettre a jour** les 3 plans existants dans `subscription_plans` :
  - `free` : garder tel quel (0$ / 0 FCFA, 0 credits_per_month) mais mettre a jour les features
  - `pro` : renommer en "Populaire", prix 7$ / 3900 FCFA, 10 credits/mois, mettre a jour features
  - `business` : prix 17$ / 9900 FCFA, 24 credits/mois, mettre a jour features
- **Desactiver** le plan `enterprise` (`is_active = false`)
- **Mettre a jour la fonction `check_and_debit_credits`** : remplacer le calcul variable (1K=1, 2K=2, 4K=4) par un cout fixe de **2 credits par affiche**, quelle que soit la resolution. Le plan gratuit consommera aussi 2 credits par affiche (donc ~2 affiches avec 5 credits).

#### 2. Mise a jour du hook `useSubscription.ts`

- `getCreditsNeeded()` : retourner toujours **2** au lieu du systeme variable par resolution
- `canGenerate()` : adapter pour utiliser 2 credits fixes
- `getRemainingCredits()` : ajuster le calcul pour le plan gratuit (5 credits, ~2 affiches)

#### 3. Mise a jour de l'UI Landing (`PricingSection.tsx`)

- Remplacer les 3 plans codes en dur par les nouveaux (Essai, Populaire, Business)
- Nouveaux prix, features et CTA ("Tester gratuitement", "Acheter maintenant")
- Mettre a jour la section "Consommation des credits" : afficher "1 affiche = 2 credits"
- Retirer le plan Enterprise

#### 4. Mise a jour de `PricingPage.tsx`

- Grille de 3 colonnes au lieu de 4
- Mettre a jour la section "Comment fonctionnent les credits" pour refleter le nouveau systeme (1 affiche = 2 credits)
- Adapter la FAQ (retirer la reference "5 affiches par mois" -> "5 credits d'essai, soit ~2 affiches")

#### 5. Mise a jour du `PlanCard.tsx`

- Adapter l'affichage des credits : montrer "X credits / 1 affiche = 2 credits / ~Y affiches"
- Retirer les references au slug `enterprise`
- Changer le CTA "S'abonner maintenant" en "Acheter maintenant" pour les plans payants

#### 6. Mise a jour du `CreditBalance.tsx`

- Ajuster l'affichage : "sur 5 credits" pour le plan gratuit, credits corrects pour les autres
- Retirer la reference "5 affiches" -> "~2 affiches"
- Mettre a jour la ligne info resolution ("1 affiche = 2 credits")

