
# Plan : Analyse Intelligente et Personnalisation Complète des Affiches de Référence

## Objectif

Améliorer le système pour que lors du clonage d'une affiche (mode "S'inspirer" ou sélection automatique de template) :

1. **Analyse exhaustive** : L'IA analyse TOUS les éléments de l'affiche de référence (textes, logos, personnes, icônes, etc.)
2. **Comparaison avec les données utilisateur** : Identifier les éléments manquants par rapport au template
3. **Questions intelligentes** : Demander à l'utilisateur s'il veut fournir ces éléments, les générer, ou les supprimer
4. **Upload multiple** : Permettre l'upload de plusieurs images si le template en contient plusieurs
5. **Génération automatique optionnelle** : Proposer de générer des images (personnes, produits) si l'utilisateur n'en a pas
6. **Règle zéro information originale** : Ne jamais garder d'élément du template qui n'a pas été remplacé par l'utilisateur

---

## Architecture de la Solution

### Fichiers à Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/analyze-template/index.ts` | MODIFIER | Enrichir l'analyse pour détecter précisément chaque élément et proposer des questions adaptées |
| `src/hooks/useConversation.ts` | MODIFIER | Améliorer le flux de clonage pour comparer données utilisateur vs template et poser des questions ciblées |
| `src/types/generation.ts` | MODIFIER | Ajouter les types pour les éléments détectés et les options de remplacement |
| `supabase/functions/generate-image/index.ts` | MODIFIER | Renforcer les instructions de suppression des éléments non fournis |

---

## Phase 1 : Améliorer l'Analyse du Template

### Modifications de `analyze-template/index.ts`

Enrichir le prompt d'analyse pour détecter avec précision :

**Éléments à détecter avec comptage précis :**
- Nombre exact de personnes/visages
- Nombre de logos
- Nombre de zones de texte (titre, sous-titre, dates, contacts, etc.)
- Icônes de réseaux sociaux
- Images de produits
- Éléments décoratifs (à conserver)

**Nouveau format de sortie JSON :**
```json
{
  "detectedElements": {
    "peopleCount": 3,
    "peopleDescriptions": ["homme en costume", "femme avec micro", "homme âgé"],
    "logoCount": 2,
    "logoPositions": ["haut-gauche", "bas-droite"],
    "hasPhoneNumber": true,
    "hasEmail": true,
    "hasAddress": true,
    "hasDate": true,
    "hasTime": true,
    "hasPrice": true,
    "hasSocialIcons": true,
    "socialPlatforms": ["Facebook", "Instagram", "WhatsApp"],
    "productCount": 0,
    "textZones": [
      {"type": "title", "content": "Grande Veillée de Prière"},
      {"type": "subtitle", "content": "Avec Pasteur..."},
      {"type": "date", "content": "15 Mars 2025"},
      {"type": "contact", "content": "+225 07 00 00 00"}
    ]
  },
  "requiredQuestions": [
    {
      "id": "people_photos",
      "question": "J'ai détecté 3 personnes sur cette affiche. Voulez-vous :\n1. Fournir vos propres photos\n2. Que je génère automatiquement des personnes\n3. Créer l'affiche sans personnes",
      "type": "choice",
      "options": ["Fournir mes photos", "Générer automatiquement", "Sans personnes"],
      "allowMultipleImages": true,
      "maxImages": 3
    }
  ]
}
```

---

## Phase 2 : Améliorer le Flux Conversationnel de Clonage

### Modifications de `useConversation.ts`

**Nouvelle logique après analyse du template :**

1. **Construire un message d'introduction détaillé** qui liste TOUS les éléments détectés
2. **Comparer avec les données fournies** après la première réponse de l'utilisateur
3. **Poser des questions ciblées** pour les éléments manquants

