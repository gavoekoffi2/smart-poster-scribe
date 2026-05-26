import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageData } = await req.json();
    if (!imageData || typeof imageData !== "string") {
      return new Response(JSON.stringify({ error: "imageData required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[clean-image-text] Requesting text removal...");

    const prompt = `Remove ALL text, letters, numbers, words, logos with text, and typography from this poster/flyer image.

CRITICAL RULES:
- Preserve the ENTIRE visual design exactly: background colors, gradients, photos, illustrations, shapes, decorative elements, characters, objects.
- Reconstruct/inpaint the areas where text used to be, naturally blending with the surrounding background (extend gradients, repeat patterns, fill with matching color).
- Do NOT change layout, composition, colors, or style.
- Do NOT add any new text, watermarks, or signatures.
- Keep the exact same dimensions and aspect ratio.
- Output ONLY the clean background image with text completely removed.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageData } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[clean-image-text] Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Text removal failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const cleanImage = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!cleanImage) {
      console.error("[clean-image-text] No image returned:", JSON.stringify(data).slice(0, 400));
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[clean-image-text] Success");

    return new Response(JSON.stringify({ success: true, cleanImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[clean-image-text] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
