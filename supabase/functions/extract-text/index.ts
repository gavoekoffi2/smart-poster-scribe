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
            content: `Tu es un expert en extraction de texte depuis des affiches et flyers. 
Analyse l'image et identifie TOUS les blocs de texte visibles, des plus grands aux plus petits.

INSTRUCTIONS CRITIQUES:
1. Pour chaque bloc de texte, estime sa position (x, y) en pourcentage de l'image (0-100)
2. x=0 est le bord gauche, x=100 est le bord droit
3. y=0 est le bord supérieur, y=100 est le bord inférieur
4. La taille de police doit être estimée en pixels (généralement entre 14 et 120px pour les affiches)

FORMAT DE RÉPONSE (JSON uniquement, pas de texte autour):
[
  {"text": "TITRE PRINCIPAL", "x": 10, "y": 5, "width": 80, "height": 10, "fontSize": 72},
  {"text": "Sous-titre", "x": 15, "y": 18, "width": 70, "height": 5, "fontSize": 36}
]

RÈGLES:
- Retourne UNIQUEMENT le tableau JSON, aucun autre texte
- Si aucun texte trouvé, retourne []
- Inclus TOUT le texte visible: titres, sous-titres, dates, lieux, contacts, etc.
- Groupe les lignes connexes si elles forment un bloc logique`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrais tous les textes de cette affiche avec leurs positions. Retourne uniquement le JSON."
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
      console.log("Parsed AI response:", JSON.stringify(parsed));
      
      if (Array.isArray(parsed)) {
        // Keep positions as percentages (0-100) - the frontend will convert them
        textBlocks = parsed.map((block: any) => ({
          text: String(block.text || "").trim(),
          // Store as percentage values (0-100)
          x: Math.max(0, Math.min(100, Number(block.x) || 0)),
          y: Math.max(0, Math.min(100, Number(block.y) || 0)),
          width: Math.max(5, Math.min(100, Number(block.width) || 20)),
          height: Math.max(2, Math.min(50, Number(block.height) || 5)),
          confidence: 95, // AI extraction is generally reliable
          fontSize: Math.max(12, Math.min(150, Number(block.fontSize) || 32)),
        })).filter((block: TextBlock) => block.text.length > 0);
        
        console.log("Processed text blocks:", JSON.stringify(textBlocks));
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content, parseError);
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
