import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplateAnalysisResult {
  detectedElements: {
    hasTitle: boolean;
    hasDate: boolean;
    hasTime: boolean;
    hasLocation: boolean;
    hasContact: boolean;
    hasPrice: boolean;
    hasSpeaker: boolean;
    hasMenu: boolean;
    hasProducts: boolean;
    hasLogo: boolean;
  };
  requiredQuestions: Array<{
    id: string;
    question: string;
    type: "text" | "multiline";
    placeholder: string;
    required: boolean;
  }>;
  templateDescription: string;
  suggestedPrompt: string;
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
    const { imageUrl, domain, existingDescription } = body;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Analyzing template image:", imageUrl.substring(0, 100));
    console.log("Domain:", domain);

    // Fetch the image and convert to base64 if it's a local path
    let imageContent: { type: "image_url"; image_url: { url: string } };
    
    if (imageUrl.startsWith("data:image/")) {
      imageContent = { type: "image_url", image_url: { url: imageUrl } };
    } else {
      // For URLs, we'll pass them directly to the vision model
      imageContent = { type: "image_url", image_url: { url: imageUrl } };
    }

    const systemPrompt = `Tu es un expert graphiste qui analyse des affiches/flyers pour comprendre leur structure et les informations qu'elles contiennent.

OBJECTIF: Analyser l'affiche fournie pour:
1. Identifier TOUS les éléments textuels/visuels présents
2. Déterminer quelles informations l'utilisateur devra fournir pour créer une affiche similaire avec SES propres données

ANALYSE VISUELLE - Cherche:
- Un titre principal ou slogan
- Des dates (jour, mois, année)
- Des horaires/heures
- Un lieu/adresse
- Des contacts (téléphone, WhatsApp, email, réseaux sociaux)
- Des prix/tarifs
- Des orateurs/artistes/personnes mises en avant
- Un menu ou liste de plats (pour restaurant)
- Des produits affichés
- Un logo d'entreprise/organisation

RÈGLE IMPORTANTE:
- Ne demande QUE les informations VISIBLES sur l'affiche originale
- Si l'affiche n'a pas de prix → NE demande PAS de prix
- Si l'affiche n'a pas de contact → NE demande PAS de contact
- Si l'affiche n'a pas de lieu → NE demande PAS de lieu
- Concentre-toi sur ce qui est PRÉSENT pour le remplacer

FORMAT DE RÉPONSE (JSON strict):
{
  "detectedElements": {
    "hasTitle": true/false,
    "hasDate": true/false,
    "hasTime": true/false,
    "hasLocation": true/false,
    "hasContact": true/false,
    "hasPrice": true/false,
    "hasSpeaker": true/false,
    "hasMenu": true/false,
    "hasProducts": true/false,
    "hasLogo": true/false
  },
  "requiredQuestions": [
    {
      "id": "title",
      "question": "Quel est le titre ou thème de votre affiche ?",
      "type": "text",
      "placeholder": "Ex: Grande Veillée de Prière",
      "required": true
    }
    // Ajoute SEULEMENT les questions pour les éléments DÉTECTÉS sur l'affiche
  ],
  "templateDescription": "Description courte du style et layout de l'affiche",
  "suggestedPrompt": "Instructions pour reproduire ce style de design"
}

QUESTIONS TYPES selon les éléments détectés:
- hasTitle → demander le titre/thème
- hasDate → demander la date de l'événement
- hasTime → demander l'heure
- hasLocation → demander le lieu/adresse
- hasContact → demander les contacts (téléphone, email, etc.)
- hasPrice → demander les prix/tarifs
- hasSpeaker → demander le nom de l'orateur/artiste et son titre
- hasMenu → demander les plats/boissons du menu
- hasProducts → demander les noms/descriptions des produits
- hasLogo → demander si l'utilisateur a un logo à inclure

IMPORTANT: La question sur le titre est TOUJOURS obligatoire (required: true).
Les autres questions sont required: false sauf si vraiment essentielles.`;

    const userMessage = existingDescription 
      ? `Analyse cette affiche. Contexte: domaine "${domain}". Description existante: "${existingDescription}"`
      : `Analyse cette affiche. Domaine détecté: "${domain || 'non spécifié'}"`;

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
      hasTitle: true,
      hasDate: false,
      hasTime: false,
      hasLocation: false,
      hasContact: false,
      hasPrice: false,
      hasSpeaker: false,
      hasMenu: false,
      hasProducts: false,
      hasLogo: false
    },
    requiredQuestions: baseQuestions,
    templateDescription: "Template professionnel",
    suggestedPrompt: "Reproduire le style et la mise en page de cette affiche"
  };
}
