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
  referenceImageUrl?: string;
}

type LovableGatewayResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      images?: Array<{
        type?: string;
        image_url?: {
          url?: string;
        };
      }>;
    };
  }>;
};

function buildFinalPrompt({
  prompt,
  aspectRatio,
  resolution,
}: {
  prompt: string;
  aspectRatio: string;
  resolution: string;
}) {
  // L'API image ne garantit pas un ratio exact via paramètre, donc on l'ancre dans le prompt.
  return [
    "Génère une affiche publicitaire prête à publier.",
    `Format: ${aspectRatio} (vertical).`,
    `Qualité: ${resolution}, ultra haute résolution, texte net et lisible.`,
    "Si une personne apparaît, elle doit être africaine.",
    "Respecte strictement les informations fournies.",
    "---",
    prompt.trim(),
  ].join("\n");
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
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      prompt,
      aspectRatio = "3:4",
      resolution = "2K",
      outputFormat = "png",
      referenceImageUrl,
    } = (await req.json()) as GenerateImageRequest;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPrompt = buildFinalPrompt({
      prompt,
      aspectRatio,
      resolution,
    });

    const model = "google/gemini-2.5-flash-image-preview";

    const userMessage: any = referenceImageUrl
      ? {
          role: "user",
          content: [
            { type: "text", text: finalPrompt },
            { type: "image_url", image_url: { url: referenceImageUrl } },
          ],
        }
      : { role: "user", content: finalPrompt };

    const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [userMessage],
        modalities: ["image", "text"],
      }),
    });

    if (!gatewayResp.ok) {
      const text = await gatewayResp.text();
      console.error("AI gateway error:", gatewayResp.status, text);

      if (gatewayResp.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de demandes. Réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (gatewayResp.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Crédits insuffisants pour générer. Veuillez recharger l'usage IA du projet.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "AI gateway error",
          details: text,
          status: gatewayResp.status,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = (await gatewayResp.json()) as LovableGatewayResponse;
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image returned from AI gateway", JSON.stringify(data)?.slice(0, 2000));
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        // keep taskId for compatibility with existing frontend code
        taskId: crypto.randomUUID(),
        outputFormat: outputFormat.toLowerCase(),
        provider: "lovable-ai",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
