import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplateAnalysisResult {
  detectedElements: {
    hasTitle: boolean;
    hasDate: boolean;
    hasTime: boolean;
    hasLocation: boolean;
    hasContact: boolean;
    hasPrice: boolean;
    hasSpeaker: boolean;
    hasMenu: boolean;
    hasProducts: boolean;
    hasLogo: boolean;
  };
  requiredQuestions: Array<{
    id: string;
    question: string;
    type: "text" | "multiline";
    placeholder: string;
    required: boolean;
  }>;
  templateDescription: string;
  suggestedPrompt: string;
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
    const { imageUrl, domain, existingDescription } = body;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Analyzing template image:", imageUrl.substring(0, 100));
    console.log("Domain:", domain);

    // Fetch the image and convert to base64 if it's a local path
    let imageContent: { type: "image_url"; image_url: { url: string } };
    
    if (imageUrl.startsWith("data:image/")) {
      imageContent = { type: "image_url", image_url: { url: imageUrl } };
    } else {
      // For URLs, we'll pass them directly to the vision model
      imageContent = { type: "image_url", image_url: { url: imageUrl } };
    }

    const systemPrompt = `Tu es un expert graphiste spécialisé dans l'analyse d'affiches publicitaires africaines.

OBJECTIF PRINCIPAL: Analyser l'affiche pour:
1. Identifier PRÉCISÉMENT chaque zone de texte et son contenu actuel
2. Comprendre la STRUCTURE du design (où se trouve chaque élément)
3. Générer des questions pour que l'utilisateur fournisse SES propres données

ANALYSE DÉTAILLÉE - Pour chaque élément trouvé, note:
- SA POSITION sur l'affiche (haut, centre, bas, gauche, droite)
- SA TAILLE relative (grand titre, texte moyen, petit texte)
- SON RÔLE (titre principal, sous-titre, date, contact, etc.)

ÉLÉMENTS À CHERCHER:
- Titre principal / Thème (généralement le plus grand texte)
- Sous-titre ou slogan
- Date(s) complète(s): jour, mois, année
- Heure(s) / Horaire(s)
- Lieu / Adresse (peut inclure ville, pays)
- Contact: téléphone, WhatsApp, email
- Réseaux sociaux: Facebook, Instagram, etc.
- Prix / Tarifs / Entrée
- Nom(s) d'orateur(s) / artiste(s) / invité(s) avec leurs titres
- Menu ou liste de plats/produits
- Logo(s) d'organisation
- Sponsors ou partenaires

RÈGLES CRITIQUES:
1. DEMANDE TOUT ce qui est présent sur l'affiche - l'utilisateur DOIT fournir chaque info
2. Si le template a 5 zones de texte, génère 5 questions minimum
3. Chaque élément visible = une question pour le remplacer
4. La description du template doit inclure la POSITION de chaque élément

FORMAT DE RÉPONSE (JSON strict):
{
  "detectedElements": {
    "hasTitle": true/false,
    "hasSubtitle": true/false,
    "hasDate": true/false,
    "hasTime": true/false,
    "hasLocation": true/false,
    "hasContact": true/false,
    "hasPrice": true/false,
    "hasSpeaker": true/false,
    "hasGuests": true/false,
    "hasMenu": true/false,
    "hasProducts": true/false,
    "hasLogo": true/false,
    "hasSocialMedia": true/false
  },
  "requiredQuestions": [
    {
      "id": "identifiant_unique",
      "question": "Question claire et précise",
      "type": "text" | "multiline",
      "placeholder": "Exemple de réponse attendue",
      "required": true/false
    }
  ],
  "templateDescription": "Description DÉTAILLÉE du layout: positions, tailles, couleurs dominantes",
  "suggestedPrompt": "Instructions précises pour reproduire CE design avec le contenu utilisateur",
  "layoutGuide": {
    "titlePosition": "Position du titre (ex: centre-haut)",
    "datePosition": "Position de la date",
    "contactPosition": "Position du contact (ex: bas de l'affiche)",
    "visualPosition": "Position de la photo/visuel principal"
  }
}

TYPES DE QUESTIONS par élément:
- hasTitle → "Quel est le titre principal de votre affiche ?"
- hasSubtitle → "Avez-vous un sous-titre ou slogan ?"
- hasDate → "Quelle est la date de l'événement ? (format: jour mois année)"
- hasTime → "À quelle heure commence l'événement ?"
- hasLocation → "Où se déroule l'événement ? (adresse complète)"
- hasContact → "Quels sont vos contacts ? (téléphone, WhatsApp, email)"
- hasPrice → "Quels sont les tarifs/prix d'entrée ?"
- hasSpeaker → "Qui est l'orateur/artiste principal ? (nom et titre)"
- hasGuests → "Y a-t-il des invités ? (noms et titres)"
- hasMenu → "Décrivez votre menu complet (plats, prix)"
- hasLogo → "Avez-vous un logo à intégrer ?"
- hasSocialMedia → "Quels sont vos réseaux sociaux ?"

IMPORTANT: Sois EXHAUSTIF. Chaque texte visible = une question.`;

    const userMessage = existingDescription 
      ? `Analyse cette affiche. Contexte: domaine "${domain}". Description existante: "${existingDescription}"`
      : `Analyse cette affiche. Domaine détecté: "${domain || 'non spécifié'}"`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          { 
            role: "user", 
            content: [
              { type: "text", text: userMessage },
              imageContent
            ]
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Return default questions as fallback
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: getDefaultAnalysis(domain),
          warning: "Analyse simplifiée"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: getDefaultAnalysis(domain) 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let analysis: TemplateAnalysisResult;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      analysis = getDefaultAnalysis(domain);
    }

    console.log("Template analysis result:", JSON.stringify(analysis));

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-template function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDefaultAnalysis(domain?: string): TemplateAnalysisResult {
  const baseQuestions = [
    {
      id: "title",
      question: "Quel est le titre ou thème de votre affiche ?",
      type: "text" as const,
      placeholder: "Ex: Grande Veillée de Prière",
      required: true
    },
    {
      id: "details",
      question: "Quelles informations voulez-vous afficher ? (dates, lieu, contact, prix...)",
      type: "multiline" as const,
      placeholder: "Décrivez toutes les informations à inclure",
      required: false
    }
  ];

  return {
    detectedElements: {
      hasTitle: true,
      hasDate: false,
      hasTime: false,
      hasLocation: false,
      hasContact: false,
      hasPrice: false,
      hasSpeaker: false,
      hasMenu: false,
      hasProducts: false,
      hasLogo: false
    },
    requiredQuestions: baseQuestions,
    templateDescription: "Template professionnel",
    suggestedPrompt: "Reproduire le style et la mise en page de cette affiche"
  };
}
