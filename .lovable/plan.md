

# Rapport d'Audit de Sécurité - Graphiste GPT

## Résumé exécutif

L'analyse automatisée et manuelle a révélé **2 vulnérabilités critiques**, **3 avertissements moyens** et **2 points d'attention mineurs**.

---

## CRITIQUE - Vulnérabilités à corriger immédiatement

### 1. Escalade de privilèges sur les abonnements (CRITICAL)

**Problème** : La table `user_subscriptions` permet aux utilisateurs authentifiés de s'INSERT et s'UPDATE leur propre abonnement sans restriction sur les colonnes `plan_id`, `credits_remaining`, `status`. Un utilisateur malveillant peut se donner un plan premium avec 99999 crédits via un simple appel API.

**Solution** :
- Supprimer les politiques INSERT et UPDATE utilisateur sur `user_subscriptions`
- Toutes les mutations passent exclusivement par les fonctions `SECURITY DEFINER` existantes (`get_or_create_user_subscription`, `check_and_debit_credits`, `admin_grant_subscription`) et les webhooks de paiement (service_role)
- Les utilisateurs conservent uniquement le droit SELECT sur leurs propres données

### 2. Images privées des utilisateurs publiquement lisibles (CRITICAL)

**Problème** : La politique SELECT sur `generated_images` est `USING (true)` - toutes les images, prompts, logos, palettes de couleurs de TOUS les utilisateurs sont visibles par n'importe qui, y compris les visiteurs non authentifiés. Cela expose les données business confidentielles des clients.

**Solution** :
- Remplacer par : les utilisateurs voient leurs propres images (`auth.uid() = user_id`), les images showcase sont publiques (`is_showcase = true`), les admins voient tout
- Corriger aussi la politique UPDATE qui permet à tout utilisateur authentifié de modifier les images où `user_id IS NULL`

---

## MOYEN - Avertissements à traiter

### 3. Protection contre les mots de passe compromis désactivée

**Problème** : La vérification des mots de passe contre les bases de données de fuites (HaveIBeenPwned) est désactivée.

**Solution** : Activer la protection via l'outil `configure_auth` avec `leaked_password_protection: enabled`.

### 4. Table `role_permissions` publiquement lisible

**Problème** : La politique SELECT `USING (true)` sur `role_permissions` expose toute la carte de permissions RBAC (25 entrées) à n'importe quel visiteur. Cela donne un plan détaillé du modèle d'autorisation à un attaquant.

**Solution** : Restreindre la lecture aux utilisateurs authentifiés ou aux admins uniquement.

### 5. Politique INSERT `WITH CHECK (true)` sur `contact_messages`

**Problème** : Tout le monde peut insérer des messages de contact, ce qui est voulu, mais sans rate-limiting un attaquant pourrait spammer la table.

**Solution** : Ajouter une validation de longueur côté Edge Function (déjà fait) et envisager un rate-limiting basique. Risque faible car la table n'est lisible que par les admins.

---

## MINEUR - Points d'attention

### 6. Webhook FedaPay sans vérification de signature

**Problème** : Contrairement au webhook Moneroo qui vérifie la signature HMAC, le webhook FedaPay se contente de vérifier le statut via l'API FedaPay. Si la clé API n'est pas configurée, le webhook continue quand même (ligne 78 : `catch → continue`).

**Solution** : Rendre la vérification FedaPay obligatoire (ne pas continuer si la vérification échoue).

### 7. Triggers de base de données manquants

**Problème** : Le scan indique "There are no triggers in the database", ce qui signifie que les triggers créés dans les migrations précédentes n'ont peut-être pas été appliqués. Les fonctions `handle_new_user`, `track_referral_signup`, `record_referral_commission`, `reset_monthly_counters` ne seraient pas déclenchées.

**Solution** : Recréer tous les triggers essentiels dans une nouvelle migration.

---

## Plan d'implémentation

### Migration SQL
1. **Supprimer** les politiques INSERT/UPDATE utilisateur sur `user_subscriptions`
2. **Remplacer** la politique SELECT `true` sur `generated_images` par une politique restrictive (propriétaire + showcase + admins)
3. **Corriger** la politique UPDATE sur `generated_images` (supprimer la branche `user_id IS NULL`)
4. **Restreindre** SELECT sur `role_permissions` aux admins
5. **Recréer** les 4 triggers essentiels

### Edge Function
6. Rendre la vérification FedaPay obligatoire (pas de fallback silencieux)

### Configuration Auth
7. Activer la protection contre les mots de passe compromis

### Fichiers concernés
- `supabase/migrations/` : nouvelle migration SQL (points 1-5, 7)
- `supabase/functions/fedapay-webhook/index.ts` : point 6
- Configuration auth : point 7

