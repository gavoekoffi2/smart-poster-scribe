
# Plan : Détection d'Incohérence Contextuelle et Adaptation du Layout

## Problème Identifié

L'utilisateur décrit deux problèmes critiques :

### 1. Zones Hors Contexte Non Détectées
Quand un utilisateur utilise un template d'un domaine (ex: "formation") pour créer une affiche d'un autre domaine (ex: "service"), le système laisse des textes qui ne correspondent pas au nouveau contexte :
- "Frais d'inscription" sur une affiche de service
- "Dates de la formation" sur une affiche de restaurant
- "Programme" sur une affiche d'événement musical

Le système actuel vérifie seulement si l'utilisateur a fourni un remplacement, mais ne vérifie PAS si la zone du template est **pertinente** pour le contenu de l'utilisateur.

### 2. Zones Vides = Layout Cassé
Quand des zones sont supprimées, le layout reste avec des espaces vides au lieu de s'adapter au contenu de l'utilisateur. Il faut redistribuer le contenu de l'utilisateur dans les zones disponibles.

---

## Solution Proposée

### Volet 1 : Détection d'Incohérence Contextuelle

Ajouter une fonction `detectContextMismatch` qui :
1. Analyse le **domaine/contexte du template** (via les textZones détectées)
2. Compare avec le **domaine/contexte du contenu utilisateur**
3. Identifie les zones qui sont **hors contexte** (ex: "frais d'inscription" sur une affiche de service)
4. Pose une question explicite : "Cette affiche de formation a des zones comme 'frais d'inscription' qui ne correspondent pas à votre service. Voulez-vous les supprimer ?"

### Volet 2 : Classification des Zones par Domaine

Créer une matrice de pertinence Zone ↔ Domaine :

```
| Zone Type        | church | event | formation | service | restaurant | ... |
|------------------|--------|-------|-----------|---------|------------|-----|
| price            | ✓      | ✓     | ✓         | ✓       | ✓          |     |
| registration_fee | ✗      | ✗     | ✓         | ✗       | ✗          |     |
| program_outline  | ✓      | ✓     | ✓         | ✗       | ✗          |     |
| menu             | ✗      | ✗     | ✗         | ✗       | ✓          |     |
| bible_verse      | ✓      | ✗     | ✗         | ✗       | ✗          |     |
```

### Volet 3 : Adaptation Intelligente du Layout

Dans le prompt de génération, ajouter des instructions pour :
1. **Redistribuer le contenu** : Si des zones sont supprimées, répartir le contenu de l'utilisateur dans les zones restantes
2. **Ajuster les formes** : Si le layout a trop de zones vides, modifier légèrement les formes pour que le design reste équilibré
3. **Préserver l'essence** : Le style graphique reste identique, seule la distribution des éléments s'adapte

---

## Modifications Techniques

### Fichier 1 : `src/hooks/useConversation.ts`

**Modification A** : Ajouter la fonction `detectContextMismatch`

