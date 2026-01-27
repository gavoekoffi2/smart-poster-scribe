
# Plan Mis à Jour : Flux Complet pour Miniatures YouTube avec Logos

## Objectif

Intégrer un flux de questions intelligentes pour les miniatures YouTube qui collecte :
1. **Titre de la vidéo** (obligatoire)
2. **Photo du visage** (propre photo OU génération IA avec caractéristiques)
3. **Logo(s)** (optionnel, avec position et mise en valeur)
4. **Expression faciale** (optionnelle)

---

## Flux de Questions Complet

```text
┌─────────────────────────────────────────────────────────────────┐
│  UTILISATEUR DEMANDE UNE MINIATURE YOUTUBE                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │  Q1: Titre de la vidéo   │
                │  (Obligatoire)           │
                └──────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │  Q2: Avez-vous votre     │
                │  propre photo ?          │
                └──────────────────────────┘
                       │           │
                      OUI         NON
                       │           │
                       ▼           ▼
              ┌────────────┐  ┌──────────────────┐
              │  Upload    │  │  Q3: Origine     │
              │  Photo     │  │  (Africain, etc) │
              └────────────┘  └──────────────────┘
                       │           │
                       │           ▼
                       │  ┌──────────────────┐
                       │  │  Q4: Âge         │
                       │  │  (Jeune, Adulte) │
                       │  └──────────────────┘
                       │           │
                       ▼           ▼
                ┌──────────────────────────┐
                │  Q5: Expression          │
                │  (Optionnelle)           │
                └──────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  Q6: Avez-vous un logo à inclure ?     │  ◀── NOUVEAU
         │  (Utiliser logo par défaut / Upload /  │
         │   Passer)                              │
         └────────────────────────────────────────┘
                       │           │
                      OUI         NON
                       │           │
                       ▼           │
              ┌────────────────┐   │
              │  Q7: Position  │   │
              │  du logo ?     │   │
              │  (Grille 5     │   │
              │   positions)   │   │
              └────────────────┘   │
                       │           │
                       ▼           │
              ┌────────────────┐   │
              │  Autre logo ?  │   │
              │  (Boucle si    │   │
              │   oui)         │   │
              └────────────────┘   │
                       │           │
                       ▼           ▼
                ┌──────────────────────────┐
                │  GÉNÉRATION MINIATURE    │
                │  avec profil expert      │
                └──────────────────────────┘
```

---

## Modifications à Apporter

### Fichiers à Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/types/generation.ts` | MODIFIER | Ajouter `Domain = "youtube"` et interface `YouTubeInfo` |
| `src/config/domainQuestions.ts` | MODIFIER | Ajouter configuration complète pour "youtube" avec questions logos |
| `supabase/functions/analyze-request/index.ts` | MODIFIER | Ajouter mots-clés détection YouTube |
| `supabase/functions/generate-image/expertSkills.ts` | MODIFIER | Compléter profil YOUTUBE_THUMBNAIL |

---

## Détail des Questions YouTube

### Configuration dans `domainQuestions.ts`

```text
youtube: {
  domain: "youtube",
  label: "Miniature YouTube",
  templateRequirements: ["face_image", "video_title"],
  questions: [
    // Q1: Titre de la vidéo (OBLIGATOIRE)
    {
      id: "video_title",
      question: "Quel est le titre de votre vidéo YouTube ?",
      type: "text",
      required: true,
      priority: 1
    },
    
    // Q2: Photo propre ou générée ?
    {
      id: "has_own_image",
      question: "Voulez-vous utiliser votre propre photo ?",
      type: "boolean",
      required: true,
      priority: 2,
      followUp: {
        condition: "yes",
        imageUpload: { multiple: false, label: "Votre photo" }
      }
    },
    
    // Q3: Origine (si génération IA)
    {
      id: "subject_ethnicity",
      question: "Quelle origine pour la personne à générer ?",
      type: "choice",
      choices: ["Africain(e)", "Caucasien(ne)", "Asiatique", "Autre"],
      conditionalOn: { questionId: "has_own_image", value: false },
      priority: 3
    },
    
    // Q4: Âge (si génération IA)
    {
      id: "subject_age",
      question: "Quel âge approximatif ?",
      type: "choice",
      choices: ["Jeune (18-30)", "Adulte (30-50)", "Senior (50+)"],
      conditionalOn: { questionId: "has_own_image", value: false },
      priority: 4
    },
    
    // Q5: Expression faciale
    {
      id: "desired_expression",
      question: "Quelle expression faciale ?",
      type: "choice",
      choices: ["Surprise/Choc", "Concentration", "Joie/Excitation", "Confiance"],
      required: false,
      priority: 5
    },
    
    // Q6: Logo (NOUVEAU) - Utilise le système existant DefaultLogoSelect
    {
      id: "has_logo",
      question: "Voulez-vous ajouter un logo sur la miniature ?",
      type: "boolean",
      required: false,
      priority: 6,
      followUp: {
        condition: "yes",
        imageUpload: { 
          multiple: true, 
          label: "Vos logos",
          hint: "Vous pouvez ajouter plusieurs logos"
        }
      }
    },
    
    // Q7: Position du logo (si logo fourni) - Utilise LogoPositionSelect existant
    {
      id: "logo_position",
      question: "Où placer le logo ?",
      type: "choice",
      choices: ["Haut gauche", "Haut droite", "Centre", "Bas gauche", "Bas droite"],
      conditionalOn: { questionId: "has_logo", value: true },
      priority: 7
    }
  ]
}
```

