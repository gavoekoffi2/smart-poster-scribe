

# Plan : Garantir Zéro Contenu Original sur l'Affiche Finale

## Problèmes Identifiés

L'utilisateur a constaté deux problèmes critiques :

### 1. Textes Originaux Non Remplacés
- Quand l'utilisateur ne fournit pas assez de contenu pour remplacer TOUS les textes du template (titres, sous-titres, slogans, etc.), l'IA laisse certains textes originaux
- Cela inclut TOUT type de texte, pas seulement les dates/contacts/prix

### 2. Couleurs Originales Résiduelles  
- L'IA ne remplace pas TOUTES les couleurs du template par celles de l'utilisateur
- Certaines anciennes couleurs restent visibles sur l'affiche finale

---

## Solution Proposée

### Volet 1 : Analyse Exhaustive des Zones de Texte

Modifier `analyze-template/index.ts` pour extraire TOUS les textes détectés avec leur type et contenu exact, incluant :
- Titres et sous-titres
- Slogans et phrases d'accroche
- Informations factuelles (dates, lieux, prix, contact)
- Tout autre texte visible

### Volet 2 : Vérification des Correspondances AVANT Génération

Dans `useConversation.ts`, après que l'utilisateur fournit ses informations, comparer :
- Ce que le template contient (toutes les zones de texte détectées)
- Ce que l'utilisateur a fourni

Si des zones n'ont pas de correspondance claire → Poser la question pour obtenir le contenu manquant

### Volet 3 : Tableau de Remplacement Explicite dans le Prompt

Dans `generate-image/index.ts`, ajouter un tableau ASCII qui liste CHAQUE zone de texte détectée et son action :
- Zone avec remplacement → `✅ REMPLACER PAR: "[contenu utilisateur]"`
- Zone sans remplacement → `❌ EFFACER COMPLÈTEMENT CETTE ZONE`

### Volet 4 : Instructions Radicales pour les Couleurs

Renforcer les instructions de remplacement de couleurs pour qu'AUCUNE couleur originale ne subsiste :
- Analyse de chaque zone colorée du template
- Remplacement systématique par la palette utilisateur
- Utilisation du blanc comme harmonisateur universel si les couleurs ne s'accordent pas

---

## Modifications Techniques

### Fichier 1 : `supabase/functions/analyze-template/index.ts`

Modifier le prompt d'analyse pour extraire le contenu exact de CHAQUE zone de texte :

```json
{
  "textZones": [
    { "type": "title", "content": "GRANDE VEILLÉE DE PRIÈRE", "position": "top-center" },
    { "type": "subtitle", "content": "Une nuit avec le Saint-Esprit", "position": "top-center" },
    { "type": "date", "content": "15 JANVIER 2025", "position": "middle-left" },
    { "type": "time", "content": "À PARTIR DE 20H", "position": "middle-left" },
    { "type": "location", "content": "PALAIS DES SPORTS DE YAOUNDÉ", "position": "bottom-center" },
    { "type": "contact", "content": "+237 6XX XX XX XX", "position": "bottom" },
    { "type": "speaker", "content": "Avec Bishop JEAN-PAUL", "position": "right" },
    { "type": "slogan", "content": "ENTRÉE LIBRE", "position": "bottom" },
    { "type": "other", "content": "Venez nombreux !", "position": "bottom-right" }
  ]
}
```

### Fichier 2 : `src/hooks/useConversation.ts`

Ajouter une fonction de vérification des correspondances après la collecte des informations utilisateur :

