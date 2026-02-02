

# Plan : Détection des Objets/Icônes Hors Contexte et Renforcement des Layouts

## Problèmes Identifiés

L'utilisateur a relevé deux problèmes persistants :

### 1. Objets/Icônes Hors Contexte Non Supprimés
- Quand un utilisateur utilise un template d'un domaine différent, les **objets et icônes** spécifiques à ce domaine restent sur l'affiche finale
- Exemples : icônes de formation (diplôme, livre) sur une affiche de service, icônes d'église (croix, bible) sur une affiche restaurant
- La détection actuelle (`detectContextMismatch`) ne gère que les **zones de texte**, pas les éléments visuels

### 2. Layouts Vides Persistants
- Malgré les instructions existantes, certains bandeaux restent visibles mais vides
- L'adaptation du layout ne fonctionne pas assez bien quand des zones sont supprimées

---

## Solution en 3 Volets

### Volet 1 : Extraction des Objets/Icônes dans l'Analyse

Modifier `analyze-template/index.ts` pour extraire les objets et icônes détectés sur le template :
- Icônes de réseaux sociaux
- Symboles spécifiques au domaine (croix, bible, diplôme, fourchette, etc.)
- Éléments décoratifs contextuels (billets, téléphones, voitures pour YouTube)

### Volet 2 : Étendre la Détection d'Incohérence aux Objets

Modifier `contextDetection.ts` pour inclure une matrice de pertinence **Objet/Icône ↔ Domaine** :
- Exemples : "croix" → church uniquement, "diplôme" → formation/education, "fourchette" → restaurant

Si des objets détectés ne correspondent pas au domaine de l'utilisateur, les signaler et proposer leur suppression.

### Volet 3 : Instructions de Layout Plus Strictes

Renforcer les instructions dans `generate-image/index.ts` avec une section dédiée aux objets hors contexte et une politique "Zéro Espace Vide" plus explicite.

---

## Modifications Techniques

### Fichier 1 : `supabase/functions/analyze-template/index.ts`

**Modification A** : Enrichir `DetectedElements` avec les objets/icônes

Ajouter dans l'interface et le prompt d'analyse :

```typescript
// Ajout dans DetectedElements
decorativeElements?: {
  icons: string[];       // Liste des icônes détectées (croix, diplôme, fourchette...)
  symbols: string[];     // Symboles spécifiques (euro, FCFA, %, etc.)
  domainSpecificItems: string[]; // Objets liés au domaine (bible, micro, assiette...)
}[];
```

**Modification B** : Mettre à jour le prompt pour extraire ces éléments

Ajouter dans `getEnhancedAnalysisPrompt()` :

```json
"decorativeElements": {
  "icons": ["croix", "bible", "micro", "diplôme", "livre", "fourchette", "couteau"],
  "symbols": ["€", "FCFA", "%", "★"],
  "domainSpecificItems": ["chaire", "autel", "tableau noir", "assiette", "verre"]
}
```

### Fichier 2 : `src/utils/contextDetection.ts`

**Modification A** : Ajouter une interface pour les objets du template

```typescript
export interface TemplateDecorativeElement {
  type: "icon" | "symbol" | "object";
  name: string;
  position?: string;
}
```

**Modification B** : Créer la matrice de pertinence Objet ↔ Domaine

```typescript
const OBJECT_DOMAIN_RELEVANCE: Record<string, Domain[]> = {
  // Objets universels (peuvent apparaître partout)
  "étoile": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  "flèche": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  
  // Objets église/spirituel
  "croix": ["church"],
  "bible": ["church"],
  "colombe": ["church"],
  "bougie": ["church", "event"],
  "prière": ["church"],
  "autel": ["church"],
  "chaire": ["church"],
  
  // Objets formation/éducation
  "diplôme": ["formation", "education"],
  "livre": ["formation", "education", "church"],
  "tableau": ["formation", "education"],
  "crayon": ["formation", "education"],
  "chapeau universitaire": ["formation", "education"],
  "certificat": ["formation", "education"],
  
  // Objets restaurant
  "fourchette": ["restaurant"],
  "couteau": ["restaurant"],
  "cuillère": ["restaurant"],
  "assiette": ["restaurant"],
  "verre": ["restaurant", "event"],
  "chef": ["restaurant"],
  "toque": ["restaurant"],
  
  // Objets musique/événement
  "micro": ["music", "event", "church"],
  "note de musique": ["music"],
  "guitare": ["music"],
  "platine": ["music"],
  "casque": ["music", "technology"],
  
  // Objets YouTube/Tech
  "play button": ["youtube"],
  "bouton play": ["youtube"],
  "subscribe": ["youtube"],
  "abonner": ["youtube"],
  "téléphone": ["youtube", "technology", "other"],
  "billets": ["youtube", "fashion", "other"],
  "argent": ["youtube", "fashion", "realestate", "other"],
  
  // Objets mode/commerce
  "vêtement": ["fashion"],
  "sac": ["fashion"],
  "chaussure": ["fashion"],
  "étiquette prix": ["fashion", "restaurant", "other"],
  
  // Objets santé
  "stéthoscope": ["health"],
  "coeur": ["health", "church", "event"],
  "médicament": ["health"],
  "croix médicale": ["health"],
  
  // Objets immobilier
  "maison": ["realestate"],
  "clé": ["realestate"],
  "plan": ["realestate"],
  
  // Objets sport
  "ballon": ["sport"],
  "trophée": ["sport", "event"],
  "médaille": ["sport", "formation"],
};
```

