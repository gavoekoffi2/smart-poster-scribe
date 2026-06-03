
## 1. Nouveau flux de paiement — Redirection WhatsApp

Remplacer Moneroo/FedaPay par un formulaire simple qui ouvre WhatsApp.

**Composant : `src/components/pricing/SubscriptionRequestModal.tsx`**

Au clic « S'abonner » sur une carte de plan, modal avec :
- Nom complet
- Numéro de téléphone
- Plan choisi (lecture seule)
- Bouton **« S'abonner via WhatsApp »**

Au clic :
1. Insert dans `subscription_requests` (pour suivi admin).
2. Ouvre `https://wa.me/22893708178?text=...` (nouvel onglet) avec message pré-rempli :
   ```
   Bonjour, je souhaite souscrire au plan {PLAN}.
   Nom: {NOM}
   Téléphone: {TEL}
   ```

Numéro WhatsApp : **+228 93 70 81 78**

**`src/components/pricing/PlanCard.tsx`** : retirer slider Business + calcul dynamique, brancher la modale WhatsApp à la place de `create-payment`.

Les fonctions edge Moneroo/FedaPay restent en place mais ne sont plus appelées depuis le pricing.

---

## 2. Coûts API réels (recherche effectuée ce jour)

| Modèle | Coût officiel par image |
|---|---|
| **Nano Banana Pro** (`gemini-3-pro-image-preview`) — rapide & bon | **$0.134** / image (1K-2K) |
| **GPT Image 2** (`openai/gpt-image-2`) — lent, qualité top | **$0.06** (low) → **$0.211** (high) — moyenne réaliste **~$0.15** en qualité standard |

**Hypothèse par affiche livrée** (génération + ~1 modification/amélioration moyenne) :
- Coût Nano Banana Pro × 2 ≈ **$0.27** (≈ 165 FCFA)
- Coût GPT Image 2 × 2 ≈ **$0.30** (≈ 185 FCFA)
- **Coût moyen mixte par affiche : ~$0.28 → ~170 FCFA**

---

## 3. Plans proposés (basés sur ces coûts réels)

L'utilisateur choisit le modèle au moment de la création :
- **Mode Rapide** → Nano Banana Pro
- **Mode Pro (long, qualité max)** → GPT Image 2

```text
┌──────────────────────────────────────────────────────────────┐
│ FREE (garder pour conversion)                                 │
│ • 3 affiches offertes • Modifications illimitées             │
├──────────────────────────────────────────────────────────────┤
│ ESSENTIEL — 5 000 FCFA / mois (~$8)                          │
│ • 20 affiches / mois (n'importe quel modèle)                  │
│ • Modifications illimitées (incluses, ne consomment pas)      │
│ Coût API pire cas : 20 × $0.30 = $6 → marge ~$2 (25%)        │
│ Coût API cas moyen : 20 × $0.20 = $4 → marge ~$4 (50%)       │
├──────────────────────────────────────────────────────────────┤
│ ILLIMITÉ — 25 000 FCFA / mois (~$42) ⭐ Le plus populaire    │
│ • Générations ILLIMITÉES (fair-use 250/mois en interne)       │
│ • Choix libre Nano Banana Pro / GPT Image 2                   │
│ • Templates premium + support prioritaire                     │
│ Hypothèse usage moyen 60/mois × $0.28 = $17 → marge $25 (60%)│
│ Pire cas réaliste (150 × $0.28) = $42 → break-even           │
│ Fair-use à 250 = $70 max → couvert par 95% des users qui     │
│ consomment beaucoup moins (loi de Pareto)                    │
└──────────────────────────────────────────────────────────────┘
```

### Justification chiffrée

- **Essentiel à 5 000 FCFA** : prix d'entrée raisonnable pour le marché ouest-africain. Marge confortable (50%) en usage normal. Quota de 20 protège contre l'abus.
- **Illimité à 25 000 FCFA (~$42)** : couvre le coût API même pour les utilisateurs intensifs grâce à la **loi de Pareto** : 80% des abonnés consommeront moins de 40 affiches/mois (marge 70%+), 15% consommeront 40-100 (marge 30-50%), 5% iront jusqu'au fair-use (break-even). Au total, marge moyenne nette estimée **~55-60%**.
- Le « fair-use 250/mois » est interne (CGU), pas affiché en gros — protège uniquement contre les abus extrêmes.

---

## 4. Changements techniques

**Migration SQL — `subscription_plans` :**
- `is_active = false` pour `pro` et `business`.
- Insert `essentiel` : 5000 FCFA / $8 / 40 crédits (20 affiches × 2).
- Insert `illimite` : 25000 FCFA / $42 / 9999 crédits sentinelle, `is_popular = true`.

**Frontend :**
- `SubscriptionRequestModal.tsx` → formulaire WhatsApp
- `PlanCard.tsx` → retirer slider, affichage « ∞ Illimité » si `credits_per_month >= 9999`, ouvrir modale WhatsApp
- `PricingPage.tsx` → copy mise à jour
- `useSubscription.ts` → si `credits >= 9999`, pas de décrément ; log fair-use à 250

---

## 5. Questions avant implémentation

1. **Prix OK ?** 5 000 / 25 000 FCFA te conviennent, ou tu préfères ajuster (ex: 4 000 / 20 000 plus accessible, ou 6 000 / 30 000 plus de marge) ?
2. **Garder le plan Free** (3 affiches) ? Recommandé pour la conversion.
3. **Fair-use 250/mois** sur l'illimité (caché en CGU) : OK ou vraiment 100% illimité sans aucun garde-fou ?
4. **Message WhatsApp pré-rempli** : le texte proposé te va, ou tu veux le personnaliser ?
