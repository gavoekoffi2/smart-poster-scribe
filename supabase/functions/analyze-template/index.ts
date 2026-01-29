import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DetectedElements {
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
  // Legacy compatibility fields
  hasTitle?: boolean;
  hasSubtitle?: boolean;
  hasLocation?: boolean;
  hasContact?: boolean;
  hasSpeaker?: boolean;
  hasOrganizer?: boolean;
  hasMenu?: boolean;
  hasProducts?: boolean;
  hasLogo?: boolean;
  hasMultiplePeople?: boolean;
  hasGuests?: boolean;
  hasExpressiveFace?: boolean;
  faceExpression?: string;
  hasText?: boolean;
  hasSymbolicObjects?: boolean;
  objects?: string[];
}

interface TemplateAnalysisResult {
  detectedElements: DetectedElements;
  requiredQuestions: Array<{
    id: string;
    question: string;
    type: "text" | "multiline" | "image" | "boolean" | "choice";
    placeholder?: string;
    required: boolean;
    options?: string[];
    allowMultipleImages?: boolean;
    maxImages?: number;
    offerAutoGenerate?: boolean;
  }>;
  templateDescription: string;
  suggestedPrompt: string;
  designAnalysis?: {
    layout: string;
    typography: string;
    colors: string;
    effects: string;
    mood: string;
  };
  youtubeAnalysis?: {
    viralScore: string;
    mainColorScheme: string[];
    saturationLevel: string;
    compositionStyle: string;
    suggestedStagingOptions: string[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { imageUrl, domain, existingDescription, isYouTubeThumbnail } = body;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Analyzing template image:", imageUrl.substring(0, 100));
    console.log("Domain:", domain);
    console.log("Is YouTube Thumbnail:", isYouTubeThumbnail);

    // Fetch the image and convert to base64 if it's a local path
    let imageContent: { type: "image_url"; image_url: { url: string } };
    
    if (imageUrl.startsWith("data:image/")) {
      imageContent = { type: "image_url", image_url: { url: imageUrl } };
    } else {
      // For URLs, we'll pass them directly to the vision model
      imageContent = { type: "image_url", image_url: { url: imageUrl } };
    }
    
    // Utiliser un prompt spécialisé pour les miniatures YouTube
    const systemPrompt = (isYouTubeThumbnail || domain === 'youtube') 
      ? getYouTubeAnalysisPrompt() 
      : getEnhancedAnalysisPrompt();

    const userMessage = existingDescription 
      ? `Analyse cette image. Contexte: domaine "${domain}". Description existante: "${existingDescription}"`
      : `Analyse cette image. Domaine détecté: "${domain || 'non spécifié'}"`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: userMessage },
              imageContent
            ]
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Return default questions as fallback
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: getDefaultAnalysis(domain),
          warning: "Analyse simplifiée"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: getDefaultAnalysis(domain) 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let analysis: TemplateAnalysisResult;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleanContent);
      
      // Ensure compatibility by setting legacy fields
      if (analysis.detectedElements) {
        const de = analysis.detectedElements;
        de.hasTitle = (de.textZones?.some(z => z.type === 'title')) || true;
        de.hasLocation = de.hasAddress;
        de.hasContact = de.hasPhoneNumber || de.hasEmail;
        de.hasSpeaker = de.peopleCount > 0;
        de.hasLogo = de.logoCount > 0;
        de.hasMultiplePeople = de.peopleCount > 1;
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      analysis = getDefaultAnalysis(domain);
    }

    console.log("Template analysis result:", JSON.stringify(analysis));

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-template function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDefaultAnalysis(domain?: string): TemplateAnalysisResult {
  const baseQuestions = [
    {
      id: "title",
      question: "Quel est le titre ou thème de votre affiche ?",
      type: "text" as const,
      placeholder: "Ex: Grande Veillée de Prière",
      required: true
    },
    {
      id: "details",
      question: "Quelles informations voulez-vous afficher ? (dates, lieu, contact, prix...)",
      type: "multiline" as const,
      placeholder: "Décrivez toutes les informations à inclure",
      required: false
    }
  ];

  return {
    detectedElements: {
      peopleCount: 0,
      peopleDescriptions: [],
      logoCount: 0,
      logoPositions: [],
      hasPhoneNumber: false,
      hasEmail: false,
      hasAddress: false,
      hasDate: false,
      hasTime: false,
      hasPrice: false,
      hasSocialIcons: false,
      socialPlatforms: [],
      productCount: 0,
      textZones: [],
      hasTitle: true,
      hasSubtitle: false,
      hasLocation: false,
      hasContact: false,
      hasSpeaker: false,
      hasOrganizer: false,
      hasMenu: false,
      hasProducts: false,
      hasLogo: false
    },
    requiredQuestions: baseQuestions,
    templateDescription: "Template professionnel",
    suggestedPrompt: "Reproduire le style et la mise en page de cette affiche"
  };
}

