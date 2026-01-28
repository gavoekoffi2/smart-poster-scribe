
# Plan : Flux Intelligent de Création de Miniatures YouTube

## Objectif

Créer un flux conversationnel intelligent pour les miniatures YouTube qui :

1. **Quand l'utilisateur clique "S'inspirer" sur une miniature** :
   - Analyser la miniature de référence (visage, texte, logos, style)
   - Poser des questions personnalisées basées sur ce qui est détecté
   - Permettre l'upload d'images (photos personnelles, logos)
   - Demander les préférences de mise en scène (logo dans les mains, autour, etc.)

2. **Quand l'utilisateur veut créer une miniature SANS référence** :
   - Demander le titre de la vidéo (élément clé)
   - S'inspirer automatiquement des miniatures existantes en base
   - Poser des questions intelligentes (photo personnelle, expression, logos)
   - Créer une miniature professionnelle basée sur le profil expert YouTube

---

## Architecture de la Solution

### Changements Requis

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/analyze-template/index.ts` | MODIFIER | Ajouter détection spécifique miniatures YouTube (visage, expression, texte court) |
| `src/config/domainQuestions.ts` | MODIFIER | Améliorer les questions YouTube avec préférences de mise en scène |
| `src/hooks/useConversation.ts` | MODIFIER | Ajouter logique pour flux YouTube avec/sans référence |
| Migration SQL | CRÉER | Insérer les 12 miniatures YouTube dans `reference_templates` |
| `src/types/generation.ts` | MODIFIER | Ajouter type `YouTubePreferences` pour les préférences de mise en scène |

---

## Phase 1 : Enrichir la Base de Données

### Migration SQL - Insertion des Templates YouTube

Les 12 miniatures YouTube existantes seront ajoutées à la table `reference_templates` pour que le système puisse s'en inspirer automatiquement :

```sql
INSERT INTO public.reference_templates (domain, design_category, image_url, description, tags)
VALUES
  ('youtube', 'thumbnail', '/reference-templates/youtube/yomi-denzel-ia-business.avif', 
   'Miniature virale business/IA avec visage expressif, texte massif, objets 3D flottants (argent, téléphone)', 
   ARRAY['business', 'ia', 'argent', 'viral', 'visage-expressif']),
  ('youtube', 'thumbnail', '/reference-templates/youtube/yomi-denzel-millionnaire.avif',
   'Miniature succès/richesse avec expression de confiance, couleurs dorées, chiffres mis en valeur',
   ARRAY['millionnaire', 'richesse', 'confiance', 'or', 'succès']),
  -- ... (les 12 miniatures)
