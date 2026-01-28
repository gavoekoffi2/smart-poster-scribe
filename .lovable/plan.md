
# Plan : Gestion Intelligente des Palettes de Couleurs et Sélection Automatique de Templates

## Objectif

Améliorer le système de génération pour :

1. **Respect ABSOLU de la palette utilisateur** : Les couleurs fournies par l'utilisateur remplacent TOUJOURS celles du template de référence, avec un agencement professionnel intelligent.

2. **Agencement professionnel des couleurs** : L'IA s'inspire des templates en base de données pour agencer harmonieusement les couleurs de l'utilisateur, même si elles ne se mélangent pas naturellement.

3. **Sélection automatique de template** : Quand l'utilisateur n'a pas de template de référence, le système sélectionne automatiquement le meilleur template correspondant au domaine et applique les couleurs de l'utilisateur.

4. **Respect des compétences graphiques** : Utiliser les 5 profils experts existants pour guider l'agencement des couleurs selon les règles professionnelles.

---

## Architecture de la Solution

### Fichiers à Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/generate-image/index.ts` | MODIFIER | Renforcer les instructions de remplacement des couleurs et ajouter une section "Color Harmonization" |
| `supabase/functions/generate-image/expertSkills.ts` | MODIFIER | Ajouter des règles d'agencement de couleurs par profil expert |
| `src/hooks/useConversation.ts` | MODIFIER | Améliorer le message buildPrompt() pour inclure des instructions d'harmonisation |

---

## Phase 1 : Renforcer les Instructions de Remplacement de Couleurs

### Modifications de `generate-image/index.ts` - buildProfessionalPrompt()

Ajouter une nouvelle section "HARMONISATION DES COULEURS" qui donne des instructions précises sur comment utiliser la palette utilisateur :

```text
╔═══════════════════════════════════════════════════════════════════════╗
║  🎨 HARMONISATION PROFESSIONNELLE DE LA PALETTE UTILISATEUR           ║
╚═══════════════════════════════════════════════════════════════════════╝

⚠️ RÈGLE ABSOLUE: Utiliser UNIQUEMENT les couleurs fournies par l'utilisateur.
   Les couleurs du template original doivent être TOTALEMENT REMPLACÉES.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTÈME D'ATTRIBUTION DES COULEURS (Règle 60-30-10):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • Couleur #1 (60%): DOMINANTE → Arrière-plan, grandes zones, fonds
   • Couleur #2 (30%): SECONDAIRE → Titres principaux, accents forts
   • Couleur #3 (10%): HIGHLIGHT → Détails, bordures, CTA, éléments clés
   • Couleurs supplémentaires: Dégradés, variations, effets subtils

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECHNIQUES D'HARMONISATION PROFESSIONNELLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✓ Si les couleurs sont similaires (même famille):
     → Créer des variations de saturation/luminosité pour différencier
     → Ajouter des dégradés subtils entre elles
   
   ✓ Si les couleurs sont contrastées (complémentaires):
     → Utiliser la plus sombre pour le fond
     → Réserver la plus vive pour les accents
     → Ajouter une couleur neutre (noir/blanc/gris) pour équilibrer
   
   ✓ Si les couleurs ne se mélangent pas naturellement:
     → Ajouter des effets de lumière (glow, reflets) pour unifier
     → Créer des dégradés doux entre les zones de couleur
     → Utiliser des ombres pour séparer visuellement les éléments
     → Ajouter une texture ou un overlay pour créer de la cohésion
   
   ✓ Pour garantir la lisibilité:
     → Texte clair sur fond foncé OU texte foncé sur fond clair
     → Contours/ombres sur le texte si le contraste est faible
     → Jamais de texte coloré sur fond de couleur proche

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ INTERDIT ABSOLUMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ❌ Garder UNE SEULE couleur du template original
   ❌ Mélanger les couleurs du template avec celles de l'utilisateur
   ❌ Ignorer une couleur fournie par l'utilisateur
   ❌ Créer un design où les couleurs sont mal agencées/illisibles
```

---

## Phase 2 : Enrichir les Profils Experts avec des Règles Colorimétriques

### Modifications de `expertSkills.ts`

Chaque profil expert existant (CORPORATE_MODERN, SURREALIST_PHOTOREALISTIC, SPIRITUAL_RELIGIOUS, RESTAURANT_FOOD, YOUTUBE_THUMBNAIL) sera enrichi avec une nouvelle propriété `colorHarmonization` qui donne des conseils spécifiques au domaine :

```typescript
colorHarmonization: [
  "Pour un domaine église/spirituel:",
  "- Couleur dominante: Arrière-plan avec overlay 40-60%",
  "- Couleur secondaire: Titres et bandeaux avec effets dorés si possible",
  "- Couleur tertiaire: Détails, rayons de lumière, highlights",
  "- Ajouter des effets de lumière divine pour unifier les couleurs",
  "- Les couleurs chaudes (or, orange) peuvent servir d'overlay pour harmoniser",
]
```

Ces règles seront injectées dans le prompt via la fonction `buildExpertSkillsPrompt()` existante.

---

## Phase 3 : Améliorer le Prompt de Génération (useConversation.ts)

### Modifications de `buildPrompt()`

Enrichir la section palette de couleurs avec des instructions plus détaillées sur comment utiliser chaque couleur :