// Prompt enrichi pour l'analyse exhaustive des templates
function getEnhancedAnalysisPrompt(): string {
  return `Tu es un expert graphiste spécialisé dans l'analyse EXHAUSTIVE d'affiches publicitaires africaines pour le CLONAGE PERSONNALISÉ.

🎯 OBJECTIF PRINCIPAL:
Analyser cette affiche avec PRÉCISION pour permettre un clonage PARFAIT où l'utilisateur remplace TOUS les éléments avec son propre contenu.
Le système doit savoir EXACTEMENT ce qui doit être remplacé ou supprimé.

⚠️ RÈGLE FONDAMENTALE - ZÉRO INFORMATION ORIGINALE:
TOUT ce qui est identifié sur cette affiche devra être soit:
1. REMPLACÉ par les données de l'utilisateur
2. SUPPRIMÉ si l'utilisateur ne fournit pas d'équivalent

ANALYSE REQUISE - COMPTAGE PRÉCIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 👥 PERSONNES/VISAGES:
   - Compte EXACT du nombre de personnes/visages visibles
   - Description de chaque personne (ex: "homme en costume", "femme avec micro")
   - Position de chaque personne (gauche, centre, droite)
   - Ces personnes devront être REMPLACÉES ou SUPPRIMÉES

2. 🏷️ LOGOS:
   - Nombre EXACT de logos visibles
   - Position de chaque logo (haut-gauche, bas-droite, etc.)
   - Ces logos devront être REMPLACÉS ou SUPPRIMÉS

3. 📝 ZONES DE TEXTE (liste chaque zone séparément):
   - Titre principal: contenu et position
   - Sous-titre: contenu et position
   - Dates: format et position
   - Heures: format et position
   - Lieu/Adresse: contenu et position
   - Contact (téléphone, email): format et position
   - Prix/Tarifs: format et position
   - Noms d'orateurs/artistes: format et position
   - Organisateur: format et position
   - Réseaux sociaux: plateformes visibles

4. 🛍️ PRODUITS/OBJETS:
   - Nombre de produits visibles
   - Type de chaque produit
   - Ces produits devront être REMPLACÉS ou SUPPRIMÉS

5. 🎨 DESIGN (À REPRODUIRE - ne pas demander):
   - Layout général
   - Style typographique
   - Palette de couleurs
   - Effets visuels
   - Éléments décoratifs (à conserver)

FORMAT DE RÉPONSE (JSON strict):
{
  "detectedElements": {
    "peopleCount": [nombre exact de personnes],
    "peopleDescriptions": ["description personne 1", "description personne 2"],
    "logoCount": [nombre exact de logos],
    "logoPositions": ["position logo 1", "position logo 2"],
    "hasPhoneNumber": true/false,
    "hasEmail": true/false,
    "hasAddress": true/false,
    "hasDate": true/false,
    "hasTime": true/false,
    "hasPrice": true/false,
    "hasSocialIcons": true/false,
    "socialPlatforms": ["Facebook", "Instagram", "WhatsApp"],
    "productCount": [nombre de produits],
    "textZones": [
      {"type": "title", "content": "Texte du titre détecté"},
      {"type": "subtitle", "content": "Texte du sous-titre"},
      {"type": "date", "content": "Format de date détecté"},
      {"type": "time", "content": "Format d'heure"},
      {"type": "location", "content": "Texte du lieu"},
      {"type": "contact", "content": "Format contact"},
      {"type": "price", "content": "Format prix"},
      {"type": "speaker", "content": "Noms des orateurs"},
      {"type": "organizer", "content": "Nom organisateur"}
    ]
  },
  "requiredQuestions": [
    {
      "id": "people_photos",
      "question": "J'ai détecté [X] personne(s) sur cette affiche. Souhaitez-vous :\\n• Envoyer vos propres photos\\n• Que je génère automatiquement des personnes africaines\\n• Créer l'affiche sans personnes",
      "type": "choice",
      "options": ["Fournir mes photos", "Générer automatiquement", "Sans personnes"],
      "required": true,
      "allowMultipleImages": true,
      "maxImages": [nombre de personnes],
      "offerAutoGenerate": true
    },
    {
      "id": "logos",
      "question": "L'affiche contient [X] logo(s). Voulez-vous ajouter votre/vos logo(s) ?",
      "type": "choice",
      "options": ["Envoyer mon logo", "Sans logo"],
      "required": false,
      "allowMultipleImages": true,
      "maxImages": [nombre de logos]
    }
  ],
  "templateDescription": "Description COMPLÈTE du layout, style typographique, effets visuels, composition et ambiance",
  "suggestedPrompt": "Instructions précises pour reproduire ce design avec un nouveau contenu",
  "designAnalysis": {
    "layout": "Description de la mise en page",
    "typography": "Styles de polices utilisés",
    "colors": "Palette de couleurs dominantes",
    "effects": "Effets visuels (lumières, ombres, etc.)",
    "mood": "Ambiance générale (festif, spirituel, corporate, etc.)"
  }
}

RÈGLES CRITIQUES POUR LES QUESTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Si des PERSONNES sont détectées → Question avec 3 options:
   - "Fournir mes photos" (permettre upload multiple jusqu'au nombre détecté)
   - "Générer automatiquement" (l'IA créera des personnes africaines nouvelles)
   - "Sans personnes" (supprimer cette zone de l'affiche)

2. Si des LOGOS sont détectés → Question:
   - "Envoyer mon logo"
   - "Sans logo" (supprimer tous les logos)

3. Pour les TEXTES → Générer une question consolidée demandant toutes les infos:
   - Titre
   - Dates/Heures (si détectés)
   - Lieu (si détecté)
   - Contact (si détecté)
   - Prix (si détecté)
   - Orateurs/Artistes (si détectés)

4. Si des PRODUITS sont détectés → Question similaire aux personnes

⚠️ IMPORTANT:
- Compte PRÉCISÉMENT chaque élément
- Chaque élément détecté = une donnée à remplacer ou supprimer
- Si l'utilisateur ne fournit pas d'équivalent → l'élément sera SUPPRIMÉ`;
}

