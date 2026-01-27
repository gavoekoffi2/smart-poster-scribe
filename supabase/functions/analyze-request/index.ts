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
    speakers?: string;
    menu?: string;
    products?: string;
    targetAudience?: string;
    additionalDetails?: string;
  };
  missingInfo: string[];
  summary: string;
}

// ============ INPUT VALIDATION CONSTANTS ============
const MAX_TEXT_LENGTH = 5000;

// ============ HEURISTIC FALLBACK (when AI gateway is temporarily unavailable) ============
const DOMAIN_KEYWORDS: Array<{ domain: string; keywords: string[] }> = [
  { domain: "youtube", keywords: ["miniature", "thumbnail", "youtube", "vignette", "chaîne", "chaine", "vidéo youtube", "video youtube", "youtuber", "youtubeur", "créateur de contenu", "createur de contenu", "abonnés", "abonnes", "vues", "viral", "clickbait", "tutoriel youtube", "tuto youtube", "vlog", "unboxing", "storytime", "reaction", "réaction"] },
  { domain: "church", keywords: ["église", "eglise", "culte", "pasteur", "prière", "priere", "gospel", "veillée", "veillee"] },
  { domain: "restaurant", keywords: ["restaurant", "menu", "plat", "cuisine", "maquis", "bar", "café", "cafe"] },
  { domain: "formation", keywords: ["formation", "atelier", "workshop", "masterclass", "coaching", "webinaire", "séminaire", "seminaire"] },
  { domain: "event", keywords: ["événement", "evenement", "conférence", "conference", "gala", "mariage", "fête", "fete", "cérémonie", "ceremonie"] },
  { domain: "fashion", keywords: ["mode", "couture", "collection", "boutique", "vêtement", "vetement", "accessoires"] },
  { domain: "music", keywords: ["concert", "artiste", "album", "musique", "dj", "festival"] },
  { domain: "sport", keywords: ["match", "tournoi", "sport", "marathon", "fitness", "gym"] },
  { domain: "technology", keywords: ["application", "logiciel", "startup", "digital", "site web", "technologie"] },
  { domain: "health", keywords: ["santé", "sante", "médecin", "medecin", "clinique", "pharmacie", "soins"] },
  { domain: "realestate", keywords: ["immobilier", "maison", "appartement", "villa", "terrain", "location", "vente"] },
  { domain: "education", keywords: ["école", "ecole", "université", "universite", "diplôme", "diplome", "inscription"] },
];

function detectDomainHeuristic(text: string): string | null {
  const lower = text.toLowerCase();
  for (const entry of DOMAIN_KEYWORDS) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.domain;
  }
  return null;
}

function extractFirst(text: string, regex: RegExp): string | undefined {
  const m = text.match(regex);
  const v = m?.[1]?.trim();
  return v ? v : undefined;
}

function buildHeuristicAnalysis(text: string): AnalysisResult {
  const suggestedDomain = detectDomainHeuristic(text);

  const title =
    extractFirst(text, /(?:titre(?:\s+principal)?|title)\s*[:\-]\s*([^\n]+)/i) ??
    text.split(/\n|\./)[0]?.trim()?.slice(0, 90);

  const organizer =
    extractFirst(text, /(?:organisé\s+par|organise\s+par|organisation|entreprise|société|societe)\s*[:\-]\s*([^\n.]+)/i) ??
    text.match(/\b([A-Z][A-Z0-9&'’.\-]+(?:\s+[A-Z0-9&'’.\-]+){1,5})\b/)?.[1];

  const location = extractFirst(text, /(?:lieu|adresse|localisation)\s*[:\-]\s*([^\n.]+)/i);

  const phones = text.match(/(\+?\d[\d\s().\-]{7,}\d)/g) ?? [];
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const websites = text.match(/\bhttps?:\/\/[^\s)]+|\bwww\.[^\s)]+/gi) ?? [];
  const handles = text.match(/@[a-z0-9._-]{2,}/gi) ?? [];
  const contactParts = [...phones, ...emails, ...websites, ...handles]
    .map((s) => s.trim())
    .filter(Boolean);
  const contact = contactParts.length ? Array.from(new Set(contactParts)).join(" · ") : undefined;

  let prices: string | undefined;
  if (/\bgratuit\b/i.test(text)) prices = "Gratuit";
  const priceTokens = text.match(/\b\d+(?:[.,]\d+)?\s?(?:FCFA|XOF|CFA|€|\$|USD)\b/gi) ?? [];
  if (!prices && priceTokens.length) prices = Array.from(new Set(priceTokens)).join(" · ");

  const dateTokens = [
    ...(text.match(/\b\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?\b/g) ?? []),
    ...(text.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/gi) ?? []),
    ...(text.match(/\b\d{1,2}\s?h(?:\s?\d{2})?\b/gi) ?? []),
  ].map((s) => s.trim());
  const dates = dateTokens.length ? Array.from(new Set(dateTokens)).join(" · ") : undefined;

  const missingInfo = suggestedDomain === "event" && !dates ? ["date et heure (si vous voulez l'indiquer)"] : [];

  return {
    suggestedDomain,
    extractedInfo: {
      title: title || undefined,
      dates,
      prices,
      contact,
      location,
      organizer,
    },
    missingInfo,
    summary: text.substring(0, 160),
  };
}

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

