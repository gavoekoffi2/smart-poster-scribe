

## Plan : Variete typographique + Flux evenements optimise + Flux YouTube simplifie

### Partie 1 : Variete typographique en mode libre

**Probleme** : En mode libre (sans reference), le prompt injecte toujours la meme directive "effets 3D/metallique/degrade/relief" pour la typographie, ce qui donne des affiches au look repetitif.

**Solution** : Creer un systeme de styles typographiques varies dans `expertSkills.ts` et en selectionner un aleatoirement a chaque generation.

**Fichier** : `supabase/functions/generate-image/expertSkills.ts`
- Ajouter un tableau de 8-10 styles typographiques distincts (ex: 3D metallique, neon lumineux, retro vintage, calligraphie elegante, grunge texturise, degrade multicolore, ombre longue flat, brush/peinture, gravure classique, futuriste holographique)
- Exporter une fonction `getRandomTypographyStyle()` qui retourne un style aleatoire
- Chaque style = une instruction courte (~60 chars) decrivant le rendu typographique

**Fichier** : `supabase/functions/generate-image/index.ts`
- Dans `buildProfessionalPrompt` (mode libre, ligne ~222), remplacer la ligne statique "TYPO DESIGNEE: Titre avec effets 3D/metallique/degrade/relief..." par un appel a `getRandomTypographyStyle()` pour varier le rendu a chaque generation

---

### Partie 2 : Flux evenements - content_image optionnel apres orateurs

**Probleme** : Pour les domaines a orateurs (church, event, music, formation, education), apres avoir collecte l'orateur principal + invites, le flux enchaine sur reference > colors > logo > content_image. Or les orateurs SONT deja les images de contenu, donc demander une "image de contenu" en plus est redondant.

**Solution** : Quand le domaine est dans `SPEAKER_DOMAINS` et que des orateurs/invites ont ete fournis, rendre l'etape `content_image` optionnelle avec un message adapte.

**Fichier** : `src/hooks/useConversation.ts`

1. **`handleSkipLogo` (ligne ~2976)** : Si le domaine est un `SPEAKER_DOMAIN` ET que `mainSpeaker` ou `guests` existent, adapter le message :
   - "Vous avez deja fourni les photos des orateurs/intervenants. Souhaitez-vous ajouter une **image supplementaire** (produit, lieu, decoration) ? Sinon, cliquez sur 'Passer'."
   - Cela rend l'etape clairement optionnelle

2. **`handleSkipContentImage` (ligne ~3012)** : Le comportement existant (passer aux images secondaires) reste correct, pas de changement necessaire.

3. **Aussi dans `handleColorsConfirm`/`handleColorsSkip`** : Meme adaptation quand on passe a l'etape logo - si SPEAKER_DOMAIN avec orateurs fournis, adapter le message content_image.

---

### Partie 3 : Flux YouTube simplifie

**Probleme** : Le flux YouTube demande encore des etapes inutiles pour une miniature. Une fois les 4 questions YouTube repondues, il devrait aller directement a la photo principale + images secondaires, sans passer par les etapes classiques d'affiche.

**Etat actuel** : Le skip du logo pour YouTube est deja en place (handleColorsConfirm/Skip). Mais le flux passe encore par reference > style_preferences > colors avant d'arriver a content_image.

**Solution** : Pas de changement structurel majeur necessaire ici - le flux YouTube existant fonctionne deja (les 4 questions YouTube > reference > colors > skip logo > content_image > secondary_images). Le skip du logo est deja implemente. Verifier que le flux est coherent et que les messages sont adaptes au contexte "miniature".

Verification rapide dans le code : le flux YouTube saute bien le logo apres les couleurs (lignes 2874 et 2901). Les messages pour content_image et secondary_images sont deja adaptes pour YouTube (lignes 2880, 3002-3003, 3024-3027). Ce point est donc deja couvert.

---

### Details techniques

**Fichiers modifies** :
- `supabase/functions/generate-image/expertSkills.ts` : Ajout du tableau de styles typographiques + fonction `getRandomTypographyStyle()`
- `supabase/functions/generate-image/index.ts` : Utilisation du style aleatoire dans le mode libre
- `src/hooks/useConversation.ts` : Adaptation du message content_image pour les domaines a orateurs (3-4 lignes de condition)

**Impact** :
- Zero changement dans la structure des etapes de conversation
- Zero nouveau state
- Les modifications sont purement au niveau des messages affiches et du prompt envoye a l'API
- Redeploy de la edge function `generate-image` necessaire

