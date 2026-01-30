
# Plan : Amélioration Radicale de la Qualité de Génération

## Problème Identifié

Le système actuel a deux faiblesses majeures :

### Mode Sans Référence (Création Libre)
- Les affiches générées sont trop basiques car l'IA ne "voit" pas les designs professionnels
- Le système sélectionne automatiquement un template en base, mais le prompt demande une "création libre" au lieu d'utiliser ce template comme modèle de design
- Les compétences expertes sont injectées en texte mais l'IA ne les applique pas visuellement car elle n'a pas de référence visuelle

### Mode Avec Référence (Clonage)
- Les instructions sont bonnes mais pas assez RADICALES
- Le prompt demande de "personnaliser" au lieu de dire "MODIFIER CETTE IMAGE EXACTE"
- L'IA recrée parfois une nouvelle affiche au lieu de modifier l'existante

---

## Solution Proposée

### 1. Modifier la logique en Mode Sans Référence

**Changement clé** : Quand aucune image de référence n'est fournie, le système sélectionne TOUJOURS un template correspondant au domaine (déjà fait) MAIS le prompt doit explicitement demander de CLONER ce template, pas de faire une création libre.

```
AVANT (problématique):
- Mode création libre → Injecte compétences expertes en texte
- L'IA génère de zéro → Résultat basique

APRÈS (solution):
- Mode création libre → Sélectionne template en base
- Le prompt dit "CLONE ce design et personnalise-le"
- L'IA reproduit le design professionnel → Résultat pro
```

### 2. Renforcer le Mode Avec Référence

**Changement clé** : Le prompt doit être encore plus explicite sur le fait qu'il s'agit d'une MODIFICATION d'image existante, pas une recréation.

```
NOUVEAU PROMPT (extrait):
"Tu reçois une AFFICHE EXISTANTE. Tu dois la MODIFIER, pas la recréer.
Garde EXACTEMENT:
- La mise en page (où sont les textes, les images, les zones)
- Le style graphique (effets, couleurs, typographie)
- Les éléments décoratifs

Change UNIQUEMENT:
- Les textes → par les textes de l'utilisateur
- Les couleurs → par la palette de l'utilisateur (si fournie)
- Les logos → par ceux de l'utilisateur (ou supprimer si non fournis)
- Les visages → par ceux de l'utilisateur (ou supprimer si non fournis)

RÉSULTAT = Même affiche, personnalisée pour ce client"
```

---

## Modifications Techniques

### Fichier 1 : `supabase/functions/generate-image/index.ts`

#### Modification A : Changer le mode "création libre" en mode "clonage intelligent"

Actuellement, quand `hasReferenceImage = false` au début, on passe en mode "création libre". Mais après la sélection automatique de template, on a maintenant une image de référence. Il faut traiter ce cas comme un CLONAGE.

Ajouter une variable `isAutoSelectedTemplate` pour savoir si le template a été auto-sélectionné :

```typescript
// Ligne ~1090-1215
let isAutoSelectedTemplate = false;

if (!referenceImage) {
  // ... sélection intelligente existante ...
  if (templateSelected) {
    isAutoSelectedTemplate = true;
    referenceImage = selectedTemplateUrl;
  }
}
```

Puis modifier `buildProfessionalPrompt` pour traiter le template auto-sélectionné comme un clonage :

```typescript
const professionalPrompt = buildProfessionalPrompt({
  userPrompt: prompt,
  hasReferenceImage: !!referenceImage,
  hasContentImage: !!contentImage,
  hasLogoImage: logoImages && logoImages.length > 0,
  aspectRatio,
  isCloneMode: isCloneMode || isAutoSelectedTemplate, // NOUVEAU
});
```

#### Modification B : Renforcer les instructions de clonage/modification

Remplacer la section "PERSONNALISATION FIDÈLE" par des instructions plus RADICALES :