```typescript
const checkMissingTextContent = (
  templateZones: Array<{ type: string; content: string }>,
  userInfo: ExtractedInfo
): Array<{ type: string; content: string }> => {
  const missing: Array<{ type: string; content: string }> = [];
  
  for (const zone of templateZones) {
    // Vérifier si l'utilisateur a fourni un remplacement pour ce type
    const hasReplacement = 
      (zone.type === "title" && userInfo.title) ||
      (zone.type === "subtitle" && (userInfo.title || userInfo.additionalDetails)) ||
      (zone.type === "date" && userInfo.dates) ||
      (zone.type === "time" && userInfo.dates) ||
      (zone.type === "location" && userInfo.location) ||
      (zone.type === "contact" && userInfo.contact) ||
      (zone.type === "price" && userInfo.prices) ||
      (zone.type === "speaker" && userInfo.speakers) ||
      // Pour les autres types, vérifier dans additionalDetails ou description
      (["slogan", "other", "tagline"].includes(zone.type) && userInfo.additionalDetails);
    
    if (!hasReplacement) {
      missing.push(zone);
    }
  }
  
  return missing;
};
```

Modifier le flux `clone_gathering` pour poser des questions sur les zones manquantes :

```typescript
// Après collecte des infos utilisateur
const missingZones = checkMissingTextContent(
  conversationState.templateAnalysis?.textZones || [],
  extractedInfo
);

if (missingZones.length > 0) {
  // Construire un message listant les zones manquantes
  const message = buildMissingContentQuestion(missingZones);
  addMessage("assistant", message);
  // Attendre la réponse avant de générer
  return;
}
```

### Fichier 3 : `supabase/functions/generate-image/index.ts`

Ajouter le paramètre `templateTextZones` dans le body de la requête et générer un tableau de remplacement explicite :

```typescript
// Nouveau paramètre reçu
const { templateTextZones } = body;

// Dans buildProfessionalPrompt, ajouter le tableau de remplacement
if (templateTextZones && templateTextZones.length > 0) {
  instructions.push("╔════════════════════════════════════════════════════════════════════════╗");
  instructions.push("║  📋 TABLEAU DE REMPLACEMENT - TOUTES LES ZONES DE TEXTE              ║");
  instructions.push("╚════════════════════════════════════════════════════════════════════════╝");
  instructions.push("");
  instructions.push("┌───────────────────┬────────────────────────────────────────────────────┐");
  instructions.push("│ ZONE ORIGINALE    │ ACTION REQUISE                                     │");
  instructions.push("├───────────────────┼────────────────────────────────────────────────────┤");
  
  templateTextZones.forEach(zone => {
    const replacement = findReplacementForZone(zone.type, userProvidedContent);
    if (replacement) {
      instructions.push(`│ ${zone.type.padEnd(17)} │ ✅ REMPLACER PAR: "${replacement.substring(0, 30)}..." │`);
    } else {
      instructions.push(`│ ${zone.type.padEnd(17)} │ ❌ EFFACER COMPLÈTEMENT - ZONE VIDE              │`);
    }
  });
  
  instructions.push("└───────────────────┴────────────────────────────────────────────────────┘");
  instructions.push("");
  instructions.push("⚠️ RÈGLE ABSOLUE: Les zones marquées ❌ doivent être VIDES.");
  instructions.push("   Ne laisse AUCUN texte original. La zone doit être propre.");
}
```

Renforcer les instructions de couleurs :

```typescript
instructions.push("╔════════════════════════════════════════════════════════════════════════╗");
instructions.push("║  🎨 REMPLACEMENT TOTAL DES COULEURS - AUCUNE EXCEPTION                 ║");
instructions.push("╚════════════════════════════════════════════════════════════════════════╝");
instructions.push("");
instructions.push("🚨 MISSION COULEUR: AUCUNE couleur du template original ne doit rester.");
instructions.push("");
instructions.push("━━━ PROCÉDURE DE REMPLACEMENT ━━━");
instructions.push("1. SCANNER toutes les zones colorées du template original");
instructions.push("2. IDENTIFIER chaque couleur (fonds, textes, bordures, effets, ombres)");
instructions.push("3. REMPLACER par la palette utilisateur selon la règle 60-30-10:");
instructions.push("   • Couleur #1 (60%): Fonds, grandes zones");
instructions.push("   • Couleur #2 (30%): Titres, accents majeurs");
instructions.push("   • Couleur #3 (10%): Détails, bordures, highlights");
instructions.push("");
instructions.push("━━━ SI LES COULEURS NE S'HARMONISENT PAS ━━━");
instructions.push("🔲 SOLUTION: Utiliser le BLANC comme harmonisateur universel");
instructions.push("   • Bordures blanches (3-6px) autour du texte coloré");
instructions.push("   • Fonds blancs ou crème pour aérer");
instructions.push("   • Séparateurs blancs entre zones de couleurs différentes");
instructions.push("");
instructions.push("❌ INTERDIT ABSOLUMENT:");
instructions.push("   • Laisser la moindre couleur du template original");
instructions.push("   • Mélanger anciennes et nouvelles couleurs");
instructions.push("   • Avoir des zones où l'ancienne couleur transparaît");
```

