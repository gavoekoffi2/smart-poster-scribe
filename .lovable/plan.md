## Objectif

Ajouter un **troisième bouton "Génération libre"** à l'étape boissons du parcours restaurant. Quand l'utilisateur clique dessus, l'IA génère elle-même une image de boisson cohérente avec les plats/l'affiche, sans demander d'upload.

## Étape concernée

Step `restaurant_beverages_check` — actuellement deux choix (Oui / Non) via `YesNoChoice`.

## Changements

### 1. `src/pages/AppPage.tsx`
- À l'étape `restaurant_beverages_check` uniquement, ne plus rendre `YesNoChoice` mais un bloc de **3 boutons** :
  - **Oui, j'ai des photos** → `handleUserMessage("oui")`
  - **Non, pas de boissons** → `handleUserMessage("non")`
  - **Génération libre (IA choisit)** → `handleUserMessage("génération libre")`
- Retirer `restaurant_beverages_check` de la condition `isYesNoStep` (ou court-circuiter avant) pour éviter le double rendu.

### 2. `src/types/generation.ts`
- Ajouter un champ optionnel `freeBeverageGeneration?: boolean` dans `restaurantInfo`.

### 3. `src/hooks/useConversation.ts`
- Dans le handler `restaurant_beverages_check` (~ligne 2636), détecter `content` contenant `"libre"` ou `"génération libre"` :
  - `hasBeverages: true`, `freeBeverageGeneration: true`, **pas** de passage à `restaurant_beverages_photos` — aller directement à `restaurant_dishes_check`.
- Dans la phase d'injection des images secondaires (~ligne 1241), si `freeBeverageGeneration === true` **et** aucune image utilisateur de boisson, **ne pas pousser d'image** mais ajouter une instruction texte au prompt (ex. dans la description enrichie) : « Génère librement une image de boisson photoréaliste cohérente avec les plats présentés sur l'affiche ». Pour rester minimal, on injecte cette instruction dans `secondaryImagesData` sans `imageUrl` n'est pas valide → on l'ajoute plutôt à `state.restaurantInfo.menuContent` ou via un champ de prompt déjà transmis. Le mécanisme exact (champ texte côté backend `generate-image`) sera choisi à l'implémentation en réutilisant la voie de prompt existante la plus proche.

## Hors scope
- Aucune modification du backend `generate-image` au-delà du passage de l'instruction texte via les canaux existants.
- Pas de changement pour les autres étapes Oui/Non (plats, etc.).