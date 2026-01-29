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

// Prompt OPTIMISÉ pour l'analyse rapide des templates (version simplifiée pour la vitesse)
function getEnhancedAnalysisPrompt(): string {
  return `Tu es un expert graphiste. Analyse RAPIDEMENT cette affiche publicitaire.

RÉPONDS EN JSON STRICT (pas de texte avant/après):

{
  "detectedElements": {
    "peopleCount": [nombre de personnes visibles],
    "peopleDescriptions": ["description courte de chaque personne"],
    "logoCount": [nombre de logos],
    "logoPositions": ["position de chaque logo"],
    "hasPhoneNumber": true/false,
    "hasEmail": true/false,
    "hasAddress": true/false,
    "hasDate": true/false,
    "hasTime": true/false,
    "hasPrice": true/false,
    "hasSocialIcons": true/false,
    "socialPlatforms": ["nom des plateformes visibles"],
    "productCount": [nombre de produits],
    "textZones": [{"type": "title/subtitle/date/contact/price/other", "content": "texte détecté"}]
  },
  "requiredQuestions": [],
  "templateDescription": "Description courte du style et layout",
  "suggestedPrompt": "Instruction courte pour reproduire ce design"
}`;
}

// Prompt OPTIMISÉ pour l'analyse de miniatures YouTube (version rapide)
function getYouTubeAnalysisPrompt(): string {
  return `Tu es un expert en miniatures YouTube. Analyse RAPIDEMENT cette miniature.

RÉPONDS EN JSON STRICT (pas de texte avant/après):

{
  "detectedElements": {
    "peopleCount": 1,
    "peopleDescriptions": ["description du créateur"],
    "logoCount": 0,
    "logoPositions": [],
    "hasPhoneNumber": false,
    "hasEmail": false,
    "hasAddress": false,
    "hasDate": false,
    "hasTime": false,
    "hasPrice": false,
    "hasSocialIcons": false,
    "socialPlatforms": [],
    "productCount": 0,
    "textZones": [{"type": "title", "content": "texte principal"}],
    "hasExpressiveFace": true/false,
    "faceExpression": "surprise/joie/concentration",
    "hasText": true/false,
    "hasSymbolicObjects": true/false,
    "objects": ["argent", "téléphone", etc.]
  },
  "youtubeAnalysis": {
    "viralScore": "élevé/moyen/faible",
    "mainColorScheme": ["#couleur1", "#couleur2"],
    "saturationLevel": "hyper-saturée/normale",
    "compositionStyle": "centré/asymétrique",
    "suggestedStagingOptions": ["option1", "option2"]
  },
  "requiredQuestions": [],
  "templateDescription": "Description courte du style",
  "suggestedPrompt": "Instruction pour reproduire"
}`;
}
