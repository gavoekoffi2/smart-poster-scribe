
# Audit Approfondi - Administration Graphiste GPT

## Constat sur le probleme des "utilisateurs avec plans non payes"

Apres verification en base de donnees, **tous les utilisateurs sont bien sur le plan "Gratuit"**. Aucun utilisateur n'a de plan payant actif sans paiement -- toutes les transactions de paiement ont le statut "failed" ou "pending". Le probleme que vous voyez est probablement du a l'affichage dans la page AdminSubscriptions qui montre **tous les utilisateurs avec leur plan "Gratuit" et le statut "active"**, ce qui peut preter a confusion. Il faut ameliorer l'affichage pour distinguer clairement les plans gratuits des plans payants.

Cependant, 12 utilisateurs sur 32 n'ont **aucune subscription en base** (JOIN retourne NULL). Cela veut dire que ces utilisateurs se sont inscrits mais n'ont jamais genere d'image (la subscription est creee a la premiere generation). Ce n'est pas un bug mais merite un meilleur affichage admin.

---

## PROBLEMES IDENTIFIES DANS L'ADMINISTRATION

### 1. CRITIQUE - Page AdminSubscriptions a sa propre sidebar (doublon)

La page `AdminSubscriptions.tsx` (501 lignes) a **sa propre sidebar et navigation integrees** au lieu d'utiliser le composant `AdminLayout`. C'est un doublon de code et la navigation est incomplete (seulement 4 items vs 8 dans AdminLayout). Meme probleme pour `AdminTemplates.tsx`, `AdminFeedback.tsx`, `AdminDesigners.tsx`, `AdminShowcase.tsx`, et `AdminMarquee.tsx` qui ont chacun leur propre header/navigation au lieu d'utiliser AdminLayout.

**Resultat** : navigation inconsistante entre les pages admin, certaines n'affichent pas tous les liens.

**Correction** : Migrer toutes les pages admin pour utiliser `AdminLayout` comme wrapper, comme le fait deja `AdminDashboard`.

### 2. CRITIQUE - Page AdminRoles manquante (lien mort)

Le `AdminLayout` affiche un lien "Roles" vers `/admin/roles` avec la permission `manage_admins`, mais **aucune page AdminRoles n'existe**. La route n'est pas definie dans `App.tsx`. Un super_admin qui clique sur ce lien obtient une page 404.

**Correction** : Creer une page `AdminRoles.tsx` permettant de voir tous les utilisateurs, leur role actuel, et de leur assigner/retirer des roles. Ajouter la route dans `App.tsx`.

### 3. IMPORTANT - AdminSubscriptions : N+1 queries (performance catastrophique)

La page AdminSubscriptions fait une boucle `for` sur **chaque profil** pour charger sa subscription individuellement (lignes 129-155). Avec 32 utilisateurs, cela fait 33 requetes. Avec 1000 utilisateurs, ce sera inutilisable.

**Correction** : Remplacer par une seule requete jointe ou utiliser une vue SQL.

### 4. IMPORTANT - AdminSubscriptions n'affiche pas l'email des utilisateurs

L'email est remplace par un placeholder `user_id.substring(0, 8) + "..."` (ligne 148). L'admin ne peut pas identifier les utilisateurs par leur email.

**Correction** : Stocker l'email dans la table `profiles` via le trigger `handle_new_user`, ou le recuperer depuis `auth.users` via une fonction SECURITY DEFINER.

### 5. IMPORTANT - AdminSubscriptions : aucun filtre par type de plan

L'admin ne peut pas filtrer les utilisateurs par plan (gratuit vs payant), ni voir rapidement combien d'utilisateurs sont sur chaque plan. Il n'y a aucun compteur par plan.

**Correction** : Ajouter des filtres par plan et des compteurs statistiques (X gratuits, Y populaires, Z business).

### 6. IMPORTANT - AdminDashboard : pas de statistiques financieres

Le tableau de bord n'affiche aucune donnee financiere : pas de revenus totaux, pas de paiements recents, pas de transactions echouees. Un admin ne peut pas savoir combien la plateforme genere.

**Correction** : Ajouter des cartes pour : revenus total, revenus du mois, nombre d'abonnes payants, et une liste des transactions recentes.

### 7. IMPORTANT - Aucune page pour gerer les paiements/transactions

Il n'existe aucune page admin pour voir les transactions de paiement (completed, failed, pending). L'admin ne peut pas diagnostiquer les problemes de paiement ni voir l'historique.

**Correction** : Ajouter une section "Transactions" dans AdminSubscriptions ou une page dediee.

### 8. MOYEN - AdminDesigners n'utilise pas AdminLayout

La page designers a son propre header simple avec juste un bouton retour. Elle n'est pas integree dans la navigation complete de l'admin.

### 9. MOYEN - AdminShowcase ne verifie pas les permissions correctement

`AdminShowcase` utilise `isAdmin` directement au lieu de `hasPermission`. Un `content_manager` qui devrait pouvoir gerer le showcase ne peut pas y acceder. Meme probleme pour `AdminMarquee`.