// Prompt spécialisé pour l'analyse de miniatures YouTube
function getYouTubeAnalysisPrompt(): string {
  return `Tu es un EXPERT en miniatures YouTube virales, spécialisé dans l'analyse pour permettre à l'utilisateur de créer une miniature similaire.

🎯 OBJECTIF: Analyser cette MINIATURE YOUTUBE pour permettre à l'utilisateur de créer une miniature personnalisée avec le MÊME STYLE VISUEL.

ÉLÉMENTS SPÉCIFIQUES À DÉTECTER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. VISAGE HUMAIN (élément CLÉ des miniatures virales):
   - Expression faciale: surprise/choc, joie, concentration, confiance, colère
   - Position: centre, gauche, droite
   - Taille approximative: % de la surface (ex: "30-40% de l'image")
   - Angle: face, 3/4, profil
   - Éclairage: dramatique, studio, naturel

2. TEXTE PERCUTANT:
   - Mots-clés visibles (liste exacte)
   - Nombre de mots (les meilleures miniatures ont 3-7 mots max)
   - Style: gras, contour, ombre, 3D, dégradé
   - Couleurs du texte
   - Position du texte par rapport au visage

3. OBJETS SYMBOLIQUES:
   - Argent/Billets: présence, position, interaction avec la personne
   - Téléphone/Écrans: présence, ce qu'ils montrent
   - Voitures/Luxe: présence
   - Logos: nombre, positions
   - Flèches/Indicateurs: présence, direction
   - Produits/Objets thématiques

4. MISE EN SCÈNE:
   - La personne tient-elle quelque chose? (objet dans les mains)
   - Y a-t-il des éléments flottants autour?
   - Interaction entre la personne et les objets

5. STYLE VISUEL:
   - Palette couleurs dominante
   - Saturation: normale, hyper-saturée
   - Contraste: normal, dramatique
   - Fond: couleur unie, dégradé, contexte réel, flou
   - Effets: glow, particules, lumières

FORMAT DE RÉPONSE (JSON strict):
{
  "detectedElements": {
    "peopleCount": 1,
    "peopleDescriptions": ["description du créateur/personnage"],
    "logoCount": [nombre de logos],
    "logoPositions": ["positions"],
    "hasPhoneNumber": false,
    "hasEmail": false,
    "hasAddress": false,
    "hasDate": false,
    "hasTime": false,
    "hasPrice": false,
    "hasSocialIcons": false,
    "socialPlatforms": [],
    "productCount": [nombre d'objets/produits],
    "textZones": [
      {"type": "title", "content": "Texte principal de la miniature"}
    ],
    "hasExpressiveFace": true/false,
    "faceExpression": "surprise/joie/concentration/confiance",
    "hasText": true/false,
    "hasSymbolicObjects": true/false,
    "objects": ["argent", "téléphone", "voiture"]
  },
  "youtubeAnalysis": {
    "viralScore": "élevé/moyen/faible",
    "mainColorScheme": ["#couleur1", "#couleur2"],
    "saturationLevel": "hyper-saturée/normale",
    "compositionStyle": "centré sur visage/asymétrique/texte dominant",
    "suggestedStagingOptions": [
      "Tenir un billet/téléphone",
      "Pointer vers le texte",
      "Éléments flottants autour"
    ]
  },
  "requiredQuestions": [
    {
      "id": "video_title",
      "question": "Quel est le titre de votre vidéo YouTube ?",
      "type": "text",
      "placeholder": "Ex: Comment j'ai gagné 10 000€ en 30 jours",
      "required": true
    },
    {
      "id": "user_photo",
      "question": "Souhaitez-vous utiliser votre propre photo ou que je génère un visage ?",
      "type": "choice",
      "options": ["Envoyer ma photo", "Générer automatiquement"],
      "required": true,
      "allowMultipleImages": false,
      "maxImages": 1,
      "offerAutoGenerate": true
    }
  ],
  "templateDescription": "Description du style visuel pour reproduction",
  "suggestedPrompt": "Miniature YouTube style viral avec..."
}

⚠️ IMPORTANT: Le visage expressif est l'élément CLÉ. Analyse-le en détail pour que l'utilisateur puisse reproduire l'impact émotionnel.`;
}