```typescript
// ====== SECTION 1: PALETTE COULEUR OBLIGATOIRE ======
if (colorPalette?.length) {
  lines.push("╔══════════════════════════════════════════════════════════════╗");
  lines.push("║  🎨 PALETTE COULEUR OBLIGATOIRE - REMPLACEMENT TOTAL          ║");
  lines.push("╚══════════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push("🚨 REMPLACER TOUTES les couleurs du template par celles-ci:");
  lines.push("");
  
  colorPalette.slice(0, 6).forEach((hex, index) => {
    const colorName = hexToColorName(hex);
    if (index === 0) {
      lines.push(`   🎯 DOMINANTE (60%): ${hex} (${colorName})`);
      lines.push(`      → Utiliser pour: arrière-plan, grandes zones, fonds`);
    } else if (index === 1) {
      lines.push(`   🎯 SECONDAIRE (30%): ${hex} (${colorName})`);
      lines.push(`      → Utiliser pour: titres, accents, bandeaux importants`);
    } else if (index === 2) {
      lines.push(`   🎯 ACCENT (10%): ${hex} (${colorName})`);
      lines.push(`      → Utiliser pour: détails, CTA, bordures, highlights`);
    } else {
      lines.push(`   ➕ COMPLÉMENTAIRE #${index + 1}: ${hex} (${colorName})`);
      lines.push(`      → Utiliser pour: dégradés, effets, variations`);
    }
  });
  
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("⚠️ HARMONISATION INTELLIGENTE:");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("   • Créer des dégradés harmonieux entre ces couleurs");
  lines.push("   • Ajouter des effets (ombres, glow, reflets) pour unifier");
  lines.push("   • Utiliser la plus sombre pour le fond si besoin de contraste");
  lines.push("   • Garantir la lisibilité avec contrastes forts sur le texte");
  lines.push("");
  lines.push("❌ INTERDIT: Garder TOUTE couleur du template original");
  lines.push("❌ INTERDIT: Mélanger anciennes et nouvelles couleurs");
  lines.push("");
}
```

---

## Phase 4 : Sélection Automatique de Template avec Application de Palette

### Logique Existante (déjà implémentée mais à renforcer)

Le système sélectionne déjà un template automatiquement quand aucune référence n'est fournie (lignes 1037-1162 de generate-image/index.ts). Cette logique sera renforcée pour :

1. **Passer le domaine détecté au système de profils experts**
2. **Injecter les règles d'harmonisation spécifiques au domaine**
3. **Rappeler explicitement de remplacer les couleurs du template sélectionné**

```typescript
// Après la sélection du template (ligne ~1157)
if (referenceImage && colorPalette?.length > 0) {
  // Ajouter une note explicite que même pour le template auto-sélectionné,
  // les couleurs doivent être remplacées
  console.log(`Auto-selected template for domain "${picked.domain}". User palette will replace template colors.`);
}
```

---

## Résumé des Changements

| Fichier | Modifications |
|---------|---------------|
| `supabase/functions/generate-image/index.ts` | Ajouter section "HARMONISATION DES COULEURS" dans buildProfessionalPrompt() avec règles 60-30-10 et techniques d'harmonisation |
| `supabase/functions/generate-image/expertSkills.ts` | Ajouter propriété `colorHarmonization` à chaque profil expert avec conseils spécifiques au domaine |
| `src/hooks/useConversation.ts` | Améliorer buildPrompt() pour inclure des instructions détaillées sur l'utilisation de chaque couleur de la palette |

---

## Comportement Final Attendu

### Avec Template de Référence (Mode Clone)

1. L'utilisateur choisit un template (ex: affiche église avec couleurs dorées/violettes)
2. L'utilisateur sélectionne sa palette (ex: vert, orange, blanc)
3. Le système génère une affiche avec:
   - ✅ EXACTEMENT le même layout/design que le template
   - ✅ UNIQUEMENT les couleurs vert/orange/blanc de l'utilisateur
   - ✅ Agencement professionnel des couleurs (vert = fond, orange = accents, blanc = texte)
   - ✅ Effets pour harmoniser les couleurs si nécessaire
   - ❌ AUCUNE trace des couleurs originales (doré/violet)

### Sans Template de Référence (Mode Création Libre)

1. L'utilisateur décrit son besoin (ex: "affiche pour un concert gospel")
2. Le système détecte automatiquement le domaine (church/event)
3. Le système sélectionne un template approprié comme base structurelle
4. L'utilisateur sélectionne sa palette de couleurs
5. Le système génère une affiche avec:
   - ✅ Structure/layout inspiré du template sélectionné
   - ✅ UNIQUEMENT les couleurs de l'utilisateur
   - ✅ Profil expert "Spirituel/Religieux" appliqué pour les effets
   - ✅ Agencement professionnel des couleurs selon les règles du profil
   - ❌ AUCUNE information du template d'inspiration

### Règles d'Harmonisation Intelligentes

Le système appliquera automatiquement ces techniques :
- **Couleurs similaires** → Variations de saturation pour différencier
- **Couleurs contrastées** → Plus sombre pour le fond, plus vive pour les accents
- **Couleurs qui ne se mélangent pas** → Effets de lumière, dégradés doux, overlays
- **Garantie de lisibilité** → Contrastes forts, contours sur le texte si nécessaire