**Modification C** : Créer `detectObjectMismatch`

```typescript
export function detectObjectMismatch(
  decorativeElements: TemplateDecorativeElement[],
  userDomain: Domain | undefined
): { mismatchedObjects: TemplateDecorativeElement[]; message: string } {
  if (!userDomain || !decorativeElements?.length) {
    return { mismatchedObjects: [], message: "" };
  }
  
  const mismatchedObjects: TemplateDecorativeElement[] = [];
  
  for (const element of decorativeElements) {
    const relevantDomains = OBJECT_DOMAIN_RELEVANCE[element.name.toLowerCase()] || [];
    
    // Si l'objet a des domaines spécifiques ET que le domaine utilisateur n'en fait pas partie
    if (relevantDomains.length > 0 && !relevantDomains.includes(userDomain)) {
      mismatchedObjects.push(element);
    }
  }
  
  if (mismatchedObjects.length === 0) {
    return { mismatchedObjects: [], message: "" };
  }
  
  let message = `⚠️ **Objets/Icônes hors contexte détectés !**\n\n`;
  message += `Ces éléments visuels ne correspondent pas à votre ${getDomainLabel(userDomain)} :\n\n`;
  
  for (const obj of mismatchedObjects) {
    message += `• ${obj.type === "icon" ? "Icône" : "Objet"}: "${obj.name}"\n`;
  }
  
  message += `\n📌 **Ces éléments seront automatiquement supprimés** et remplacés par des éléments appropriés ou laissés vides.\n`;
  message += `Tapez "ok" pour continuer.`;
  
  return { mismatchedObjects, message };
}
```

### Fichier 3 : `src/types/generation.ts`

**Modification** : Ajouter les nouveaux champs dans `TemplateAnalysisDetail` et `ConversationState`

```typescript
export interface TemplateAnalysisDetail {
  // ... existants ...
  decorativeElements?: {
    icons: string[];
    symbols: string[];
    domainSpecificItems: string[];
  };
}

export interface ConversationState {
  // ... existants ...
  mismatchedObjects?: Array<{ type: string; name: string; position?: string }>;
}
```

### Fichier 4 : `supabase/functions/generate-image/index.ts`

**Modification A** : Ajouter une section sur les objets/icônes hors contexte

```typescript
// Après les instructions de couleur
instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
instructions.push("║  🎯 OBJETS ET ICÔNES - SUPPRESSION DES ÉLÉMENTS HORS CONTEXTE         ║");
instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
instructions.push("");
instructions.push("🚨 RÈGLE ABSOLUE: Les objets/icônes spécifiques au domaine original DOIVENT DISPARAÎTRE.");
instructions.push("");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("OBJETS À SUPPRIMER (si le domaine ne correspond pas):");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("   ❌ Église: croix, bible, colombe, bougie, autel");
instructions.push("   ❌ Formation: diplôme, livre, tableau, chapeau universitaire");
instructions.push("   ❌ Restaurant: fourchette, couteau, assiette, toque de chef");
instructions.push("   ❌ Musique: micro, note de musique, guitare, platine");
instructions.push("   ❌ YouTube: bouton play, subscribe, icône abonnement");
instructions.push("");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("PROCÉDURE DE REMPLACEMENT:");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("   1. IDENTIFIER les icônes/objets spécifiques au domaine original");
instructions.push("   2. SUPPRIMER complètement ces éléments");
instructions.push("   3. REMPLACER par:");
instructions.push("      • Un élément décoratif neutre (forme géométrique, effet de lumière)");
instructions.push("      • Un agrandissement d'un élément existant du client (logo, texte)");
instructions.push("      • Un fond harmonieux qui comble l'espace");
instructions.push("");
```

