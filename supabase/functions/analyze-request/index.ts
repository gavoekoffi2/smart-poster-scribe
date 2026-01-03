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

const systemPrompt = `Tu es un expert en analyse de demandes d'affiches publicitaires. Ton objectif: EXTRAIRE UN MAXIMUM D'INFORMATIONS du message et NE DEMANDER QUE LE STRICT MINIMUM.

DOMAINES (utilise ces valeurs exactes):
church, event, education, formation, restaurant, fashion, music, sport, technology, health, realestate

DÉTECTION DU DOMAINE - SOIS AGRESSIF:
- "église/culte/pasteur/prière/veillée/gospel" → "church"
- "événement/conférence/séminaire/gala/mariage/fête/cérémonie" → "event"  
- "formation/atelier/workshop/masterclass/coaching/stage" → "formation"
- "restaurant/menu/plat/cuisine/nourriture/café/bar/maquis" → "restaurant"
- "vêtements/mode/collection/boutique/accessoires" → "fashion"
- "concert/artiste/album/musique/DJ/festival" → "music"
- "match/tournoi/sport/marathon/fitness" → "sport"
- "application/logiciel/tech/startup/digital" → "technology"
- "santé/médecin/clinique/pharmacie/soins" → "health"
- "immobilier/maison/appartement/location/vente" → "realestate"
- "école/université/diplôme/études" → "education"
NE RETOURNE NULL que si AUCUN indice n'existe.

EXTRACTION - SOIS EXHAUSTIF:
Cherche TOUT dans le texte:
- title: thème, sujet, nom de l'événement, slogan
- dates: dates, heures, jours (même partielles comme "samedi", "ce weekend", "le 15")
- prices: prix, tarifs, entrée, gratuit, FCFA, €
- contact: téléphone, WhatsApp, email, site web, réseaux sociaux (@handle, facebook, instagram)
- location: adresse, ville, lieu, salle, église, restaurant
- organizer: qui organise, nom de l'entreprise, église, association
- speakers: orateurs, pasteurs, artistes, invités, chefs (avec leurs noms si mentionnés)
- menu: plats, boissons, carte (pour restaurant)
- products: produits, articles, collections (pour mode/commerce)
- targetAudience: public cible si mentionné
- additionalDetails: TOUT autre détail utile (dress code, thème vestimentaire, slogan, hashtag...)

RÈGLE CRITIQUE - MINIMISER LES QUESTIONS:
missingInfo ne doit contenir QUE les infos VRAIMENT ESSENTIELLES qui manquent:
- Pour un événement → dates EST essentiel
- Pour une promo commerciale → rien n'est vraiment essentiel, on peut créer l'affiche
- Pour un restaurant → rien n'est essentiel sauf si l'utilisateur veut un menu détaillé
- NE DEMANDE JAMAIS: contact, organisateur, public cible, lieu (optionnels)

Réponds UNIQUEMENT avec ce JSON:
{
  "suggestedDomain": "domaine_détecté ou null",
  "extractedInfo": {
    "title": "...",
    "dates": "...",
    "prices": "...",
    "contact": "...",
    "location": "...",
    "organizer": "...",
    "speakers": "...",
    "menu": "...",
    "products": "...",
    "targetAudience": "...",
    "additionalDetails": "..."
  },
  "missingInfo": [],
  "summary": "résumé court"
}

INSTRUCTIONS FINALES:
- N'inclus dans extractedInfo QUE ce qui est explicitement mentionné
- missingInfo: tableau VIDE ou avec 1-2 éléments vraiment essentiels MAXIMUM
- Préfère générer l'affiche avec les infos disponibles plutôt que poser des questions`;

    // Retry logic for transient errors
    const maxRetries = 3;
    let lastError = "";
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI request attempt ${attempt}/${maxRetries}`);
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

        if (response.ok) {
          break; // Success, exit retry loop
        }

        lastError = await response.text();
        console.error(`AI gateway error (attempt ${attempt}):`, response.status, lastError);

        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Waiting ${waitMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : "Network error";
        console.error(`Fetch error (attempt ${attempt}):`, lastError);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!response || !response.ok) {
      console.error("All AI request attempts failed");
      return new Response(
        JSON.stringify({ error: "AI analysis failed after retries", details: lastError }),
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
