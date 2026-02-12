

## Plan : Mise a jour des prix + Flux YouTube miniature specifique

### Partie 1 : Correction des prix sur la landing page

**Probleme** : Le composant `PricingSection.tsx` (page d'accueil) contient des prix codes en dur avec les anciens tarifs (9 900 FCFA pour Pro, 29 900 FCFA pour Business). La base de donnees a ete mise a jour (Pro: 5 000 FCFA / $8, Business: 15 000 FCFA / $25), mais la landing page n'a pas ete synchronisee.

**Solution** : Mettre a jour les prix hardcodes dans `src/components/landing/PricingSection.tsx` :

- **Free** : Reste a `0` mais afficher `$0 USD` + `(0 FCFA)` pour la coherence
- **Pro** : Changer de `9 900 FCFA` a `$8 USD/mois (5 000 FCFA)`
- **Business** : Changer de `29 900 FCFA` a `$25 USD/mois (15 000 FCFA)`
- Adapter le format d'affichage pour montrer le dollar en premier, FCFA entre parentheses (comme dans PlanCard.tsx)

**Fichier** : `src/components/landing/PricingSection.tsx` (lignes 9-67 : tableau `plans`)

---

### Partie 2 : Flux specifique YouTube (miniatures)

**Probleme actuel** : Apres les 4 questions YouTube (titre, photo, elements, texte), le flux enchaine sur les etapes classiques d'affiche : couleurs, logo, image de contenu, images secondaires, format. Or pour une miniature YouTube, demander un logo ou une image de contenu separee n'a pas de sens. L'utilisateur veut plutot :
- Fournir sa **photo principale** (ou laisser l'IA generer un visage)
- Ajouter des **images secondaires** (logos de plateformes, icones) avec instructions de positionnement
- Fournir une **miniature de reference** optionnelle
- Ne PAS se faire demander un logo d'entreprise classique

**Solution** : Creer un chemin alternatif pour YouTube dans le flux de conversation. Apres les questions YouTube, au lieu d'aller vers `reference > style_preferences > colors > logo > content_image > secondary_images > format`, le flux sera :

```text
Questions YouTube (4 questions existantes)
  |
  v
Reference (miniature de reference) -- deja en place
  |
  v
Colors (palette optionnelle) -- garder, utile
  |
  v
[SKIP LOGO pour YouTube] --> content_image (photo principale)
  |
  v
secondary_images (logos/icones avec instructions)
  |
  v
format (force 16:9 pour YouTube)
```

**Changements dans `src/hooks/useConversation.ts`** :

1. **`handleColorsConfirm` et `handleColorsSkip`** (lignes ~2863-2887) : Apres la selection des couleurs, si le domaine est `youtube`, sauter l'etape logo et aller directement a `content_image` avec un message adapte :
   - "Envoyez la **photo de la personne** qui sera sur la miniature, ou cliquez sur 'Generer automatiquement' pour que l'IA cree un visage expressif adapte a votre video."

2. **`handleSkipLogo`** (ligne ~2945) : Pas de changement necessaire car on saute cette etape pour YouTube.

3. **`handleContentImage`** (ligne ~2957) : Si YouTube, adapter le message pour les images secondaires :
   - "Photo principale ajoutee ! Ajoutez maintenant des **images secondaires** : logos de plateformes (YouTube, TikTok...), icones, ou tout element visuel a placer sur la miniature. Pour chaque image, vous pourrez indiquer ou et comment la positionner."

4. **`handleSkipContentImage`** (ligne ~2976) : Si YouTube, adapter le message :
   - "L'IA va generer un visage expressif adapte au theme de votre video. Ajoutez des images secondaires (logos, icones) si vous le souhaitez."

5. **Messages dans les etapes secondaires** : Adapter les labels quand le domaine est YouTube pour parler de "miniature" plutot que d'"affiche".

6. **Mode clone YouTube** (`buildYouTubeCloneIntroMessage`, ligne ~871) : Quand l'utilisateur clique "S'inspirer" sur une miniature YouTube, le message d'intro demandera specifiquement :
   - Le titre de la video
   - Les elements a remplacer sur la miniature de reference
   - La photo de la personne (ou generation IA)
   - Les logos/icones a ajouter

**Fichiers modifies** :
- `src/components/landing/PricingSection.tsx` : Mise a jour des prix
- `src/hooks/useConversation.ts` : Logique conditionnelle YouTube pour sauter le logo et adapter les messages

### Details techniques

Les modifications dans `useConversation.ts` sont ciblees et non destructives :
- Ajout de conditions `if (domain === "youtube")` dans 4 handlers existants
- Pas de nouveaux etats de conversation (on reutilise `content_image` et `secondary_images`)
- Le format 16:9 est deja force pour YouTube (ligne 1053)
- Les questions YouTube existantes dans `domainQuestions.ts` restent inchangees

