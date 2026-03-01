
# Audit Complet de la Plateforme Graphiste GPT

## Etat des lieux

Graphiste GPT est un SaaS de generation d'affiches publicitaires par IA, cible Afrique francophone. L'audit revele des problemes critiques, des incoherences et des fonctionnalites manquantes.

---

## 1. PROBLEMES CRITIQUES (a corriger en priorite)

### 1.1 Desynchronisation Base de Donnees / Frontend (Tarifs)

Le frontend affiche 3 plans (Essai gratuit, Populaire a $7, Business a $17) mais la base de donnees contient 4 plans differents :
- `free` : 0 credits (OK)
- `pro` : 50 credits, $8, 5000 FCFA (le frontend dit "Populaire" a $7 / 3900 FCFA)
- `business` : 200 credits, $25, 15000 FCFA (le frontend dit $17 / 9900 FCFA)
- `enterprise` : -1 credits, $0 (present en DB mais invisible cote frontend)

**Impact** : Un utilisateur qui paie via FedaPay recevra les credits/prix de la DB (50 credits a $8), pas ce qui est affiche ($7, 10 credits). Confiance client brisee.

**Correction** : Mettre a jour les enregistrements `subscription_plans` en base pour correspondre exactement au frontend (Populaire: 10 credits, $7, 3900 FCFA ; Business base: 24 credits, $17, 9900 FCFA).

### 1.2 Systeme de credits incoherent (1 affiche = 2 credits)

Le frontend affiche "1 affiche = 2 credits" mais la fonction `check_and_debit_credits` en base debite toujours selon la resolution : 1K=1 credit, 2K=2, 4K=4. Le hook `useSubscription.ts` a aussi `getCreditsNeeded` avec le meme calcul variable.

**Correction** : Mettre a jour `check_and_debit_credits` pour debiter systematiquement 2 credits par generation, et aligner `getCreditsNeeded` dans le hook.

### 1.3 Failles de securite RLS (3 politiques "true")

Tables `generated_images` et `generation_feedback` :
- `Anyone can delete generated images` : `USING (true)` -- N'importe qui peut supprimer n'importe quelle image
- `Anyone can insert generated images` : `WITH CHECK (true)` -- Insertion sans controle
- `Anyone can insert feedback` : `WITH CHECK (true)` -- Spam possible

**Correction** : Restreindre les politiques aux utilisateurs authentifies et a leurs propres donnees.

### 1.4 Webhook FedaPay non securise

Le webhook `fedapay-webhook` accepte n'importe quelle requete sans verification de signature. Un attaquant peut envoyer un faux webhook pour s'activer un abonnement gratuit.

**Correction** : Verifier la signature ou l'IP source de FedaPay, ou a defaut verifier le statut de la transaction directement aupres de l'API FedaPay avant d'activer l'abonnement.

### 1.5 Protection par mot de passe faible

La protection contre les mots de passe compromis est desactivee (alerte du linter). Les utilisateurs peuvent s'inscrire avec des mots de passe faibles ou deja fuites.

---

## 2. PROBLEMES FONCTIONNELS

### 2.1 Pas de reinitialisation de mot de passe

Il n'y a aucun lien "Mot de passe oublie" sur la page de connexion, et aucune page `/reset-password`. Les utilisateurs qui oublient leur mot de passe sont bloques.

**Correction** : Ajouter un lien "Mot de passe oublie" sur AuthPage et creer une page `/reset-password`.

### 2.2 Page 404 en anglais

La page NotFound affiche "Oops! Page not found" et "Return to Home" en anglais alors que toute la plateforme est en francais.

### 2.3 Pas de route catch-all pour le 404

Dans `App.tsx`, il manque `<Route path="*" element={<NotFound />} />` pour les routes inexistantes -- les utilisateurs verront une page blanche.

### 2.4 Aucun paiement reussi en base

Sur 14 transactions de paiement, 13 sont "failed" et 1 "pending". Aucune transaction "success" ou "completed". Le webhook attend le status "completed" pour declencher la commission d'affiliation (`record_referral_commission`), mais le webhook met le status a "success". Le trigger de commission ne se declenche donc jamais.

**Correction** : Aligner les statuts -- soit le webhook met "completed", soit le trigger reagit a "success".

### 2.5 Pas de nettoyage automatique du stockage temporaire

