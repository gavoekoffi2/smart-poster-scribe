## Problèmes identifiés

**1. « Améliorer » ne change pas vraiment le design**
Aujourd'hui (lignes 567-606 de `supabase/functions/generate-image/index.ts`), le mode amélioration force le modèle à **garder l'identité visuelle, la palette et la structure** de l'affiche source. Résultat : on reconnaît "la même affiche en mieux", alors que le client voudrait un **design carrément différent** avec ses infos.

**2. Icônes du template hors contexte**
En mode clone (règle #5, ligne 695-698), la consigne sur les icônes est trop molle : « conserver les icônes décoratives cohérentes… remplacer si hors contexte ». Le modèle ne détecte pas qu'un logo Photoshop n'a rien à faire sur une affiche de comptabilité. Idem pour les logos partenaires/illustrations spécifiques au template d'origine.

## Plan de correction

### 1. Mode amélioration : refonte complète du design (`buildProfessionalPrompt`, branche `isEnhancementRequest`)

Réécrire la branche (A) pour passer d'un mode "retouche pro" à un mode **"redesign complet à partir des infos client"** :

- Nouveau cadrage : « L'image jointe sert UNIQUEMENT de source d'informations (textes, noms, dates, prix, contacts, logos, photos). Tu dois créer une **NOUVELLE affiche au design totalement différent**. »
- Consignes explicites :
  - Changer la mise en page, la palette, la typo, les formes, le style général.
  - Conserver **uniquement** les informations textuelles et visuelles du client (extraites de l'image jointe), mot pour mot pour les textes.
  - Si une photo client/logo client est identifiable, la réutiliser ; sinon générer un nouveau visuel cohérent avec le contexte détecté.
  - Garder le **format** (aspect ratio) et la **langue** identiques.
- Réutiliser les standards premium déjà présents dans le mode libre (typographie premium, 5 couches, hiérarchie dramatique) en appelant `buildExpertSkillsPrompt(detectedDomain)`, `getRandomTypographyStyle()`, `getRandomLayoutStyle()` pour garantir une vraie variation entre deux améliorations successives.
- Maintien strict de l'anti-hallucination texte (mot pour mot, pas d'invention de date/prix/contact).

### 2. Mode clone : adaptation contextuelle stricte des icônes/logos/illustrations (règle #5)

Remplacer la règle #5 actuelle par une règle beaucoup plus exigeante :

- **Détecter le contexte métier** de l'affiche cible à partir du `userPrompt` (déjà fait via `detectDomainFromPrompt`).
- **Supprimer obligatoirement** toute icône, logo de marque tierce (ex : Photoshop, Illustrator, Figma, marques de produits), illustration ou symbole décoratif du template d'origine qui **n'appartient pas au domaine** de l'affiche cible.
- **Remplacer** par des icônes / symboles / illustrations cohérents avec le domaine détecté (ex : comptabilité → calculatrice, graphiques, pièces, balance ; restauration → couverts, plats ; santé → croix médicale, stéthoscope). Même style graphique, même taille, même emplacement que l'élément remplacé.
- Si aucun équivalent pertinent → supprimer proprement et reconstruire le fond local.
- Ajouter des exemples concrets dans le prompt pour ancrer la règle (ex : « Si tu vois un logo Photoshop / Adobe / une marque sans rapport → SUPPRIMER et remplacer par une icône du domaine `<domaine>` »).
- Renforcer également la directive sur les **logos partenaires fictifs** présents sur les templates : à supprimer sauf si le client a fourni explicitement des logos partenaires.

### 3. Vérification

- Générer une affiche, cliquer « Modifier » → « rends plus pro » : vérifier que le design est **visiblement différent** (palette, layout) tout en conservant tous les textes/infos client.
- Générer une affiche de comptabilité à partir d'un template contenant un logo type Photoshop : vérifier que ce logo a été **remplacé ou supprimé**, et qu'une icône/symbole en lien avec la comptabilité prend sa place.

## Détails techniques

- Fichier modifié : `supabase/functions/generate-image/index.ts` uniquement.
- Pas de migration BDD, pas de changement client, pas de nouvelle edge function.
- Branche modification chirurgicale (B) **inchangée** : les corrections ciblées (changer un texte, une couleur) gardent le comportement strict actuel.
- Le mode libre (C) reste inchangé.
