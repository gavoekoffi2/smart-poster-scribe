import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateImageRequest {
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
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

    const { prompt, aspectRatio = "1:1", resolution = "1K", outputFormat = "png" } = await req.json() as GenerateImageRequest;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating image with Lovable AI...");
    console.log("Prompt:", prompt.substring(0, 200) + "...");
    console.log("Parameters:", { aspectRatio, resolution, outputFormat });

    // Calculate dimensions based on aspect ratio
    const dimensions = getImageDimensions(aspectRatio, resolution);
    
    // Use Lovable AI Gateway (Nano Banana Pro) via chat completions for image generation
    const sizedPrompt = [
      prompt,
      "",
      "Contraintes de sortie (IMPORTANT):",
      "- Génère UNE image uniquement.",
      "- Ne fournis aucune explication, aucun raisonnement, aucun texte hors image.",
      `- Respecte le ratio ${aspectRatio}.`,
      `- Taille cible ~ ${dimensions.width}x${dimensions.height} pixels.`,
      `- Format souhaité: ${outputFormat}.`,
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "system",
            content:
              "Tu es un générateur d'images. Réponds avec une image (et éventuellement un court texte), sans raisonnement.",
          },
          {
            role: "user",
            content: sizedPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI API error:", response.status, errorText);

      // Surface common Lovable AI billing/rate-limit errors
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants. Ajoutez des crédits et réessayez." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          error: "Failed to generate image",
          details: errorText,
          status: response.status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    console.log("Lovable AI response received");

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image URL in response:", data);
      return new Response(
        JSON.stringify({ error: "No image URL in response", details: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Image generated successfully");
    
    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl,
        taskId: crypto.randomUUID(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getImageDimensions(aspectRatio: string, resolution: string): { width: number; height: number } {
  // Base size based on resolution
  const baseSize = resolution === "2K" ? 1024 : resolution === "4K" ? 1536 : 512;
  
  const ratios: Record<string, { w: number; h: number }> = {
    "1:1": { w: 1, h: 1 },
    "4:3": { w: 4, h: 3 },
    "3:4": { w: 3, h: 4 },
    "16:9": { w: 16, h: 9 },
    "9:16": { w: 9, h: 16 },
    "3:2": { w: 3, h: 2 },
    "2:3": { w: 2, h: 3 },
  };
  
  const ratio = ratios[aspectRatio] || ratios["1:1"];
  
  // Calculate dimensions maintaining aspect ratio
  if (ratio.w >= ratio.h) {
    const width = baseSize;
    const height = Math.round((baseSize * ratio.h) / ratio.w);
    return { width, height };
  } else {
    const height = baseSize;
    const width = Math.round((baseSize * ratio.w) / ratio.h);
    return { width, height };
  }
}
