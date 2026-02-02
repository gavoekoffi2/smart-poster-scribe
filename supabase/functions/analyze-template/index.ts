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

// Prompt OPTIMISÉ pour l'analyse EXHAUSTIVE des templates - extraction de TOUS les textes et objets
function getEnhancedAnalysisPrompt(): string {
  return `Tu es un expert graphiste. Analyse cette affiche publicitaire de manière EXHAUSTIVE.

🎯 MISSION CRITIQUE: Extraire le contenu EXACT de CHAQUE zone de texte visible ET identifier TOUS les objets/icônes.

RÉPONDS EN JSON STRICT (pas de texte avant/après):

{
  "detectedElements": {
    "peopleCount": [nombre de personnes visibles],
    "peopleDescriptions": ["description courte de chaque personne"],
    "logoCount": [nombre de logos],
    "logoPositions": ["position de chaque logo: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right"],
    "hasPhoneNumber": true/false,
    "hasEmail": true/false,
    "hasAddress": true/false,
    "hasDate": true/false,
    "hasTime": true/false,
    "hasPrice": true/false,
    "hasSocialIcons": true/false,
    "socialPlatforms": ["nom des plateformes visibles"],
    "productCount": [nombre de produits],
    "textZones": [
      {
        "type": "title",
        "content": "[TEXTE EXACT du titre principal - copier mot pour mot]",
        "position": "position sur l'affiche"
      },
      {
        "type": "subtitle",
        "content": "[TEXTE EXACT du sous-titre ou slogan - copier mot pour mot]",
        "position": "position"
      },
      {
        "type": "date",
        "content": "[DATE EXACTE visible - ex: '15 JANVIER 2025']",
        "position": "position"
      },
      {
        "type": "time",
        "content": "[HEURE EXACTE visible - ex: 'À PARTIR DE 20H']",
        "position": "position"
      },
      {
        "type": "location",
        "content": "[LIEU/ADRESSE EXACT - copier mot pour mot]",
        "position": "position"
      },
      {
        "type": "contact",
        "content": "[NUMÉRO/EMAIL EXACT - ex: '+237 6XX XX XX XX']",
        "position": "position"
      },
      {
        "type": "price",
        "content": "[PRIX EXACT - ex: '5000 FCFA']",
        "position": "position"
      },
      {
        "type": "speaker",
        "content": "[NOM EXACT de l'orateur/artiste/invité]",
        "position": "position"
      },
      {
        "type": "slogan",
        "content": "[SLOGAN ou phrase d'accroche EXACTE]",
        "position": "position"
      },
      {
        "type": "tagline",
        "content": "[Phrase secondaire, accroche marketing]",
        "position": "position"
      },
      {
        "type": "organizer",
        "content": "[Nom de l'organisateur/église/entreprise]",
        "position": "position"
      },
      {
        "type": "social",
        "content": "[Handles réseaux sociaux - ex: '@moncompte']",
        "position": "position"
      },
      {
        "type": "other",
        "content": "[Tout autre texte visible non catégorisé]",
        "position": "position"
      }
    ],
    "decorativeElements": {
      "icons": ["liste des icônes visibles: croix, micro, fourchette, diplôme, etc."],
      "symbols": ["liste des symboles: €, FCFA, %, ★, cœur, etc."],
      "domainSpecificItems": ["objets spécifiques au domaine: bible, autel, toque de chef, certificat, ballon, etc."]
    }
  },
  "requiredQuestions": [],
  "templateDescription": "Description du style visuel et de la mise en page",
  "suggestedPrompt": "Instruction pour reproduire ce design"
}

⚠️ RÈGLES CRITIQUES POUR textZones:
1. Lister CHAQUE zone de texte visible, même les petites
2. Copier le contenu EXACT (mot pour mot, chiffre pour chiffre)
3. Ne pas inventer - si tu ne peux pas lire, mettre "[illisible]"
4. Inclure les accroches, slogans, phrases secondaires (type "slogan" ou "tagline")
5. Positions valides: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right

⚠️ RÈGLES CRITIQUES POUR decorativeElements:
1. Lister TOUS les objets/icônes visibles sur l'affiche
2. Identifier les icônes de réseaux sociaux (Facebook, Instagram, WhatsApp, etc.)
3. Identifier les symboles religieux (croix, bible, colombe, etc.)
4. Identifier les objets liés au domaine (fourchette/restaurant, diplôme/formation, micro/musique, etc.)
5. Ne pas inclure les éléments purement décoratifs abstraits (formes géométriques simples)`;
}

// Prompt OPTIMISÉ pour l'analyse EXHAUSTIVE de miniatures YouTube
function getYouTubeAnalysisPrompt(): string {
  return `Tu es un expert en miniatures YouTube. Analyse cette miniature de manière EXHAUSTIVE.

🎯 MISSION: Extraire le contenu EXACT de CHAQUE élément textuel visible ET identifier les objets/icônes.

RÉPONDS EN JSON STRICT (pas de texte avant/après):

{
  "detectedElements": {
    "peopleCount": [nombre de personnes],
    "peopleDescriptions": ["description détaillée de chaque personne: pose, expression, vêtements"],
    "logoCount": [nombre de logos],
    "logoPositions": ["position de chaque logo"],
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
      {
        "type": "title",
        "content": "[TEXTE PRINCIPAL EXACT de la miniature]",
        "position": "position"
      },
      {
        "type": "subtitle",
        "content": "[TEXTE SECONDAIRE EXACT si présent]",
        "position": "position"
      },
      {
        "type": "tagline",
        "content": "[Accroche ou phrase choc]",
        "position": "position"
      },
      {
        "type": "other",
        "content": "[Tout autre texte visible]",
        "position": "position"
      }
    ],
    "decorativeElements": {
      "icons": ["icônes visibles: play button, subscribe, notification, etc."],
      "symbols": ["symboles: €, $, flèches, émojis, etc."],
      "domainSpecificItems": ["objets: argent, téléphone, voiture, ordinateur, etc."]
    },
    "hasExpressiveFace": true/false,
    "faceExpression": "surprise/joie/concentration/choc/excitation",
    "hasText": true/false,
    "hasSymbolicObjects": true/false,
    "objects": ["liste des objets symboliques: argent, téléphone, voiture, etc."]
  },
  "youtubeAnalysis": {
    "viralScore": "élevé/moyen/faible",
    "mainColorScheme": ["#couleur1", "#couleur2", "#couleur3"],
    "saturationLevel": "hyper-saturée/saturée/normale",
    "compositionStyle": "centré/asymétrique/rule-of-thirds",
    "suggestedStagingOptions": ["option de mise en scène 1", "option 2", "option 3"]
  },
  "requiredQuestions": [],
  "templateDescription": "Description détaillée du style visuel",
  "suggestedPrompt": "Instructions pour reproduire ce style de miniature"
}

⚠️ RÈGLES POUR textZones:
1. Copier le texte EXACTEMENT comme affiché
2. Inclure TOUS les textes visibles, même petits
3. Spécifier la position de chaque texte

⚠️ RÈGLES POUR decorativeElements:
1. Lister TOUS les objets visibles (argent, téléphone, voiture, etc.)
2. Identifier les icônes YouTube (play button, subscribe, etc.)
3. Ces éléments sont importants pour la mise en scène`;
}