```typescript
// Types de zones et leurs domaines pertinents
const ZONE_DOMAIN_RELEVANCE: Record<string, Domain[]> = {
  // Zones universelles (pertinentes pour tous)
  "title": ["church", "event", "formation", "service", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "other"],
  "subtitle": ["church", "event", "formation", "service", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "other"],
  "contact": ["church", "event", "formation", "service", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "other"],
  "date": ["church", "event", "formation", "restaurant", "music", "sport", "other"],
  "time": ["church", "event", "formation", "restaurant", "music", "sport", "other"],
  "location": ["church", "event", "formation", "restaurant", "music", "sport", "realestate", "other"],
  
  // Zones spécifiques à certains domaines
  "registration_fee": ["formation", "education"],
  "program_outline": ["formation", "education", "event", "church"],
  "menu": ["restaurant"],
  "dishes": ["restaurant"],
  "bible_verse": ["church"],
  "speaker": ["church", "event", "formation"],
  "artist": ["music", "event"],
  "price_promo": ["fashion", "technology", "restaurant", "service"],
  "discount": ["fashion", "technology", "restaurant", "service"],
  "certification": ["formation", "education"],
  "duration": ["formation", "education", "event"],
  "capacity": ["formation", "event"],
};

// Mots-clés pour détecter le type de zone à partir du contenu
const ZONE_CONTENT_PATTERNS: Record<string, RegExp[]> = {
  "registration_fee": [
    /frais\s*(d[''])?inscription/i,
    /inscription/i,
    /tarif\s*formation/i,
    /formation\s*[:=]/i,
  ],
  "program_outline": [
    /programme/i,
    /module/i,
    /cursus/i,
    /objectif.*pédagogique/i,
  ],
  "menu": [
    /menu/i,
    /plat/i,
    /entrée/i,
    /dessert/i,
  ],
  "bible_verse": [
    /verset/i,
    /psaume/i,
    /matthieu|jean|luc|marc/i,
    /genèse|exode/i,
  ],
  "certification": [
    /certifi/i,
    /diplôme/i,
    /attestation/i,
  ],
  "capacity": [
    /places?\s*limité/i,
    /capacité/i,
    /\d+\s*places?/i,
  ],
};

function detectContextMismatch(
  templateZones: TemplateTextZone[],
  userDomain: Domain | undefined,
  userContent: string
): { mismatchedZones: TemplateTextZone[]; message: string } {
  if (!userDomain) return { mismatchedZones: [], message: "" };
  
  const mismatchedZones: TemplateTextZone[] = [];
  
  for (const zone of templateZones) {
    // D'abord, détecter le vrai type de la zone à partir de son contenu
    let detectedType = zone.type;
    
    for (const [type, patterns] of Object.entries(ZONE_CONTENT_PATTERNS)) {
      if (patterns.some(p => p.test(zone.content))) {
        detectedType = type;
        break;
      }
    }
    
    // Vérifier si ce type de zone est pertinent pour le domaine de l'utilisateur
    const relevantDomains = ZONE_DOMAIN_RELEVANCE[detectedType] || 
                            ZONE_DOMAIN_RELEVANCE[zone.type] || 
                            [];
    
    // Si le domaine utilisateur n'est pas dans la liste des domaines pertinents
    if (relevantDomains.length > 0 && !relevantDomains.includes(userDomain)) {
      mismatchedZones.push({
        ...zone,
        type: detectedType, // Utiliser le type détecté
      });
    }
  }
  
  if (mismatchedZones.length === 0) {
    return { mismatchedZones: [], message: "" };
  }
  
  // Construire le message d'alerte
  let message = `⚠️ **Attention : Éléments hors contexte détectés !**\n\n`;
  message += `L'affiche de référence semble être pour un autre domaine et contient :\n\n`;
  
  for (const zone of mismatchedZones) {
    const content = zone.content.length > 40 ? zone.content.slice(0, 40) + "..." : zone.content;
    message += `• "${content}"\n`;
  }
  
  message += `\nCes éléments ne correspondent pas à votre ${getDomainLabel(userDomain)}.\n\n`;
  message += `📌 **Que souhaitez-vous faire ?**\n`;
  message += `- **Supprimer** ces zones (tapez "supprimer" ou "oui")\n`;
  message += `- **Fournir un remplacement** (écrivez le texte à mettre à la place)\n`;
  
  return { mismatchedZones, message };
}

function getDomainLabel(domain: Domain): string {
  const labels: Record<Domain, string> = {
    church: "affiche d'église",
    event: "affiche d'événement",
    formation: "affiche de formation",
    service: "affiche de service",
    restaurant: "affiche de restaurant",
    fashion: "affiche mode",
    music: "affiche musicale",
    sport: "affiche sportive",
    technology: "affiche tech",
    health: "affiche santé",
    realestate: "affiche immobilière",
    youtube: "miniature YouTube",
    other: "affiche",
  };
  return labels[domain] || "affiche";
}
```

**Modification B** : Intégrer la détection dans le flux `clone_gathering`

Après avoir extrait les informations utilisateur, vérifier les incohérences contextuelles :

```typescript
// Dans clone_gathering, après checkMissingTextZones
const { mismatchedZones, message: mismatchMessage } = detectContextMismatch(
  templateTextZones,
  conversationStateRef.current.domain,
  content
);

