import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractTextRequest {
  imageData: string; // base64 image data or URL
}

interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  fontSize?: number;
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

    const body = await req.json();
    const { imageData } = body as ExtractTextRequest;

    if (!imageData || typeof imageData !== 'string') {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Extracting text from image with Lovable AI...");

    // Use Gemini vision to extract text with positions
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
            content: `Tu es un expert en extraction de texte depuis des images. 
Analyse l'image et identifie TOUS les blocs de texte visibles.

Pour chaque bloc de texte trouvé, retourne:
- Le texte exact
- Sa position approximative en pourcentage (x, y depuis le coin supérieur gauche)
- Sa largeur et hauteur approximatives en pourcentage
- La taille de police estimée en pixels

IMPORTANT: 
- Retourne UNIQUEMENT un tableau JSON valide, sans aucun autre texte
- Le format est: [{"text": "...", "x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100, "fontSize": 12-200}]
- Si aucun texte n'est trouvé, retourne []
- Inclus TOUT le texte visible, même les petits textes`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse cette image et extrais tous les blocs de texte avec leurs positions. Retourne UNIQUEMENT le tableau JSON, rien d'autre."
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
        JSON.stringify({ error: "Failed to extract text", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "[]";

    // Clean up the response - extract JSON array from the content
    content = content.trim();
    
    // Try to extract JSON array from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }
    
    // Parse the JSON
    let textBlocks: TextBlock[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        // Convert percentage positions to pixel approximations (assuming 1000x1000 canvas)
        textBlocks = parsed.map((block: any, index: number) => ({
          text: String(block.text || ""),
          x: Math.round((Number(block.x) || 0) * 10), // Convert % to approx pixels (assuming 1000px width)
          y: Math.round((Number(block.y) || 0) * 10),
          width: Math.round((Number(block.width) || 10) * 10),
          height: Math.round((Number(block.height) || 5) * 10),
          confidence: 95, // AI extraction is generally reliable
          fontSize: Number(block.fontSize) || 24,
        })).filter((block: TextBlock) => block.text.trim().length > 0);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return empty array if parsing fails
      textBlocks = [];
    }

    console.log("Text extraction complete, found", textBlocks.length, "blocks");

    return new Response(
      JSON.stringify({ 
        success: true,
        textBlocks
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in extract-text function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
