
# Audit Approfondi Final - Graphiste GPT (Pre-lancement)

## Statut des corrections precedentes

Les corrections de Phase 1 et Phase 2 ont ete appliquees avec succes :
- Plans tarifaires alignes en DB (Populaire: $7/10 credits, Business: $17/24 credits) -- FAIT
- `check_and_debit_credits` fixe a 2 credits -- FAIT
- RLS securisees sur `generated_images` et `generation_feedback` -- FAIT
- Route 404 catch-all + traduction FR -- FAIT
- Error Boundary global -- FAIT
- Mot de passe oublie + `/reset-password` -- FAIT
- Pages legales CGU/Mentions/Confidentialite -- FAIT
- Statut paiement aligne (completed) -- FAIT

---

## PROBLEMES RESTANTS A CORRIGER

### 1. CRITIQUE - Pas de remboursement si generation echoue

Quand la generation IA echoue (timeout Kie AI, erreur API), les 2 credits sont debites AVANT la generation (`check_and_debit_credits` est appele en amont). L'utilisateur perd ses credits sans resultat.

**Correction** : Dans `generate-image/index.ts`, si la generation echoue apres le debit des credits, rembourser automatiquement via un INSERT dans `credit_transactions` et un UPDATE de `user_subscriptions.credits_remaining`.

### 2. CRITIQUE - Plan "enterprise" visible sur /pricing mais non fonctionnel

