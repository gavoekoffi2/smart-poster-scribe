

# Phase 2 - Corrections des bugs fonctionnels

## 1. Formulaire de contact - envoi reel

Le formulaire dans `ContactSection.tsx` (ligne 48-49) simule l'envoi avec un `setTimeout`. Il faut creer une edge function `send-contact` qui envoie le message par email ou le stocke en base.

**Approche** : Creer une table `contact_messages` pour stocker les messages, puis notifier l'admin. Pas besoin d'email externe - les messages seront visibles dans le dashboard admin.

- Migration SQL : table `contact_messages` (name, email, message, created_at, is_read)
- Edge function `send-contact` : valide les inputs (zod), insere en base
- Modifier `ContactSection.tsx` : appeler la edge function au lieu du setTimeout
- Ajouter une page admin `AdminContact` pour consulter les messages recus

## 2. Bouton "Voir la demo" inactif

Dans `HeroSection.tsx` (ligne 85-92), le bouton n'a pas de `onClick`. 

**Approche** : Le faire scroller vers la section `ProcessSection` qui montre le processus en 3 etapes, ce qui sert de demo visuelle.

- Ajouter `onClick` qui scrolle vers `#process` (la section ProcessSection)
- Verifier que ProcessSection a bien un `id="process"`

## 3. Limite sur l'historique

Dans `useHistory.ts` (ligne 57), la requete n'a pas de `.limit()`, ce qui peut ramener des milliers d'images.

**Correction** : Ajouter `.limit(50)` a la requete pour limiter a 50 images les plus recentes.

## 4. Redirection account

La page `AccountPage.tsx` (ligne 96) redirige vers `/auth?redirect=/account` quand l'utilisateur n'est pas connecte. Il faut verifier que `AuthPage` gere bien le parametre `redirect` apres connexion.

- Verifier `AuthPage.tsx` pour le support du param `redirect`

## 5. Nettoyage automatique des images temporaires

Le bucket `temp-images` accumule des fichiers sans nettoyage.

**Approche** : Creer une edge function `cleanup-temp-images` qui supprime les fichiers de plus de 7 jours. Elle peut etre appelee manuellement ou via un cron (pg_cron n'est pas dispo, donc on met un bouton admin ou on documente l'appel periodique).

- Edge function `cleanup-temp-images` : liste et supprime les fichiers > 7 jours du bucket `temp-images`

## Fichiers concernes

- `supabase/migrations/` : nouvelle migration pour `contact_messages`
- `supabase/functions/send-contact/index.ts` : nouvelle edge function
- `supabase/functions/cleanup-temp-images/index.ts` : nouvelle edge function
- `src/components/landing/ContactSection.tsx` : appel reel au backend
- `src/components/landing/HeroSection.tsx` : onClick bouton demo
- `src/components/landing/ProcessSection.tsx` : verifier id="process"
- `src/hooks/useHistory.ts` : ajouter .limit(50)
- `src/pages/AuthPage.tsx` : verifier redirect param support