**Modification B** : Renforcer les instructions de layout "Zéro Espace Vide"

```typescript
instructions.push("████████████████████████████████████████████████████████████████████████");
instructions.push("██  🚨 POLITIQUE ZÉRO ESPACE VIDE - APPLICATION STRICTE              ██");
instructions.push("████████████████████████████████████████████████████████████████████████");
instructions.push("");
instructions.push("⚠️ SI TU SUPPRIMES UNE ZONE (texte, objet, icône), TU DOIS COMBLER L'ESPACE.");
instructions.push("");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("TECHNIQUES DE COMBLEMENT OBLIGATOIRES:");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("   📌 OPTION 1 - EXTENSION:");
instructions.push("      • Étendre le bandeau/forme voisin(e) pour couvrir la zone");
instructions.push("      • Agrandir le texte du client pour occuper plus d'espace");
instructions.push("      • Élargir une photo ou un logo existant");
instructions.push("");
instructions.push("   📌 OPTION 2 - FUSION:");
instructions.push("      • Fusionner deux zones en une seule plus grande");
instructions.push("      • Combiner le fond avec la zone supprimée");
instructions.push("");
instructions.push("   📌 OPTION 3 - DÉCORATION:");
instructions.push("      • Ajouter un élément décoratif du style original (forme, motif)");
instructions.push("      • Étendre un effet de lumière ou de dégradé");
instructions.push("      • Utiliser un pattern/texture subtile");
instructions.push("");
instructions.push("❌ CE QUI EST ABSOLUMENT INTERDIT:");
instructions.push("   • Un bandeau visible SANS texte");
instructions.push("   • Une zone rectangulaire vide");
instructions.push("   • Un espace blanc flagrant là où il y avait du contenu");
instructions.push("   • Un layout déséquilibré avec des 'trous'");
instructions.push("");
instructions.push("🎯 TEST VISUEL: Regarde ton affiche finale. Si tu vois une zone qui semble");
instructions.push("   'vide' ou 'incomplète', CORRIGE-LA avant de valider.");
instructions.push("");
```

### Fichier 5 : `src/hooks/useConversation.ts`

**Modification** : Intégrer la détection d'objets dans le flux

Après l'analyse du template, stocker les éléments décoratifs détectés et vérifier les incohérences avec le domaine utilisateur. Mettre à jour l'état pour inclure `mismatchedObjects` si nécessaire.

---

## Flux Utilisateur Amélioré

```
1. Utilisateur clique "S'inspirer" sur un template de FORMATION
   (contient: diplôme, livre, tableau)
   
2. Système analyse → Détecte:
   - Textes: titre, dates, frais d'inscription, certificat
   - Objets: diplôme, livre, tableau
   
3. Utilisateur écrit:
   "Affiche pour mon salon de coiffure La Joie"
   → Domaine détecté: "other" (service)
   
4. Système DÉTECTE les incohérences:
   - Textes hors contexte: "frais d'inscription", "certificat"
   - Objets hors contexte: "diplôme", "livre", "tableau"
   
5. Système INFORME (ou supprime automatiquement):
   "⚠️ J'ai détecté des éléments de formation sur cette affiche:
   - Textes: 'frais d'inscription', 'certificat'
   - Objets: diplôme, livre
   
   Ces éléments seront supprimés et l'espace sera adapté.
   Tapez 'ok' pour continuer."
   
6. Génération avec instructions explicites:
   - SUPPRIMER: diplôme, livre, tableau, frais d'inscription
   - COMBLER: étendre le logo du client, agrandir le titre
   - RÉSULTAT: Affiche équilibrée SANS éléments de formation
```

---

## Résumé des Modifications

| Fichier | Modification | Lignes estimées |
|---------|--------------|-----------------|
| `analyze-template/index.ts` | Extraction des objets/icônes | ~40 lignes |
| `contextDetection.ts` | Matrice objet ↔ domaine + fonction detection | ~120 lignes |
| `generate-image/index.ts` | Instructions objets + Zéro Espace Vide renforcé | ~60 lignes |
| `types/generation.ts` | Nouveaux champs decorativeElements | ~10 lignes |
| `useConversation.ts` | Intégration détection objets | ~30 lignes |

---

## Impact Attendu

### Objets/Icônes
- Les icônes spécifiques au domaine original (croix, diplôme, fourchette) seront identifiées
- Elles seront soit supprimées automatiquement, soit signalées à l'utilisateur
- Le prompt de génération inclura des instructions explicites de suppression

### Layouts
- Les instructions de comblement sont plus précises et obligatoires
- Trois techniques de comblement sont proposées à l'IA
- Un test visuel final est demandé avant validation