La page `/pricing` affiche les plans depuis la DB. Le plan `enterprise` (slug: `enterprise`, price: $0, credits: -1) est marque `is_active = true` et donc affiche sur la page `/pricing`. Mais :
- Le bouton ouvre `mailto:contact@graphiste-gpt.com` qui n'est probablement pas configure
- Le `PlanCard` ne gere pas le cas enterprise (pas d'icone, gradient par defaut)
- Sur la landing page `PricingSection`, le plan enterprise n'apparait pas (hardcode), creant une incoherence

**Correction** : Soit desactiver le plan enterprise en DB (`is_active = false`), soit le gerer proprement dans le PlanCard avec une icone Building2 et un CTA "Nous contacter".

### 3. IMPORTANT - Liens du footer "Produit" et "Entreprise" ne fonctionnent pas

Les liens "Fonctionnalites", "Tarifs", "Templates" dans le footer utilisent des `<a href="#features">` au lieu de `<Link>`. Depuis une page autre que la landing (ex: /terms, /privacy), ces liens ajoutent juste `#features` a l'URL courante sans naviguer vers la landing page.

Les liens "Blog", "Carrieres", "API" pointent vers `#blog`, `#careers`, `#api` qui n'existent pas.

**Correction** :
- Remplacer les anchors par `<Link to="/#features">` ou `<Link to="/#pricing">`
- Retirer ou remplacer les liens "Blog", "Carrieres", "API" par des liens valides ou les masquer

### 4. IMPORTANT - Liens sociaux du footer sont vides (`href="#"`)

Les icones Twitter, LinkedIn, Instagram, GitHub dans le footer pointent toutes vers `#`. Un utilisateur qui clique ne va nulle part.

**Correction** : Mettre les vrais liens ou retirer les icones.

### 5. IMPORTANT - useHistory tente d'inserer sans user_id (echec RLS)

Dans `useHistory.ts` (ligne 127-131), le code tente d'inserer des images avec `user_id = null` pour les utilisateurs non connectes. Mais la RLS exige `auth.uid() = user_id`, ce qui bloque l'insertion. La generation `generate-image` bloque deja les non-authentifies (ligne 651-662), mais le code frontend ne devrait pas tenter cette insertion.

**Correction** : Ajouter un guard dans `saveToHistory` : si `!user`, ne pas tenter l'insertion en DB.

### 6. IMPORTANT - Avertissements auth "Lock not released" dans la console

La console montre des avertissements repetitifs `Lock "lock:sb-...-auth-token" was not released within 5000ms`. Cela est cause par des appels concurrents a `getSession()` et `onAuthStateChange` dans plusieurs hooks (`useAuth`, `useHistory`, `useSubscription`). Chaque hook cree son propre listener.

**Correction** : Centraliser l'etat auth dans un seul contexte React (`AuthProvider`) au lieu de repeter `supabase.auth.onAuthStateChange` dans chaque hook. Les hooks `useHistory` et `useSubscription` devraient recevoir le `user` via props ou contexte.

### 7. IMPORTANT - Pas de protection d'acces sur les routes admin

Les pages admin (`/admin/*`) n'ont pas de garde d'acces dans le routeur. Un utilisateur non-admin peut acceder directement a `/admin/dashboard`. Le composant `AdminLayout` fait la verification, mais le contenu est brievement visible avant la redirection.

**Correction** : Creer un composant `AdminRoute` wrapper qui verifie le role avant le rendu, similar au guard d'authentification sur `/app`.

### 8. IMPORTANT - Pas de protection sur les routes designer

Les pages `/designer/*` sont accessibles a tout utilisateur connecte meme s'il n'est pas designer verifie. Il n'y a pas de guard similaire a celui des pages admin.

**Correction** : Ajouter un guard de verification du role designer.

### 9. MOYEN - Le plan Business avec slider ne modifie pas les credits en DB

Le slider du plan Business permet de choisir entre 12 et 50 affiches, mais `openFedaPayCheckout` envoie toujours le `plan.price_fcfa` fixe (9900 FCFA pour 24 credits). Le prix dynamique affiche a l'utilisateur ($17-$70) ne correspond pas au montant debite par FedaPay (toujours 9900 FCFA).

**Correction** : Passer le prix dynamique et les credits dynamiques a `openFedaPayCheckout`, ou fixer le slider a une seule valeur. C'est un probleme de confiance client qui DOIT etre corrige avant le lancement.

### 10. MOYEN - Aucun email de confirmation de paiement

Apres un paiement reussi via FedaPay, l'utilisateur ne recoit aucun email de confirmation ni de recu. Pour un SaaS payant, c'est un manque important de professionnalisme et de confiance.

**Correction** : Envoyer un email transactionnel depuis le webhook `fedapay-webhook` apres activation de l'abonnement.

### 11. MOYEN - Aucune gestion de l'expiration de l'abonnement

Le trigger `reset_monthly_counters` renouvelle les credits automatiquement quand `current_period_end < now()`. Mais il n'y a aucun mecanisme pour :
- Notifier l'utilisateur que son abonnement expire bientot
- Gerer le non-renouvellement (pas de paiement recurrent)
- Revenir au plan gratuit si le mois est passe sans paiement

**Correction** : Ajouter une logique de verification de l'expiration. Si `current_period_end` est passe et aucun paiement n'est enregistre, rebasculer vers le plan gratuit.

### 12. MOYEN - Performances landing page (Scene3D)

La landing page charge `@react-three/fiber` et `@react-three/drei` (Three.js complet) pour un simple effet de fond. C'est environ 500KB+ de JavaScript supplementaire qui ralentit le chargement initial.

**Correction** : Lazy-load le composant `Scene3D` avec `React.lazy()` et `Suspense`, ou le remplacer par un effet CSS plus leger.

### 13. MINEUR - AppPage fait 1025 lignes

Le fichier `AppPage.tsx` est un composant monolithique de 1025 lignes. Cela rend la maintenance difficile et affecte les temps de compilation.

**Correction** : Extraire les sous-composants (header, zone de chat, zone d'image, zone d'input) dans des fichiers separes.

### 14. MINEUR - FedaPay SDK charge en synchrone

Le script `checkout.js` de FedaPay est charge en synchrone dans `index.html` (ligne 24). Cela bloque le rendu initial.

**Correction** : Ajouter `async` ou `defer` a la balise script, ou le charger dynamiquement uniquement quand l'utilisateur arrive sur une page de paiement.

### 15. MINEUR - og:image pointe vers favicon.png

Les meta tags Open Graph utilisent `/favicon.png` comme image de partage. Quand quelqu'un partage le lien sur les reseaux sociaux, l'apercu affiche un petit favicon au lieu d'une image marketing.

**Correction** : Creer une image og:image de 1200x630px avec le branding et la mettre a jour dans `index.html`.

---

## FAILLES DE SECURITE RESTANTES (depuis le scan)

### S1. Scan de securite : donnees sensibles accessibles

Le scan de securite signale que les tables `profiles`, `payment_transactions`, `referral_commissions`, `user_subscriptions`, `credit_transactions`, `affiliates`, `partner_designers` peuvent exposer des donnees. En verifiant les RLS :

- `profiles` : SELECT restreint a `auth.uid() = user_id` + admins. **OK**
- `payment_transactions` : SELECT restreint a `auth.uid() = user_id` + service_role. **OK**
- `user_subscriptions` : SELECT restreint a `auth.uid() = user_id` + service_role. **OK**
- `credit_transactions` : SELECT restreint a `auth.uid() = user_id` + service_role. **OK**
- `affiliates` : SELECT restreint a `auth.uid() = user_id` + admins. **OK**
- `referral_commissions` : SELECT restreint via affiliate_id join + admins. **OK**
- `partner_designers` : SELECT public pour les designers verifies (`is_verified = true`), mais expose `total_earnings`. **A CORRIGER** : creer une vue publique sans `total_earnings`.

### S2. Protection mots de passe compromis desactivee

Le linter Supabase signale toujours que la protection contre les mots de passe compromis est desactivee. Les utilisateurs peuvent s'inscrire avec des mots de passe connus comme fuites.

**Correction** : Activer la protection dans les parametres d'authentification.

### S3. Webhook FedaPay toujours sans verification de signature

Le webhook accepte n'importe quelle requete POST. Un attaquant pourrait forger un faux webhook pour activer un abonnement gratuit.

**Correction** : Verifier la transaction aupres de l'API FedaPay avant d'activer l'abonnement (GET la transaction par son ID et verifier son status).

---

## PLAN DE CORRECTIONS PRIORITAIRE (Pre-lancement)

### Bloc 1 -- Critique (bloquant pour le lancement)

1. Ajouter le remboursement automatique des credits si la generation echoue
2. Corriger le slider Business (prix dynamique vs prix fixe en DB)
3. Corriger les liens du footer (navigation inter-pages)
4. Verifier la transaction FedaPay dans le webhook avant activation

### Bloc 2 -- Important (a faire avant le lancement)

5. Centraliser l'auth dans un Provider pour eliminer les warnings de lock
6. Ajouter des gardes d'acces sur les routes `/admin/*` et `/designer/*`
7. Corriger `useHistory` pour ne pas tenter d'insert sans user
8. Gerer le plan enterprise (desactiver ou implementer)
9. Masquer `total_earnings` des designers dans la vue publique

### Bloc 3 -- Ameliorations (a planifier apres le lancement)

10. Lazy-load Scene3D + defer FedaPay SDK
11. Ajouter emails transactionnels (confirmation paiement)
12. Gestion de l'expiration d'abonnement
13. Image og:image pour le partage social
14. Refactorer AppPage.tsx en sous-composants
15. Corriger/supprimer les liens sociaux et "Blog/Carrieres/API"

---

## Details techniques

### Remboursement automatique (correction 1)

Dans `generate-image/index.ts`, apres l'echec de `pollForResult` ou `createTask`, ajouter :

```text
// Si les credits ont ete debites et que la generation echoue
if (creditCheckResult?.success && userId) {
  const creditsUsed = creditCheckResult.credits_used;
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: creditsUsed,
    type: 'refund',
    description: 'Remboursement auto: generation echouee'
  });
  await supabase.from('user_subscriptions')
    .update({ credits_remaining: supabase.rpc('...') })
    .eq('user_id', userId);
}
```

### Slider Business (correction 2)

Modifier `openFedaPayCheckout` dans `useSubscription.ts` pour accepter un parametre `customCredits` et `customPrice`. Adapter l'appel dans `PricingSection` pour passer le prix dynamique.

### Verification FedaPay (correction 4)

Dans `fedapay-webhook/index.ts`, avant d'activer l'abonnement, faire un appel API FedaPay pour verifier le statut reel :

```text
const verifyResponse = await fetch(
  `https://api.fedapay.com/v1/transactions/${transactionData.id}`,
  { headers: { Authorization: `Bearer ${FEDAPAY_SECRET_KEY}` } }
);
const verified = await verifyResponse.json();
if (verified.v1.status !== 'approved') throw new Error('Transaction non verifiee');
```

Cela necessite d'ajouter le secret `FEDAPAY_SECRET_KEY`.
