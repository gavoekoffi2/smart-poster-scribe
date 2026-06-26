## Objectif

Quand un utilisateur clique sur "S'abonner", le moyen de paiement proposé par défaut est adapté à son pays :
- Cameroun → MTN MoMo / Orange Money Cameroun
- Côte d'Ivoire → Wave / Orange CI / MTN CI
- Sénégal → Wave / Orange / Free
- Togo, Bénin, Burkina, Mali… → Moov / Orange / MTN du pays
- RDC, Kenya, Ouganda… → opérateur local (Airtel, M-Pesa, MTN)
- Europe / USA / autres → Carte bancaire (Visa/Mastercard via GeniusPay)

L'utilisateur peut toujours changer le pays / moyen avant de payer.

## Faisabilité

Oui — GeniusPay supporte nativement :
- `customer.country` (ISO2 : CI, SN, CM, TG, CD…) pour router vers le bon opérateur
- `payment_method` (`wave`, `orange_money`, `mtn_money`, `moov_money`, `airtel_money`, `pawapay`, `card`)
- `mmo_provider` pour PawaPay (`ORANGE_CMR`, `MTN_MOMO_CMR`, `ORANGE_SEN`…)
- `card` pour les paiements internationaux (Visa/Mastercard)

→ Pas besoin d'ajouter Stripe pour l'Europe : la carte bancaire passe déjà par GeniusPay.

## Plan

### 1. Détection automatique du pays
Hook `useGeoCountry` qui détermine le pays dans cet ordre :
1. Pays sauvegardé dans le profil (`profiles.country`)
2. Préfixe du numéro de téléphone du profil (+237 → CM, +225 → CI, +221 → SN…)
3. Géolocalisation IP via une edge function légère `detect-country` utilisant l'en-tête `cf-ipcountry` / `x-vercel-ip-country` ou un fallback `https://ipapi.co/json`
4. Langue navigateur (fr-FR → FR, en-US → US…) en dernier recours

### 2. Mapping pays → moyen de paiement par défaut
Table `src/lib/paymentRouting.ts` :

```text
CM, GA, CG, CF (XAF)           → pawapay + mmo_provider auto (Orange/MTN)
CI                              → wave (par défaut), orange_money, mtn_money, moov_money
SN                              → wave, orange_money, pawapay (Free)
TG, BJ, BF, ML, NE, GW (XOF)   → moov_money, orange_money, mtn_money
CD                              → airtel_money, orange_money (pawapay VODACOM)
KE, UG, RW                      → pawapay (M-Pesa / MTN / Airtel)
GH, NG                          → paystack
Reste du monde (EU, US, etc.)  → card
```

### 3. UI du modal de paiement (`SubscriptionRequestModal.tsx`)
- Affichage en haut : "Paiement depuis : 🇨🇲 Cameroun" avec menu déroulant pour changer
- Liste des moyens de paiement disponibles pour ce pays, le premier sélectionné par défaut (logo + nom)
- Champ téléphone pré-rempli/validé selon le pays
- Pour les pays "carte" : on affiche directement "💳 Carte bancaire (Visa / Mastercard)"

### 4. Edge function `create-geniuspay-payment`
Accepter et transmettre 3 nouveaux paramètres optionnels :
- `country` (ISO2) → `customer.country`
- `paymentMethod` → `payment_method`
- `mmoProvider` → `mmo_provider`

Si `paymentMethod` est omis → comportement actuel (page checkout GeniusPay générique).

### 5. Persistance
Sauvegarder le pays choisi dans `profiles.country` (ajout de la colonne si absente) pour pré-remplir les prochains paiements.

## Détails techniques

- Pas de nouveau secret, pas de nouvelle dépendance
- Aucune modification de Stripe (non intégré, pas nécessaire — GeniusPay `card` couvre l'international)
- Migration SQL minimale : `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country text;`
- Fichiers touchés :
  - `src/lib/paymentRouting.ts` (nouveau)
  - `src/hooks/useGeoCountry.ts` (nouveau)
  - `supabase/functions/detect-country/index.ts` (nouveau, très léger)
  - `src/components/pricing/SubscriptionRequestModal.tsx` (UI sélecteur)
  - `src/hooks/useSubscription.ts` (passer country/paymentMethod)
  - `supabase/functions/create-geniuspay-payment/index.ts` (forwarder les nouveaux champs)
  - 1 migration SQL pour la colonne `country`

## Limites à savoir

- GeniusPay convertit automatiquement XAF/CDF/KES vers XOF côté gateway ; les montants restent affichés en FCFA dans l'app (déjà le cas).
- La détection IP n'est pas fiable à 100% (VPN, etc.) → l'utilisateur peut toujours changer le pays manuellement avant de payer.