---

## Flux Utilisateur Amélioré

```
1. Utilisateur clique "S'inspirer" sur un template
   
2. Système analyse → Détecte 8 zones de texte:
   - Titre principal
   - Sous-titre/slogan
   - Date
   - Heure
   - Lieu
   - Contact
   - Nom orateur
   - Phrase d'accroche
   
3. Système affiche:
   "J'ai détecté ces éléments à remplacer sur l'affiche:
   • Titre: 'GRANDE VEILLÉE DE PRIÈRE'
   • Sous-titre: 'Une nuit avec le Saint-Esprit'
   • Date et heure
   • Lieu
   • Contact
   • Orateur
   • Slogan: 'ENTRÉE LIBRE'
   
   Donnez-moi VOS informations..."

4. Utilisateur fournit:
   "Conférence des Femmes, le 20 mars 2026, 
   contact +225 07 08 09 10"
   
5. Système DÉTECTE les zones manquantes:
   - Sous-titre/slogan ❌
   - Heure ❌
   - Lieu ❌
   - Orateur ❌
   - Phrase d'accroche ❌
   
6. Système DEMANDE:
   "J'ai remarqué que l'affiche originale a aussi:
   • Un sous-titre/slogan: 'Une nuit avec le Saint-Esprit'
   • Une heure
   • Un lieu
   • Un nom d'orateur
   • Une phrase d'accroche
   
   Voulez-vous fournir ces informations ou les supprimer de l'affiche?"
   
7. Utilisateur répond:
   "Sous-titre: Ensemble pour l'excellence, Lieu: Palais des Congrès"
   OU "Supprime les autres"
   
8. Génération avec tableau de remplacement EXPLICITE:
   │ title    │ ✅ REMPLACER: "Conférence des Femmes"    │
   │ subtitle │ ✅ REMPLACER: "Ensemble pour l'excellence"│
   │ date     │ ✅ REMPLACER: "20 mars 2026"             │
   │ time     │ ❌ EFFACER COMPLÈTEMENT                  │
   │ location │ ✅ REMPLACER: "Palais des Congrès"       │
   │ contact  │ ✅ REMPLACER: "+225 07 08 09 10"         │
   │ speaker  │ ❌ EFFACER COMPLÈTEMENT                  │
   │ slogan   │ ❌ EFFACER COMPLÈTEMENT                  │
```

---

## Résumé des Modifications

| Fichier | Modification | Lignes |
|---------|--------------|--------|
| `analyze-template/index.ts` | Extraction contenu exact de toutes les zones | ~40 |
| `useConversation.ts` | Vérification correspondances + questions | ~100 |
| `generate-image/index.ts` | Tableau de remplacement explicite + couleurs | ~80 |

---

## Impact Attendu

### Textes
- **0% de texte original** : Chaque zone est soit remplacée, soit explicitement effacée
- L'utilisateur est informé des zones sans correspondance AVANT génération
- L'IA a des instructions claires pour chaque zone spécifique

### Couleurs
- **0% de couleur originale** : Remplacement systématique par la palette utilisateur
- Harmonisation automatique avec le blanc si les couleurs clashent
- Instructions explicites sur la procédure de remplacement zone par zone