**Pseudo-code du nouveau flux :**
```typescript
// Après analyse du template
const buildEnhancedCloneIntroMessage = (analysis: TemplateAnalysis): string => {
  let message = "🎨 **J'ai analysé cette affiche en détail !**\n\n";
  
  message += "📋 **Éléments détectés à remplacer :**\n";
  
  if (analysis.peopleCount > 0) {
    message += `• ${analysis.peopleCount} personne(s) : ${analysis.peopleDescriptions.join(", ")}\n`;
  }
  if (analysis.logoCount > 0) {
    message += `• ${analysis.logoCount} logo(s)\n`;
  }
  if (analysis.hasPhoneNumber) message += "• Numéro de téléphone\n";
  if (analysis.hasEmail) message += "• Adresse email\n";
  if (analysis.hasAddress) message += "• Lieu/Adresse\n";
  if (analysis.hasDate) message += "• Date\n";
  if (analysis.hasPrice) message += "• Prix/Tarifs\n";
  
  message += "\n📝 **Donnez-moi VOS informations pour personnaliser cette affiche.**\n";
  message += "💡 **Important** : Tout ce que vous ne fournissez pas sera supprimé de l'affiche finale.";
  
  return message;
};

// Après la première réponse utilisateur - Comparer et demander les manquants
const analyzeUserInputVsTemplate = (
  userInput: ExtractedInfo, 
  templateAnalysis: TemplateAnalysis
): MissingElements[] => {
  const missing: MissingElements[] = [];
  
  // Vérifier les personnes
  if (templateAnalysis.peopleCount > 0) {
    // L'utilisateur n'a pas fourni de photos
    missing.push({
      type: "people",
      templateCount: templateAnalysis.peopleCount,
      userCount: 0,
      question: `L'affiche modèle contient ${templateAnalysis.peopleCount} personne(s). Souhaitez-vous :\n• Envoyer vos photos (vous pouvez en envoyer jusqu'à ${templateAnalysis.peopleCount})\n• Que je génère automatiquement des personnes africaines\n• Continuer sans personnes (je supprimerai cet espace)`,
      options: ["upload", "generate", "skip"]
    });
  }
  
  // Vérifier les logos
  if (templateAnalysis.logoCount > 0 && !userInput.hasLogo) {
    missing.push({
      type: "logos",
      templateCount: templateAnalysis.logoCount,
      question: `L'affiche contient ${templateAnalysis.logoCount} logo(s). Voulez-vous ajouter votre logo ?`,
      options: ["upload", "skip"]
    });
  }
  
  return missing;
};
```

---

## Phase 3 : Ajouter les Types Nécessaires

### Modifications de `types/generation.ts`

```typescript
// Nouveau type pour les éléments détectés dans un template
export interface TemplateAnalysisDetail {
  peopleCount: number;
  peopleDescriptions: string[];
  logoCount: number;
  logoPositions: string[];
  hasPhoneNumber: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  hasDate: boolean;
  hasTime: boolean;
  hasPrice: boolean;
  hasSocialIcons: boolean;
  socialPlatforms: string[];
  productCount: number;
  textZones: {
    type: string;
    content: string;
  }[];
}

// Type pour les éléments manquants
export interface MissingElement {
  type: "people" | "logos" | "products" | "text";
  templateCount: number;
  userProvided: number;
  question: string;
  options: ("upload" | "generate" | "skip")[];
  allowMultipleImages: boolean;
  maxImages: number;
}