```

---

## Phase 2 : Améliorer l'Analyse de Miniatures (Edge Function)

### Modifications de `analyze-template/index.ts`

Ajouter un prompt spécifique pour les miniatures YouTube qui détecte :

- **Visage** : Expression (surprise, joie, confiance), position, taille
- **Texte** : Mots-clés, chiffres, couleurs du texte
- **Objets** : Logos, symboles (argent, téléphone, voiture)
- **Style** : Palette de couleurs, fond, effets (glow, ombres)

```typescript
// Nouveau système prompt pour miniatures YouTube
const youtubeAnalysisPrompt = `
Tu analyses une MINIATURE YOUTUBE pour permettre à l'utilisateur de créer une miniature similaire.

ÉLÉMENTS SPÉCIFIQUES À DÉTECTER:
1. VISAGE: Expression (surprise/choc/joie/confiance), position (centre/gauche/droite), taille (% surface)
2. TEXTE: Mots-clés visibles, chiffres/montants, style (couleur, bordure, fond)
3. OBJETS SYMBOLIQUES: Argent, téléphone, logo, voiture, produits
4. STYLE: Palette couleurs, saturation, fond (flou/couleur/contexte)
5. MISE EN SCÈNE: Relation entre personne et objets (tenir, pointer, autour)

QUESTIONS À GÉNÉRER (personnalisées selon ce qui est détecté):
- Si visage détecté → "Voulez-vous utiliser votre propre photo ?"
- Si texte détecté → "Quel est le titre de votre vidéo ?"
- Si logos détectés → "Avez-vous des logos à inclure ?"
- Si objets symboliques → "Voulez-vous une mise en scène similaire ?"
`;
```

---

## Phase 3 : Améliorer les Questions YouTube

### Modifications de `src/config/domainQuestions.ts`

Enrichir la configuration YouTube avec des questions de mise en scène :

```typescript
youtube: {
  domain: "youtube",
  label: "Miniature YouTube",
  templateRequirements: ["face_image", "video_title"],
  questions: [
    // Q1: Titre de la vidéo (OBLIGATOIRE - contexte principal)
    {
      id: "video_title",
      question: "🎬 **Quel est le titre de votre vidéo YouTube ?**\n\nCela m'aidera à choisir les meilleurs éléments visuels.",
      type: "text",
      required: true,
      priority: 1,
    },
    // Q2: Photo propre ou générée
    {
      id: "has_own_image",
      question: "📸 **Voulez-vous utiliser votre propre photo ?**\n\nLe visage est l'élément CLÉ d'une miniature virale.\n\n• **Oui** : Envoyez une photo avec expression marquée\n• **Non** : L'IA générera un visage adapté",
      type: "boolean",
      required: true,
      priority: 2,
    },
    // Q3: Préférences de mise en scène (NOUVEAU)
    {
      id: "scene_preference",
      question: "🎭 **Comment souhaitez-vous la mise en scène ?**\n\nExemples de ce que vous pouvez demander :\n• \"Je tiens un billet de 100€ dans la main\"\n• \"Mon logo flotte à côté de ma tête\"\n• \"Des pièces d'or tombent autour de moi\"\n• \"Je pointe vers le texte\"\n• \"Je montre mon téléphone avec l'écran visible\"\n\n💡 Décrivez la scène que vous imaginez :",
      type: "text",
      required: false,
      priority: 3,
    },
    // Q4: Logos (multiples)
    {
      id: "has_logo",
      question: "🏷️ **Voulez-vous ajouter des logos ?**\n\nVous pouvez en ajouter plusieurs pour renforcer votre marque.",
      type: "boolean",
      required: false,
      priority: 4,
    },
    // Q5: Position des logos
    {
      id: "logo_position",
      question: "📍 **Où placer le(s) logo(s) ?**\n\n↖ Haut gauche | ↗ Haut droite\n◉ Centre (dans les mains/flottant)\n↙ Bas gauche | ↘ Bas droite",
      type: "choice",
      choices: ["Haut gauche", "Haut droite", "Centre (dans les mains)", "Bas gauche", "Bas droite"],
      required: false,
      priority: 5,
    },
    // Q6: Expression faciale (si IA génère le visage)
    {
      id: "desired_expression",
      question: "😮 **Quelle expression faciale ?**\n\n• 😮 Surprise/Choc (le plus viral)\n• 🤔 Concentration\n• 😊 Joie/Excitation\n• 😎 Confiance",
      type: "choice",
      choices: ["Surprise/Choc", "Concentration", "Joie/Excitation", "Confiance"],
      required: false,
      priority: 6,
    },
  ]
}
```

---

## Phase 4 : Logique de Conversation Intelligente

### Modifications de `src/hooks/useConversation.ts`

#### Cas 1 : Utilisateur clique "S'inspirer" sur une miniature YouTube

```typescript
// Quand cloneTemplate.domain === 'youtube'
if (cloneTemplate?.domain === 'youtube') {
  // 1. Analyser la miniature avec le prompt spécialisé
  const { data } = await supabase.functions.invoke("analyze-template", {
    body: { 
      imageUrl: cloneTemplate.imageUrl, 
      domain: 'youtube',
      isYouTubeThumbnail: true  // Flag pour activer l'analyse spécialisée
    },
  });
  
  // 2. Construire un message personnalisé basé sur ce qui est détecté
  let introMessage = `🎬 **Je vais créer une miniature YouTube en m'inspirant de ce style !**\n\n`;
  introMessage += `📋 J'ai détecté sur cette miniature :\n`;
  if (data.analysis.hasExpressiveFace) introMessage += `• Un visage avec expression ${data.analysis.faceExpression}\n`;
  if (data.analysis.hasText) introMessage += `• Du texte percutant (${data.analysis.textCount} mots)\n`;
  if (data.analysis.hasSymbolicObjects) introMessage += `• Des objets symboliques (${data.analysis.objects.join(', ')})\n`;
  
  introMessage += `\n📝 **Répondez à ces questions pour personnaliser votre miniature :**`;
  
  // 3. Poser les questions dans l'ordre de priorité
  // La première question est toujours le titre de la vidéo
}
```

#### Cas 2 : Utilisateur veut créer une miniature SANS référence

```typescript
// Quand domain === 'youtube' et pas de referenceImage
if (domain === 'youtube' && !referenceImage) {
  // 1. Récupérer les miniatures existantes pour s'en inspirer
  const { data: templates } = await supabase
    .from("reference_templates")
    .select("*")
    .eq("domain", "youtube");
  
  // 2. Sélectionner une miniature aléatoire comme inspiration interne
  // (l'utilisateur ne la voit pas, mais l'IA s'en inspire)
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  // 3. Utiliser le profil expert YOUTUBE_THUMBNAIL
  // + la description du template choisi comme contexte
  setConversationState(prev => ({
    ...prev,
    referenceDescription: `Style miniature virale inspiré de: ${randomTemplate.description}`,
  }));
  
  // 4. Poser les questions YouTube intelligentes
  addMessage("assistant", 
    `🎬 **Créons une miniature YouTube qui fait cliquer !**\n\n` +
    `Je vais m'inspirer des meilleures pratiques virales pour créer votre miniature.\n\n` +
    `${getDomainQuestions('youtube')[0].question}`
  );
}
```

---

## Phase 5 : Intégration des Préférences de Mise en Scène

### Modification du Prompt de Génération

Dans `supabase/functions/generate-image/index.ts`, intégrer les préférences de mise en scène :

```typescript
// Si domaine YouTube et préférences de mise en scène
if (domain === 'youtube' && scenePreference) {
  prompt += `\n\n=== MISE EN SCÈNE DEMANDÉE ===\n`;
  prompt += `Le sujet doit être montré : ${scenePreference}\n`;
  prompt += `Intégrer cette mise en scène de manière naturelle et professionnelle.\n`;
  prompt += `Les objets/logos mentionnés doivent être photoréalistes et bien intégrés.`;
}
```

---

## Résumé des Fichiers à Modifier

| Fichier | Modifications |
|---------|---------------|
| `supabase/functions/analyze-template/index.ts` | Ajouter analyse spécialisée YouTube avec détection visage/expression/objets |
| `src/config/domainQuestions.ts` | Enrichir questions YouTube avec préférences de mise en scène |
| `src/hooks/useConversation.ts` | Ajouter logique flux YouTube avec/sans référence + sélection automatique de template |
| `src/types/generation.ts` | Ajouter `scenePreference` à `YouTubeInfo` |
| `supabase/functions/generate-image/index.ts` | Intégrer les préférences de mise en scène dans le prompt |
| Migration SQL | Insérer les 12 miniatures YouTube dans `reference_templates` |

---

## Comportement Final

### Pour l'utilisateur qui clique "S'inspirer" sur une miniature

1. L'IA analyse la miniature et détecte les éléments
2. Message personnalisé : "J'ai détecté un visage expressif, du texte percutant, des symboles d'argent..."
3. Questions dans l'ordre :
   - Titre de votre vidéo ?
   - Votre propre photo ? (upload possible)
   - Mise en scène souhaitée ? (texte libre)
   - Logos à ajouter ? (upload multiple)
   - Position des logos ?
4. Génération avec le style de la référence + contenu utilisateur

### Pour l'utilisateur qui crée une miniature sans référence

1. Détection du domaine "youtube" via mots-clés (miniature, thumbnail, vignette)
2. L'IA sélectionne automatiquement une miniature de référence interne
3. Questions intelligentes basées sur le profil expert YouTube
4. Génération avec le profil YOUTUBE_THUMBNAIL + inspiration cachée
