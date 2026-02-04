import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64 } = await req.json();
    const BYTEZ_API_KEY = Deno.env.get("BYTEZ_API_KEY");

    if (!BYTEZ_API_KEY) {
      console.error("BYTEZ_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service de transcription non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: "Aucun audio fourni" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending audio to Bytez Whisper API...");
    console.log("Audio base64 length:", audioBase64.length);

    const response = await fetch(
      "https://api.bytez.com/models/v2/openai/whisper-large-v3",
      {
        method: "POST",
        headers: {
          "Authorization": BYTEZ_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64: audioBase64,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bytez API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, veuillez patienter quelques secondes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erreur de transcription. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Transcription result:", data);

    // Handle both possible response formats
    const transcribedText = data.output || data.text || "";

    return new Response(
      JSON.stringify({ text: transcribedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
