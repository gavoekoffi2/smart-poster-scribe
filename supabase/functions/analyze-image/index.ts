import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeImageRequest {
  imageData: string; // base64 image data
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageData } = await req.json() as AnalyzeImageRequest;

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing image with Lovable AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en design graphique et en analyse visuelle. 
Analyse l'image fournie et génère une description TRÈS détaillée qui servira de template pour créer des affiches similaires.

Ta description doit inclure :
1. COMPOSITION : Disposition des éléments, zones principales, hiérarchie visuelle
2. COULEURS : Palette dominante, accents, dégradés, contraste
3. TYPOGRAPHIE : Style des textes, tailles relatives, placement
4. STYLE ARTISTIQUE : Tendance (moderne, rétro, minimaliste, etc.), ambiance
5. ÉLÉMENTS VISUELS : Formes, icônes, illustrations, photos
6. EFFETS : Ombres, lumières, textures, filtres
7. ÉMOTION : Sentiment général transmis par le design

Génère cette description en français, de manière structurée et utilisable comme prompt pour la génération d'images.
La description doit faire entre 200 et 400 mots.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse cette image et génère un template de description détaillé pour créer des affiches dans le même style :"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze image", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content;

    if (!description) {
      console.error("No description in response:", data);
      return new Response(
        JSON.stringify({ error: "No description generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Image analyzed successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        description
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
