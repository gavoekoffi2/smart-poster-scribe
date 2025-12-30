import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisResult {
  suggestedDomain: string | null;
  extractedInfo: {
    title?: string;
    dates?: string;
    prices?: string;
    contact?: string;
    location?: string;
    organizer?: string;
    targetAudience?: string;
    additionalDetails?: string;
  };
  missingInfo: string[];
  summary: string;
}

// ============ INPUT VALIDATION CONSTANTS ============
const MAX_TEXT_LENGTH = 5000;

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
    const { userText } = body;

    // ============ INPUT VALIDATION ============
    if (!userText || typeof userText !== 'string') {
      return new Response(JSON.stringify({ error: "User text is required and must be a string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedText = userText.trim();
    if (!trimmedText) {
      return new Response(JSON.stringify({ error: "User text cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Analyzing user request:", trimmedText.substring(0, 200));

    const systemPrompt = `Tu es un assistant spécialisé dans l'analyse de demandes de création d'affiches publicitaires.

Analyse le texte de l'utilisateur et extrais les informations suivantes au format JSON:

{
  "suggestedDomain": "Le domaine le plus probable parmi: education, marketing, event, restaurant, real_estate, health, technology, formation, eglise, autre. Si incertain, mettre null.",
  "extractedInfo": {
    "title": "Titre ou sujet principal de l'affiche si mentionné",
    "dates": "Dates mentionnées (formation, événement, etc.)",
    "prices": "Prix, tarifs, frais mentionnés",
    "contact": "Numéros de téléphone, emails, contacts",
    "location": "Lieu, adresse, quartier mentionné",
    "organizer": "Nom de l'organisateur, entreprise, église",
    "targetAudience": "Public cible si mentionné",
    "additionalDetails": "Autres détails importants (modules, programme, etc.)"
  },
  "missingInfo": ["Liste des informations manquantes importantes pour créer l'affiche, par exemple: 'dates', 'contact', 'prix', 'lieu'"],
  "summary": "Résumé court de ce que l'utilisateur veut créer"
}

Règles:
- Ne mets que les champs qui sont explicitement mentionnés dans le texte
- Pour missingInfo, liste uniquement les éléments vraiment essentiels qui manquent
- Si le texte mentionne une formation, suggère "formation" comme domaine
- Si le texte mentionne église, culte, messe, prière, suggère "eglise"
- Réponds UNIQUEMENT avec le JSON, sans markdown ni explication`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No analysis returned" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let analysis: AnalysisResult;
    try {
      // Remove potential markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default analysis if parsing fails
      analysis = {
        suggestedDomain: null,
        extractedInfo: {},
        missingInfo: ["dates", "contact", "prix"],
        summary: userText.substring(0, 100),
      };
    }

    console.log("Analysis result:", JSON.stringify(analysis));

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-request function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