```typescript
// Section Mode Clonage (lignes 323-492)
instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
instructions.push("║  ⚠️ MODE MODIFICATION D'IMAGE - RÈGLES STRICTES                       ║");
instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
instructions.push("");
instructions.push("🚨 MISSION: Tu reçois une AFFICHE EXISTANTE. Tu dois la MODIFIER.");
instructions.push("   Tu ne crées PAS une nouvelle affiche. Tu MODIFIES celle-ci.");
instructions.push("");
instructions.push("━━━ CE QUE TU GARDES INTACT (NE TOUCHE PAS) ━━━");
instructions.push("   ✓ La MISE EN PAGE exacte (positions de tous les éléments)");
instructions.push("   ✓ Le STYLE GRAPHIQUE (effets 3D, ombres, dégradés, textures)");
instructions.push("   ✓ La STRUCTURE (découpage des zones, proportions, marges)");
instructions.push("   ✓ Les ÉLÉMENTS DÉCORATIFS (formes, lignes, motifs, cadres)");
instructions.push("   ✓ Les EFFETS DE LUMIÈRE (halos, rayons, reflets, bokeh)");
instructions.push("");
instructions.push("━━━ CE QUE TU MODIFIES (REMPLACE OU SUPPRIME) ━━━");
instructions.push("   ➤ TEXTES: Efface les textes originaux → Place les textes de l'utilisateur");
instructions.push("   ➤ COULEURS: Si palette fournie → Remplace TOUTES les couleurs");
instructions.push("   ➤ LOGOS: Efface les logos originaux → Place ceux de l'utilisateur (ou zone vide)");
instructions.push("   ➤ VISAGES: Efface les visages originaux → Place ceux de l'utilisateur (ou supprime la zone)");
instructions.push("   ➤ CONTACTS: Efface tous les numéros/emails originaux → Place ceux de l'utilisateur uniquement");
instructions.push("");
instructions.push("🎯 RÉSULTAT ATTENDU:");
instructions.push("   L'affiche finale = La MÊME affiche visuellement, mais avec le contenu du client.");
instructions.push("   Un observateur doit voir le MÊME design, juste personnalisé.");
```

### Fichier 2 : `supabase/functions/generate-image/expertSkills.ts`

Ajouter une nouvelle section dans les profils experts pour le "style de référence" - c'est-à-dire des exemples visuels descriptifs des meilleurs templates de chaque domaine pour que l'IA comprenne le niveau de qualité attendu.

Ajouter un champ `referenceStyleGuide` à chaque profil :

```typescript
interface ExpertSkillProfile {
  // ... champs existants ...
  referenceStyleGuide: string[]; // NOUVEAU
}

const SPIRITUAL_RELIGIOUS: ExpertSkillProfile = {
  // ... autres champs ...
  referenceStyleGuide: [
    "Style visuel des meilleures affiches d'église africaines:",
    "- Fond sombre avec overlay bleu/violet (40-60% opacité)",
    "- Portrait du prédicateur tiers droit, avec rim light doré",
    "- Titre principal en 3D avec effet or métallique et glow",
    "- Rayons de lumière divine descendant d'en haut à gauche",
    "- Silhouettes floues de fidèles mains levées en arrière-plan",
    "- Bannière 3D texturée (effet satin) pour les dates",
    "- Particules dorées flottantes créant une atmosphère céleste",
    "Exemple: 'Grande Croisade de Miracles' avec Bishop en costume blanc,",
    "fond bleu nuit avec étoiles, titre doré 3D avec glow, infos dans",
    "un bandeau rouge en bas avec icônes de réseaux sociaux.",
  ],
};
```

---

## Résumé des Changements

| Aspect | Avant | Après |
|--------|-------|-------|
| Mode sans référence | Création libre → Basique | Clone template auto-sélectionné → Pro |
| Template auto-sélectionné | Traité comme "sans référence" | Traité comme mode CLONE |
| Instructions de clonage | "Personnalise le design" | "MODIFIE cette image exacte" |
| Profils experts | Règles abstraites | + Guide de style visuel concret |
| Vocabulaire du prompt | "Reproduire", "S'inspirer" | "Modifier", "Garder intact", "Remplacer" |

---

## Impact Attendu

### Pour les utilisateurs sans référence :
- L'IA reçoit toujours un template professionnel de la base
- Le prompt lui demande de CLONER ce template
- Résultat : Design professionnel garanti, niveau graphiste

### Pour les utilisateurs avec référence :
- Instructions plus RADICALES et EXPLICITES
- L'IA comprend qu'elle doit MODIFIER, pas recréer
- Résultat : L'affiche de référence exacte, juste personnalisée

---

## Détails Techniques

### Fichiers à modifier :
1. `supabase/functions/generate-image/index.ts` - Logique de sélection et prompt principal
2. `supabase/functions/generate-image/expertSkills.ts` - Ajout des guides de style visuels

### Nombre de lignes estimé :
- ~50 lignes modifiées dans index.ts
- ~100 lignes ajoutées dans expertSkills.ts

### Risques :
- Aucun changement de structure de données
- Pas d'impact sur l'authentification ou les crédits
- Rétro-compatible avec l'existant