---

## Interface YouTubeInfo Mise à Jour

```text
interface YouTubeInfo {
  // Titre et contenu
  videoTitle: string;
  
  // Photo du sujet
  hasOwnImage: boolean;
  ownImage?: string;              // Photo utilisateur (base64)
  subjectEthnicity?: string;      // Si génération IA
  subjectAge?: string;            // Si génération IA
  subjectGender?: string;         // Si génération IA
  desiredExpression?: string;     // Surprise, Concentration, etc.
  
  // Logos (NOUVEAU)
  hasLogo: boolean;
  logos?: Array<{
    imageUrl: string;
    position: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";
  }>;
}
```

---

## Intégration avec Composants Existants

Le système réutilisera les composants existants :

| Composant | Utilisation |
|-----------|-------------|
| `DefaultLogoSelect` | Proposer le logo par défaut du profil utilisateur OU upload d'un nouveau |
| `LogoPositionSelect` | Grille visuelle pour choisir la position (5 options) |
| `ImageUploadButton` | Upload de la photo et des logos |

---

## Règles de Mise en Valeur du Logo (dans expertSkills.ts)

Ajouter dans le profil YOUTUBE_THUMBNAIL :

```text
logoPlacement: [
  "Logo visible mais NON intrusif (ne pas couvrir le visage)",
  "Taille: 8-15% de la surface totale de la miniature",
  "Position recommandée: coin inférieur droit ou supérieur gauche",
  "Ombre portée légère pour détacher du fond",
  "Si logo sombre sur fond sombre: ajouter contour blanc/clair",
  "Si logo clair sur fond clair: ajouter contour sombre",
  "Opacité: 90-100% (logo bien visible)",
  "Ne JAMAIS déformer les proportions du logo"
]
```

---

## Messages UX pour les Logos

### Question Logo

```text
🏷️ **Voulez-vous ajouter votre logo sur la miniature ?**

Beaucoup de créateurs ajoutent leur logo pour renforcer leur marque personnelle.

• **Oui** : Utilisez votre logo par défaut ou uploadez-en un nouveau
• **Non** : Continuer sans logo
```

### Si Logo Uploadé

```text
📍 **Où souhaitez-vous placer le logo ?**

[Grille visuelle avec 5 positions]
↖ Haut gauche  |           | ↗ Haut droite
               | ◉ Centre  |
↙ Bas gauche   |           | ↘ Bas droite

💡 Conseil : Le coin inférieur droit est le plus populaire car il n'interfère pas avec le visage.
```

### Autre Logo ?

```text
➕ **Voulez-vous ajouter un autre logo ?**

• **Oui** : Ajouter un logo supplémentaire
• **Non** : Continuer vers la génération
```

---

## Résultat Attendu

Quand l'utilisateur demande une miniature YouTube :

1. **Détection automatique** du domaine "youtube"
2. **Questions séquentielles** :
   - Titre de la vidéo
   - Photo propre ou génération IA (+ caractéristiques si IA)
   - Expression faciale souhaitée
   - Logo(s) avec position(s)
3. **Génération** d'une miniature professionnelle avec :
   - Visage expressif central (30-50%)
   - Texte court et percutant extrait du titre
   - Couleurs hyper-saturées
   - Logo(s) bien positionné(s) et mis en valeur
   - Format 16:9 (1280x720)

---

## Fichiers à Créer/Modifier (Résumé Final)

| Fichier | Modifications |
|---------|---------------|
| `src/types/generation.ts` | + Domain "youtube", + interface YouTubeInfo avec logos |
| `src/config/domainQuestions.ts` | + Configuration complète youtube avec 7 questions |
| `supabase/functions/analyze-request/index.ts` | + Mots-clés détection YouTube |
| `supabase/functions/generate-image/expertSkills.ts` | + Profil YOUTUBE_THUMBNAIL complet + règles logos |

---

## Prochaines Étapes (Après Implémentation)

1. Tester le flux complet avec upload de photo + logos
2. Vérifier que les logos sont bien positionnés dans la génération
3. Ajouter des suggestions de texte basées sur le titre de la vidéo
4. Permettre de choisir parmi plusieurs styles de miniatures