// Enrichir ConversationState
export interface ConversationState {
  // ... existing fields ...
  templateAnalysis?: TemplateAnalysisDetail;
  missingElements?: MissingElement[];
  currentMissingElementIndex?: number;
  collectedReplacements?: {
    people?: { images: string[]; generated: boolean };
    logos?: { images: string[]; positions: string[] };
    products?: { images: string[] };
  };
}
```

---

## Phase 4 : Renforcer les Instructions de Génération

### Modifications de `generate-image/index.ts`

Ajouter une section explicite sur les éléments collectés vs manquants :

```typescript
// Dans buildProfessionalPrompt()
if (isCloneMode && templateAnalysis) {
  instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
  instructions.push("║  📊 RAPPORT DE REMPLACEMENT DES ÉLÉMENTS                              ║");
  instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
  instructions.push("");
  
  // PERSONNES
  if (templateAnalysis.peopleCount > 0) {
    if (collectedReplacements.people?.images?.length > 0) {
      instructions.push(`✅ PERSONNES: ${collectedReplacements.people.images.length} photo(s) fournie(s) par l'utilisateur → UTILISER CES PHOTOS`);
    } else if (collectedReplacements.people?.generated) {
      instructions.push(`✅ PERSONNES: Générer ${templateAnalysis.peopleCount} personne(s) africaine(s) NOUVELLES (pas celles du template)`);
    } else {
      instructions.push(`❌ PERSONNES: L'utilisateur n'a pas fourni de photos → SUPPRIMER les ${templateAnalysis.peopleCount} personne(s) du template`);
    }
  }
  
  // LOGOS
  if (templateAnalysis.logoCount > 0) {
    if (collectedReplacements.logos?.images?.length > 0) {
      instructions.push(`✅ LOGOS: ${collectedReplacements.logos.images.length} logo(s) fourni(s) → UTILISER CES LOGOS aux positions ${collectedReplacements.logos.positions.join(", ")}`);
    } else {
      instructions.push(`❌ LOGOS: Aucun logo fourni → SUPPRIMER tous les logos du template (${templateAnalysis.logoCount})`);
    }
  }
  
  instructions.push("");
  instructions.push("🚨 RAPPEL CRITIQUE: Tout élément non marqué ✅ ci-dessus DOIT être SUPPRIMÉ.");
}
```

---

## Phase 5 : Gérer l'Upload Multiple d'Images

### Modifications dans `useConversation.ts` - handleImageUpload()

```typescript
// Permettre l'upload de plusieurs images pour les personnes/produits
const handleMultipleImageUpload = async (
  images: string[],
  elementType: "people" | "products" | "logos"
) => {
  const currentState = conversationStateRef.current;
  const currentMissing = currentState.missingElements?.[currentState.currentMissingElementIndex || 0];
  
  if (!currentMissing) return;
  
  // Stocker les images collectées
  setConversationState(prev => ({
    ...prev,
    collectedReplacements: {
      ...prev.collectedReplacements,
      [elementType]: {
        images: images,
        generated: false
      }
    }
  }));
  
  // Passer à l'élément manquant suivant ou continuer le flux
  const nextIndex = (currentState.currentMissingElementIndex || 0) + 1;
  if (nextIndex < (currentState.missingElements?.length || 0)) {
    // Poser la question suivante
    const nextMissing = currentState.missingElements![nextIndex];
    setConversationState(prev => ({
      ...prev,
      currentMissingElementIndex: nextIndex
    }));
    addMessage("assistant", nextMissing.question);
  } else {
    // Tous les éléments manquants ont été traités → passer aux couleurs
    setConversationState(prev => ({
      ...prev,
      step: "colors"
    }));
    addMessage("assistant", "Parfait ! 🎨 Choisissez maintenant une palette de couleurs pour personnaliser votre affiche :");
  }
};
```

---

## Résumé des Comportements Finaux

### Scénario 1 : L'utilisateur clique sur "S'inspirer" d'une affiche avec 3 personnes

1. **Analyse** → Détecte 3 personnes, 1 logo, date, lieu, contact
2. **Message** → "J'ai détecté 3 personnes, 1 logo, une date, un lieu et un contact sur cette affiche..."
3. **L'utilisateur donne ses infos** (titre, date, contact)
4. **Comparaison** → Il manque les photos des personnes et le logo
5. **Question 1** → "L'affiche contient 3 personnes. Voulez-vous : fournir vos photos / générer automatiquement / continuer sans personnes ?"
6. **Si "générer"** → Le système note qu'il doit générer 3 personnes africaines NOUVELLES
7. **Si "sans personnes"** → Le système note qu'il doit SUPPRIMER cette zone
8. **Question 2** → "Voulez-vous ajouter votre logo ?"
9. **Si "non"** → Le logo du template sera SUPPRIMÉ

### Scénario 2 : L'utilisateur demande une affiche sans fournir de template (création libre)

1. **Sélection automatique** → Le système choisit un template en base correspondant au domaine
2. **Même flux qu'au-dessus** → Analyse, comparaison, questions sur les éléments manquants
3. **Génération** → Utilise le DESIGN du template mais UNIQUEMENT les données de l'utilisateur

### Règle Absolue Appliquée

**TOUT élément du template original qui n'a pas de remplacement fourni par l'utilisateur sera SUPPRIMÉ ou remplacé par une génération IA si l'utilisateur l'a demandé.**