### 10. MOYEN - Pas de pagination dans les listes admin

Les templates sont limites a 50, les images a 100, les feedbacks a 100. Il n'y a aucune pagination. Quand le nombre d'elements grandira, l'admin ne pourra pas naviguer.

### 11. MINEUR - AdminUploadPage : page utilitaire sans protection

La page `/admin/upload` est une page de migration one-shot qui n'a pas de verification de role et ne devrait probablement plus etre accessible en production.

---

## CORRECTIONS RESTANTES PLATEFORME GENERALE

### 12. IMPORTANT - Expiration d'abonnement non geree

Il n'y a aucun mecanisme pour verifier si un abonnement payant a expire sans renouvellement. Le trigger `reset_monthly_counters` renouvelle les credits automatiquement meme sans paiement. Un utilisateur qui paie un mois recoit des credits indefiniment.

**Correction** : Modifier la logique pour verifier si un paiement recent existe avant de renouveler. Ou ajouter un cron/function qui passe les abonnements expires en statut "expired" et les remet sur le plan gratuit.

### 13. MOYEN - partner_designers expose total_earnings publiquement

La RLS sur `partner_designers` permet a tous de voir les designers verifies, y compris le champ `total_earnings`. C'est une donnee financiere sensible.

**Correction** : Creer une vue publique sans le champ `total_earnings`.

---

## PLAN DE CORRECTIONS

### Phase 1 -- Administration (prioritaire)

1. **Migrer toutes les pages admin vers AdminLayout** : Refactorer AdminSubscriptions, AdminTemplates, AdminFeedback, AdminDesigners, AdminShowcase, AdminMarquee pour utiliser le wrapper AdminLayout au lieu de gerer leur propre navigation.

2. **Creer la page AdminRoles** : Page pour gerer les roles utilisateurs (voir, assigner, retirer). Ajouter la route `/admin/roles` dans App.tsx.

3. **Corriger AdminSubscriptions** :
   - Remplacer les N+1 queries par une seule requete jointe
   - Ajouter l'affichage de l'email (via une colonne email dans profiles, ajoutee via trigger)
   - Ajouter des filtres par plan et des compteurs statistiques
   - Ajouter une section pour voir les transactions de paiement
   - Distinguer clairement les plans gratuits des payants

4. **Ajouter des stats financieres au dashboard** : Revenus totaux, revenus du mois, nombre d'abonnes payants, transactions echouees.

5. **Corriger les permissions** dans AdminShowcase et AdminMarquee pour utiliser `hasPermission` au lieu de `isAdmin`.

### Phase 2 -- Securite et logique metier

6. **Creer une vue publique pour partner_designers** sans `total_earnings`.

7. **Gerer l'expiration des abonnements** : Ajouter une logique pour ne pas renouveler les credits automatiquement si aucun paiement n'a ete effectue.

### Phase 3 -- Ameliorations

8. Ajouter la pagination aux listes admin.
9. Supprimer ou proteger la page AdminUploadPage.

---

## Details techniques

### Migration vers AdminLayout (correction 1)

Chaque page admin sera simplifiee en retirant sa sidebar/header et en wrappant le contenu dans `<AdminLayout requiredPermission="xxx">`. Exemple pour AdminSubscriptions :

```text
// AVANT: 501 lignes avec sidebar integree
// APRES: ~250 lignes, juste le contenu
export default function AdminSubscriptions() {
  return (
    <AdminLayout requiredPermission="manage_users">
      {/* Juste le contenu, plus de sidebar */}
    </AdminLayout>
  );
}
```

### AdminRoles (correction 2)

Nouvelle page avec :
- Liste de tous les utilisateurs avec leur role actuel
- Bouton pour assigner un role (dropdown: user, designer, content_manager, admin)
- Super admin peut gerer admin et content_manager
- Admin peut gerer content_manager et designer
- Utilise les fonctions existantes `assignRole` et `removeRole` du hook `useAdmin`

### Optimisation queries AdminSubscriptions (correction 3)

Ajouter une colonne `email` a la table `profiles` via le trigger `handle_new_user`, puis faire une seule requete jointe :

```text
SELECT p.user_id, p.full_name, p.email,
  us.credits_remaining, us.free_generations_used, us.status, us.current_period_end,
  sp.name as plan_name, sp.slug as plan_slug
FROM profiles p
LEFT JOIN user_subscriptions us ON p.user_id = us.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY p.created_at DESC
```

### Stats financieres (correction 4)

Requetes a ajouter au dashboard :
- `SELECT SUM(amount_usd) FROM payment_transactions WHERE status = 'completed'` -- revenus totaux
- Meme requete avec filtre `created_at >= month_start` -- revenus du mois
- `SELECT COUNT(*) FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id WHERE sp.slug != 'free'` -- abonnes payants

### Vue publique designers (correction 6)

```text
CREATE VIEW public.partner_designers_public
WITH (security_invoker=on) AS
  SELECT id, display_name, bio, portfolio_url, templates_count, is_verified, created_at
  FROM public.partner_designers
  WHERE is_verified = true;
-- Exclut total_earnings et user_id
```
