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

    const systemPrompt = `Tu es un expert graphiste spécialisé dans l'analyse d'affiches publicitaires africaines pour le CLONAGE.

🎯 OBJECTIF: Analyser cette affiche pour permettre à l'utilisateur de la CLONER avec son propre contenu.
Le clone doit avoir le MÊME DESIGN EXACT, seules les informations textuelles changent.

ANALYSE REQUISE:
1. Identifier CHAQUE zone de texte visible sur l'affiche
2. Comprendre PRÉCISÉMENT la structure du design
3. Générer des questions pour que l'utilisateur fournisse TOUTES les informations à remplacer

ÉLÉMENTS À DÉTECTER (cherche dans l'image):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• TITRE PRINCIPAL - le texte le plus grand/visible
• SOUS-TITRE / SLOGAN - texte secondaire sous le titre
• DATE(S) - jour, mois, année de l'événement
• HEURE(S) - horaires de début/fin
• LIEU / ADRESSE - où ça se passe (ville, pays, salle)
• CONTACT - téléphone, WhatsApp, email
• PRIX / TARIFS - entrée, billets, coûts
• ORATEUR(S) / ARTISTE(S) - noms et titres des intervenants
• INVITÉS - autres personnalités mentionnées
• ORGANISATEUR - église, entreprise, association
• RÉSEAUX SOCIAUX - Facebook, Instagram, YouTube
• MENU / PRODUITS - si applicable (restaurant, commerce)
• SPONSORS / PARTENAIRES - logos et noms visibles

RÈGLES CRITIQUES POUR LE CLONAGE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CHAQUE texte visible sur l'affiche = UNE question pour l'utilisateur
2. Si tu vois 8 zones de texte → génère 8 questions minimum
3. L'utilisateur DOIT fournir TOUTES les infos pour remplacer le contenu original
4. NE JAMAIS laisser du contenu du template original sur le clone
5. Si une info n'est pas fournie, elle ne sera PAS sur le clone (pas d'invention)

DESCRIPTION DU TEMPLATE (très important pour le clonage):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Décris PRÉCISÉMENT:
- Position de CHAQUE élément (ex: "titre en haut centré sur fond doré")
- Couleurs dominantes et palette
- Style typographique (moderne, classique, bold, script)
- Éléments décoratifs (cadres, formes, dégradés, effets lumineux)
- Position du/des personnage(s) si présent(s)
- Fond (couleur unie, dégradé, image, motifs)

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
    "hasOrganizer": true/false,
    "hasMenu": true/false,
    "hasProducts": true/false,
    "hasLogo": true/false,
    "hasSocialMedia": true/false
  },
  "requiredQuestions": [
    {
      "id": "title",
      "question": "Question claire en français",
      "type": "text" ou "multiline",
      "placeholder": "Exemple concret",
      "required": true/false
    }
  ],
  "templateDescription": "Description ULTRA-DÉTAILLÉE du layout pour reproduction exacte",
  "suggestedPrompt": "Instructions de clonage: reproduire exactement [décrire le design] avec le contenu utilisateur",
  "layoutGuide": {
    "titlePosition": "position exacte du titre",
    "datePosition": "position de la date",
    "contactPosition": "position du contact",
    "visualPosition": "position du visuel/personnage"
  }
}

EXEMPLES DE QUESTIONS À GÉNÉRER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "Quel est le titre principal de votre affiche ?" (required: true)
• "Avez-vous un sous-titre ou slogan ?" (required: false)
• "Quelle est la date de l'événement ? (ex: 25 Janvier 2025)" (required: true si détecté)
• "À quelle heure commence l'événement ?" (required: true si horaire visible)
• "Quel est le lieu ? (adresse complète)" (required: true si lieu visible)
• "Quels sont vos contacts ? (téléphone, WhatsApp)" (required: true si contact visible)
• "Qui est l'orateur/artiste principal ? (nom et fonction)" (required: true si orateur visible)
• "Quels sont les tarifs ? (ex: Entrée: 5000 FCFA)" (required: true si prix visible)

⚠️ IMPORTANT: Sois EXHAUSTIF. Le but est de capturer TOUT le contenu textuel pour un clone parfait.`;

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
