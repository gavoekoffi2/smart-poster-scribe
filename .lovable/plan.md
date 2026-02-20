

# Integration de FedaPay en remplacement de Moneroo

## Objectif
Remplacer l'integration Moneroo (qui ne fonctionne pas) par FedaPay Checkout.js pour les paiements d'abonnements.

## Approche
FedaPay Checkout.js est un SDK **cote client** : le formulaire de paiement s'ouvre directement dans le navigateur sans passer par une edge function pour initialiser le paiement. C'est plus simple et plus fiable.

## Etapes

### 1. Ajouter le script FedaPay au projet
- Ajouter le script `https://cdn.fedapay.com/checkout.js?v=1.1.7` dans `index.html`
- Ajouter les types TypeScript pour `FedaPay` global

### 2. Demander la cle API publique FedaPay
- Comme c'est une cle **publique**, elle sera stockee directement dans le code (pas besoin de secret)

### 3. Modifier le hook `useSubscription.ts`
- Remplacer la methode `initializePayment` qui appelle l'edge function Moneroo par une nouvelle methode `openFedaPayCheckout` qui ouvre le widget FedaPay directement cote client
- Le widget FedaPay recevra : montant (FCFA), description, email/nom du client, et les metadata (user_id, plan_slug)
- Utiliser le callback `onComplete` pour detecter le succes/echec du paiement

### 4. Creer une edge function `fedapay-webhook`
- Recevra les notifications de FedaPay lorsqu'un paiement est confirme
- Verifiera la signature du webhook
- Activera l'abonnement dans la base de donnees (meme logique que le webhook Moneroo actuel)

### 5. Mettre a jour les composants de paiement
- `src/components/landing/PricingSection.tsx` : utiliser la nouvelle methode FedaPay
- `src/pages/PricingPage.tsx` : meme mise a jour + changer la mention "Moneroo" par "FedaPay"
- `src/pages/AccountPage.tsx` : adapter la logique de retour apres paiement

### 6. Autoriser le domaine
- Vous devrez autoriser le domaine `graphiste-gpt.lovable.app` dans votre dashboard FedaPay (menu Applications > Nom de domaine a autoriser)

## Flux de paiement

```text
Utilisateur clique "S'abonner"
       |
       v
Widget FedaPay s'ouvre (modal dans la page)
       |
       v
Utilisateur paie (Mobile Money, carte, etc.)
       |
       v
Callback onComplete cote client --> affiche confirmation
       |
       v
Webhook FedaPay --> edge function --> active l'abonnement en BDD
```

## Details techniques

### Script Checkout.js
Le SDK FedaPay sera charge dans `index.html` et utilise via `window.FedaPay` dans React.

### Parametres du widget
- `public_key` : cle publique live
- `transaction.amount` : prix en FCFA du plan
- `transaction.description` : "Abonnement Pro - Graphiste GPT"
- `transaction.custom_metadata` : `{ user_id, plan_slug, transaction_id }`
- `customer.email`, `customer.firstname`, `customer.lastname`
- `environment` : "live"
- `onComplete` : callback pour gerer le resultat

### Edge function webhook
- Recevra les evenements de paiement de FedaPay
- Mettra a jour `payment_transactions` et `user_subscriptions`
- La cle API secrete FedaPay sera stockee comme secret pour verifier les webhooks

### Fichiers modifies
- `index.html` (ajout script CDN)
- `src/hooks/useSubscription.ts` (nouvelle methode FedaPay)
- `src/components/landing/PricingSection.tsx` (utiliser FedaPay)
- `src/pages/PricingPage.tsx` (utiliser FedaPay + texte)
- `supabase/functions/fedapay-webhook/index.ts` (nouveau)
- `supabase/config.toml` (ajouter config webhook)

### Pre-requis utilisateur
- Fournir la cle API publique FedaPay
- Autoriser les domaines `graphiste-gpt.lovable.app` et `id-preview--77936a58-9c4e-49a8-b961-36b92c5edab2.lovable.app` dans le dashboard FedaPay
