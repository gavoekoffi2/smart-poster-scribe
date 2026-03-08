

# Renforcement du Prompt de Clonage de Référence

## Probleme

Le prompt actuel en mode clone (lignes 199-214 de `generate-image/index.ts`) est trop generique. Il dit "COPIE QUASI-IDENTIQUE" mais manque de directives precises pour forcer l'IA a vraiment reproduire le design exact et a appliquer une typographie designee (pas du texte plat).

Le prompt fait seulement 13 lignes courtes. Il ne mentionne pas les techniques specifiques de reproduction (couleurs exactes, positions, proportions, effets) ni les exigences de typographie stylee.

## Corrections

### 1. Renforcer le prompt clone dans `buildProfessionalPrompt` (lignes 199-214)

Remplacer le bloc clone par un prompt beaucoup plus directif qui :

- Insiste sur la **modification directe** de l'image de reference (pas une recreation)
- Specifie que le fond, les formes, les couleurs, les degrades, les textures doivent etre **reproduits pixel par pixel**
- Detaille les regles de **remplacement de texte** : meme position, meme taille relative, meme style d'effets
- Ajoute des regles de **typographie designee** : interdiction de texte plat, obligation d'effets (ombre portee epaisse, contour, 3D, degrade, glow, metallic) sur tous les textes
- Renforce la regle de **suppression intelligente** : si un element n'a pas d'equivalent dans les infos client, le supprimer et redistribuer l'espace (pas de zones vides)
- Ajoute des directives pour les cas specifiques (logo absent, photo absente, contacts absents)

### 2. Structure du nouveau prompt clone

```text
MISSION: Tu es un ÉDITEUR D'IMAGE. Tu reçois une affiche existante. Tu dois la MODIFIER DIRECTEMENT.
Tu ne crées PAS une nouvelle affiche. Tu ÉDITES l'image fournie.

DESIGN - INTOUCHABLE:
- Fond (couleurs, dégradés, textures, motifs) = IDENTIQUE
- Formes décoratives (courbes, vagues, cercles, bandeaux) = IDENTIQUES
- Mise en page et composition = IDENTIQUE
- Effets visuels (ombres, lumières, reflets, particules) = IDENTIQUES
- Couleurs et palette = IDENTIQUES

TEXTE - REMPLACEMENT STRICT:
- Remplace chaque texte par l'info correspondante du client
- MÊME position, MÊME taille relative, MÊME alignement
- MÊME style typographique (gras, italique, majuscules)
- OBLIGATOIRE: effets typographiques pro (ombre épaisse, contour, 3D, dégradé, glow, metallic)
- INTERDIT: texte plat, basique, sans effet, style secrétariat

SUPPRESSION INTELLIGENTE:
- Info absente = supprimer le texte ET les icônes/décorations associées
- Redistribuer l'espace restant naturellement
- ZÉRO zone vide, ZÉRO placeholder, ZÉRO info inventée

PHOTOS/LOGOS:
- Photo client fournie → remplacer à la MÊME position et taille
- Logo client fourni → remplacer à la MÊME position
- Pas de photo/logo fourni → SUPPRIMER proprement
```

### Fichier modifie

- `supabase/functions/generate-image/index.ts` : fonction `buildProfessionalPrompt`, bloc `isCloneMode` (lignes 199-214)

Le prompt reste condense (sous 4500 chars au total) pour respecter la limite API Kie AI.

