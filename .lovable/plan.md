## Problème identifié

Quand l'utilisateur clique « Modifier » puis tape « rends plus professionnel » :

1. Le client envoie `referenceImage: generatedImage || referenceImageToSend` (useConversation.ts, ligne 1362).
2. **Si `generatedImage` est `null`** (cas qui se produit après un rechargement, ou si l'image générée n'a pas pu être lue), il bascule sur `referenceImageToSend` qui pointe vers le **template brut de la base** (`/reference-templates/...`) — donc sans aucune info client.
3. Le moteur d'amélioration reçoit ce template brut, applique la consigne « conserve identiquement tous les textes » et renvoie le template tel quel.

Résultat visible : une affiche template sans les informations de l'utilisateur, exactement ce que le rapport décrit.

En plus, le `modificationPrompt` envoyé à la fonction edge contient l'ENTIER `buildPrompt(state)` (toute la description initiale du brief), ce qui n'est jamais utilisé en mode modification (la branche `isModification` du edge function ignore `userPrompt`). Ça pollue les logs et embrouille les fallbacks.

## Plan de correction

### 1. `src/hooks/useConversation.ts` — `handleModificationRequest`

- **Bloquer** la modification si `generatedImage` est absent : afficher un message clair (« Je n'ai pas encore d'affiche générée à retravailler, relancez la génération ») au lieu de retomber sur le template brut.
- **Toujours** utiliser l'affiche générée comme référence (ne plus faire `generatedImage || referenceImageToSend`).
- Convertir systématiquement `generatedImage` en **base64** avant l'envoi (comme c'est déjà fait pour les templates), pour que les providers (OpenRouter, Gemini) reçoivent bien les pixels de l'affiche et pas seulement une URL Supabase qui peut être ignorée par certains modèles.
- Remplacer `modificationPrompt = originalPrompt` par un court prompt contextuel ciblé (le contenu sera ignoré côté edge en mode `isModification`, mais ça gardera les logs propres et évitera tout effet de bord sur les fallbacks).

### 2. `supabase/functions/generate-image/index.ts` — sécurité côté serveur

- En mode `isModification = true`, **forcer** le rejet si aucune `referenceImage` n'est fournie (retourner une erreur explicite plutôt que tomber dans un autre mode).
- Dans le bloc d'amélioration globale (lignes 567-604), renforcer la consigne anti-régression : ajouter une ligne explicite « INTERDIT de remplacer l'affiche fournie par un autre template ou un design générique. L'image jointe EST l'affiche du client, tu dois la retravailler ».
- Logger explicitement `isModification`, `hasReferenceImage`, et la taille de la référence reçue pour faciliter le debug futur.

### 3. Vérification

- Tester le flux : générer une affiche → cliquer « Modifier » → taper « rends plus professionnel » → vérifier que :
  - les logs montrent `Has reference image (raw): true` ET une taille > 100 KB (donc base64 de l'affiche, pas une URL),
  - le résultat conserve les infos client visibles sur l'affiche d'origine,
  - le rendu est visiblement retravaillé (typo, profondeur, contraste).

## Détails techniques

- Pas de changement de schéma BDD ni d'edge function nouvelle.
- Pas de changement sur la première génération (le flux initial reste intact, comme demandé).
- Pas de changement sur les boutons Mode rapide / Mode long déjà en place.