const systemPrompt = `Tu es un expert graphiste IA qui analyse des demandes d'affiches publicitaires.

TON OBJECTIF: Comprendre la demande et NE JAMAIS DEMANDER D'INFORMATIONS INUTILES.

=== RÈGLE D'OR ===
Tu dois être INTELLIGENT: déduire le maximum toi-même et ne demander QUE ce qui est ABSOLUMENT IMPOSSIBLE à deviner.
Pour une affiche de santé → NE demande PAS les produits (non pertinent)
Pour une affiche restaurant sans menu demandé → NE demande PAS le menu
Pour une affiche événement → la date peut être importante SI non fournie
Pour une affiche promotionnelle → RIEN n'est vraiment essentiel, créer avec ce qu'on a

=== DOMAINES (valeurs exactes) ===
church, event, education, formation, restaurant, fashion, music, sport, technology, health, realestate, service, youtube

DÉTECTION INTELLIGENTE:
- "miniature/thumbnail/youtube/vignette/youtubeur/clickbait" → "youtube"
- "église/culte/pasteur/prière/gospel" → "church"
- "événement/conférence/gala/mariage/fête" → "event"
- "formation/atelier/workshop/coaching" → "formation"
- "restaurant/menu/plat/cuisine/bar/maquis" → "restaurant"
- "mode/vêtements/collection/boutique" → "fashion"
- "concert/artiste/album/musique/DJ" → "music"
- "match/tournoi/sport/fitness" → "sport"
- "application/logiciel/tech/startup" → "technology"
- "santé/médecin/clinique/pharmacie" → "health"
- "immobilier/maison/appartement" → "realestate"
- "école/université/diplôme" → "education"
- "service/prestation/entreprise/société" → "service"

=== EXTRACTION MAXIMALE ===
Cherche TOUT ce qui existe dans le texte:
- title: thème, sujet, nom, slogan
- dates: dates, heures, jours
- prices: prix, tarifs, FCFA, €
- contact: téléphone, WhatsApp, email, réseaux sociaux
- location: adresse, ville, lieu
- organizer: qui organise, nom entreprise
- speakers: orateurs, artistes, invités (SEULEMENT si mentionnés)
- menu: plats, boissons (SEULEMENT pour restaurant ET si l'utilisateur en parle)
- products: produits (SEULEMENT pour fashion/commerce ET si mentionnés)
- additionalDetails: tout autre détail utile

=== RÈGLE CRITIQUE - ZÉRO QUESTION INUTILE ===
missingInfo doit être VIDE dans 90% des cas.
Ne demande JAMAIS:
- Le contact (optionnel)
- L'organisateur (optionnel)
- Le lieu (optionnel sauf si l'utilisateur dit vouloir l'inclure)
- Les produits si ce n'est pas du commerce
- Le menu si l'utilisateur n'en a pas parlé
- Les photos d'orateurs (on peut créer sans)

SEULES exceptions où tu peux demander (1 élément max):
- Date/heure pour un événement SI vraiment non fournie ET que l'utilisateur semble vouloir l'afficher
- Rien d'autre.

=== FORMAT DE RÉPONSE (JSON strict) ===
{
  "suggestedDomain": "domaine ou null",
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
  "summary": "résumé court de ce que tu as compris"
}

RAPPEL: missingInfo = [] dans la plupart des cas. Tu es un graphiste intelligent qui sait créer avec ce qu'on lui donne.`;

    // Retry logic for transient errors
    const maxRetries = 3;
    let lastError = "";
    let response: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI request attempt ${attempt}/${maxRetries}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: trimmedText },
            ],
          }),
        });

        clearTimeout(timeout);

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

      // Surface billing/rate-limit errors explicitly so the client can show a proper message.
      if (response?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response?.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Graceful degradation: avoid blocking the user when the AI gateway is temporarily down.
      const analysis = buildHeuristicAnalysis(trimmedText);
      return new Response(
        JSON.stringify({ success: true, analysis, warning: "Analyse simplifiée (IA indisponible)." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        suggestedDomain: detectDomainHeuristic(trimmedText),
        extractedInfo: {},
        missingInfo: [],
        summary: trimmedText.substring(0, 160),
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