if (mismatchedZones.length > 0) {
  // Stocker les zones incohérentes
  setConversationState(prev => ({
    ...prev,
    step: "confirm_context_mismatch",
    contextMismatchZones: mismatchedZones,
    extractedInfo: extractedInfo,
    description: content,
  }));
  
  addMessage("assistant", mismatchMessage);
  return;
}
```

### Fichier 2 : `src/types/generation.ts`

Ajouter le nouveau step et les champs associés :

```typescript
export interface ConversationState {
  step: 
    | ... // existants
    | "confirm_context_mismatch"; // Confirmation des zones hors contexte
  // ... existants ...
  contextMismatchZones?: Array<{ type: string; content: string; position?: string }>;
}
```

### Fichier 3 : `supabase/functions/generate-image/index.ts`

**Modification A** : Ajouter des instructions pour l'adaptation du layout

```typescript
// Après les instructions de suppression des zones
instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
instructions.push("║  📐 ADAPTATION INTELLIGENTE DU LAYOUT                                 ║");
instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
instructions.push("");
instructions.push("🎯 SI DES ZONES SONT SUPPRIMÉES (pas de contenu de remplacement) :");
instructions.push("");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("1. REDISTRIBUTION DU CONTENU:");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("   • NE LAISSE PAS de zones vides visibles");
instructions.push("   • Répartis le contenu de l'utilisateur dans les zones restantes");
instructions.push("   • Agrandis les textes existants si besoin pour remplir l'espace");
instructions.push("   • Utilise des éléments décoratifs pour combler (formes, motifs)");
instructions.push("");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("2. AJUSTEMENT DES FORMES:");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("   • Si un bandeau de texte est supprimé → Étendre le bandeau voisin");
instructions.push("   • Si une zone de prix est supprimée → Utiliser l'espace pour le titre");
instructions.push("   • Maintenir l'équilibre visuel du design");
instructions.push("   • Les formes décoratives peuvent être étendues/réduites");
instructions.push("");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("3. PRÉSERVER L'ESSENCE:");
instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
instructions.push("   ✓ Le STYLE graphique reste identique (effets, couleurs, ambiance)");
instructions.push("   ✓ La COMPOSITION générale reste reconnaissable");
instructions.push("   ✓ Seule la DISTRIBUTION des éléments s'adapte au contenu disponible");
instructions.push("");
instructions.push("❌ INTERDIT:");
instructions.push("   • Laisser des espaces vides flagrants");
instructions.push("   • Des bandeaux de texte vides");
instructions.push("   • Des zones où on devine qu'il manque quelque chose");
instructions.push("");
```

---

## Flux Utilisateur Amélioré

```
1. Utilisateur clique "S'inspirer" sur un template de FORMATION
   
2. Utilisateur écrit:
   "Je veux une affiche pour mon salon de coiffure La Joie,
   contact: +225 07 08 09 10"
   
3. Système DÉTECTE:
   - Domaine utilisateur: "service" (salon de coiffure)
   - Template domaine: "formation"
   - Zones HORS CONTEXTE:
     • "Frais d'inscription: 50 000 FCFA"
     • "Programme: Module 1, Module 2..."
     • "Durée: 3 jours"
     • "Certificat délivré"
   
4. Système AFFICHE:
   "⚠️ Attention : Éléments hors contexte détectés !
   
   L'affiche de référence semble être pour une formation et contient :
   • 'Frais d'inscription: 50 000 FCFA'
   • 'Programme: Module 1, Module 2...'
   • 'Durée: 3 jours'
   • 'Certificat délivré'
   
   Ces éléments ne correspondent pas à votre salon de coiffure.
   
   Voulez-vous :
   - Supprimer ces zones
   - Fournir un remplacement"
   
5. Utilisateur: "Supprimer"
   
6. Génération avec instructions d'adaptation:
   - Zones supprimées
   - Layout adapté (le contenu de l'utilisateur redistribué)
   - Pas d'espaces vides
```

---

## Résumé des Modifications

| Fichier | Modification | Lignes |
|---------|--------------|--------|
| `src/hooks/useConversation.ts` | Fonction `detectContextMismatch` + gestion du step | ~120 |
| `src/types/generation.ts` | Nouveau step + champ `contextMismatchZones` | ~5 |
| `supabase/functions/generate-image/index.ts` | Instructions d'adaptation du layout | ~50 |

---

## Impact Attendu

### Détection Contextuelle
- Les zones comme "frais d'inscription" seront détectées comme hors contexte pour un service
- L'utilisateur est averti AVANT la génération
- Plus aucun texte incohérent sur l'affiche finale

### Adaptation du Layout
- Quand des zones sont supprimées, le contenu utilisateur est redistribué
- Le design reste équilibré sans espaces vides
- L'essence graphique du template est préservée