Les images uploadees dans `temp-images` ne sont jamais supprimees automatiquement. Le bucket va grossir indefiniment.

---

## 3. FONCTIONNALITES MANQUANTES POUR UN SAAS PRET A L'EMPLOI

### 3.1 Pas de page de mentions legales / CGU / politique de confidentialite

Obligatoire pour un service payant, surtout avec collecte de donnees personnelles.

### 3.2 Pas de systeme d'email transactionnel

Aucun email envoye aux utilisateurs apres :
- Confirmation de paiement
- Renouvellement d'abonnement
- Rappel d'expiration de credits
- Bienvenue apres inscription

### 3.3 Pas de gestion d'erreurs globale

Aucun Error Boundary React. Si un composant plante, toute l'application affiche une page blanche.

### 3.4 Pas de loading state sur les routes admin

Les pages admin ne verifient pas toutes les permissions avant affichage. Un utilisateur non-admin pourrait voir brievement le contenu.

### 3.5 Pas de support multi-langue

L'interface est en francais mais certains textes systeme sont en anglais (404, erreurs Supabase). Pas de systeme i18n si vous souhaitez etendre a d'autres marches.

### 3.6 Pas de mecanisme de retry pour les generations echouees

Si la generation IA echoue (timeout, erreur API), l'utilisateur perd ses credits sans resultat. Il n'y a pas de mecanisme de remboursement automatique.

### 3.7 Responsive mobile incomplet

Le fichier `AppPage.tsx` fait plus de 1000 lignes avec une interface complexe. Les tabs du compte (`AccountPage`) ne sont pas optimises pour petit ecran (4 onglets horizontaux).

---

## 4. PLAN DE CORRECTIONS PRIORITAIRE

### Phase 1 -- Critique (a faire immediatement)

1. **Migrer la base de donnees** pour aligner `subscription_plans` avec les tarifs affiches (Populaire: 10 credits/$7 ; Business base: 24 credits/$17)
2. **Mettre a jour `check_and_debit_credits`** : debiter 2 credits fixes par generation
3. **Corriger les RLS** sur `generated_images` et `generation_feedback` (restreindre insert/delete aux utilisateurs authentifies)
4. **Securiser le webhook FedaPay** (verification de la transaction cote serveur)
5. **Aligner le statut de paiement** pour que les commissions d'affiliation fonctionnent ("completed" partout)
6. **Ajouter la route 404 catch-all** et traduire la page en francais

### Phase 2 -- Important (semaine suivante)

7. **Ajouter "Mot de passe oublie"** + page `/reset-password`
8. **Ajouter un Error Boundary** global
9. **Activer la protection contre les mots de passe compromis**
10. **Mettre a jour `getCreditsNeeded`** dans `useSubscription.ts` pour retourner 2

### Phase 3 -- Ameliorations (a planifier)

11. Ajouter pages CGU / mentions legales
12. Mettre en place le nettoyage automatique de `temp-images` (lifecycle policy ou cron)
13. Mecanisme de remboursement automatique si generation echouee
14. Emails transactionnels (confirmation paiement, bienvenue)
15. Optimisation mobile de l'interface de generation

---

## Details techniques des corrections

### Migration SQL pour aligner les plans

```text
UPDATE subscription_plans SET
  name = 'Populaire', price_usd = 7, price_fcfa = 3900,
  credits_per_month = 10, max_resolution = '4K'
WHERE slug = 'pro';

UPDATE subscription_plans SET
  price_usd = 17, price_fcfa = 9900,
  credits_per_month = 24
WHERE slug = 'business';
```

### Correction check_and_debit_credits

Remplacer le calcul variable par `v_credits_needed := 2;` (fixe).

### Correction webhook -- statut de paiement

Changer `status: "success"` en `status: "completed"` dans `fedapay-webhook/index.ts`, ou modifier le trigger `record_referral_commission` pour reagir aussi sur `status = 'success'`.

### Route 404

Ajouter dans `App.tsx` avant la fermeture de `</Routes>` :
```text
<Route path="*" element={<NotFound />} />
```

### RLS corrections

```text
-- Remplacer les politiques "true" par des controles authentifies
DROP POLICY "Anyone can delete generated images" ON generated_images;
CREATE POLICY "Users can delete own images" ON generated_images
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY "Anyone can insert generated images" ON generated_images;
CREATE POLICY "Authenticated users can insert images" ON generated_images
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```
