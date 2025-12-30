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
  referenceImage?: string; // Base64 de l'image de référence (style)
  contentImage?: string;   // Base64 de l'image de contenu à intégrer
}

interface NanoBananaResponse {
  choices?: Array<{
    message?: {
      content?: string;
      images?: Array<{
        type: string;
        image_url: {
          url: string;
        };
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

function buildProfessionalPrompt({
  userPrompt,
  hasReferenceImage,
  hasContentImage,
  aspectRatio,
}: {
  userPrompt: string;
  hasReferenceImage: boolean;
  hasContentImage: boolean;
  aspectRatio: string;
}): string {
  const instructions: string[] = [];

  // Instructions de base pour une affiche professionnelle
  instructions.push("Create a professional advertising poster with the following specifications:");
  instructions.push(`- Format: ${aspectRatio} aspect ratio`);
  instructions.push("- High-quality graphic design suitable for print");
  instructions.push("- Clean, legible typography with clear visual hierarchy");
  instructions.push("- Modern, polished aesthetic");
  instructions.push("- African characters with authentic features when people are shown");
  
  // Instructions spécifiques si image de référence
  if (hasReferenceImage) {
    instructions.push("");
    instructions.push("CRITICAL - STYLE REFERENCE:");
    instructions.push("- Reproduce EXACTLY the visual style, composition, and layout from the reference image");
    instructions.push("- Match the typography style, color scheme, and design elements");
    instructions.push("- Keep the same professional aesthetic and visual hierarchy");
    instructions.push("- Adapt the style to the new content while maintaining visual consistency");
  }
  
  // Instructions spécifiques si image de contenu
  if (hasContentImage) {
    instructions.push("");
    instructions.push("CRITICAL - CONTENT IMAGE:");
    instructions.push("- INTEGRATE the provided content image prominently in the poster");
    instructions.push("- The content image should be the main visual element");
    instructions.push("- Position it professionally within the layout");
    instructions.push("- Do NOT replace or generate a different image - USE the one provided");
  }
  
  // Instructions générales
  instructions.push("");
  instructions.push("IMPORTANT RULES:");
  instructions.push("- Do NOT display any color codes, hex values, or technical text");
  instructions.push("- All text on the poster must be from the user's specifications");
  instructions.push("- Apply colors harmoniously throughout the design");
  instructions.push("- Ensure professional print quality");
  
  // Ajouter le prompt utilisateur
  instructions.push("");
  instructions.push("USER SPECIFICATIONS:");
  instructions.push(userPrompt);
  
  return instructions.join("\n");
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
      return new Response(JSON.stringify({ error: "Clé API Lovable non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      prompt,
      aspectRatio = "3:4",
      referenceImage,
      contentImage,
    } = (await req.json()) as GenerateImageRequest;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Le prompt est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasReferenceImage = !!referenceImage;
    const hasContentImage = !!contentImage;
    
    console.log("Generating with Nano Banana Pro (Gemini Flash Image)");
    console.log("Has reference image:", hasReferenceImage);
    console.log("Has content image:", hasContentImage);
    console.log("Aspect ratio:", aspectRatio);

    // Construire le prompt professionnel
    const finalPrompt = buildProfessionalPrompt({
      userPrompt: prompt,
      hasReferenceImage,
      hasContentImage,
      aspectRatio,
    });
    
    console.log("Final prompt length:", finalPrompt.length);
    console.log("Prompt preview:", finalPrompt.substring(0, 500) + "...");

    // Construire le contenu du message avec les images
    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    
    // Ajouter le prompt textuel
    messageContent.push({
      type: "text",
      text: finalPrompt,
    });
    
    // Ajouter l'image de référence si présente
    if (referenceImage) {
      console.log("Adding reference image to request");
      messageContent.push({
        type: "image_url",
        image_url: {
          url: referenceImage,
        },
      });
    }
    
    // Ajouter l'image de contenu si présente
    if (contentImage) {
      console.log("Adding content image to request");
      messageContent.push({
        type: "image_url",
        image_url: {
          url: contentImage,
        },
      });
    }

    // Appeler l'API Nano Banana Pro
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nano Banana Pro error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requêtes atteinte. Réessayez dans quelques instants." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Crédits insuffisants. Veuillez recharger votre compte." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          error: "Erreur lors de la génération",
          details: errorText,
          status: response.status,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = (await response.json()) as NanoBananaResponse;
    console.log("Nano Banana Pro response received");
    
    // Extraire l'image générée
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: "Aucune image générée par l'API",
          details: data.choices?.[0]?.message?.content || "Réponse vide"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Image generated successfully, length:", generatedImage.length);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: generatedImage,
        provider: "nano-banana-pro",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
