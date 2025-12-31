import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Template data based on existing files in public/reference-templates/
const TEMPLATE_DATA = {
  church: [
    { filename: "14-jours-jeune.jpg", category: "jeune", tags: ["jeûne", "prière", "église"] },
    { filename: "21-jours-jeune-goshen.jpg", category: "jeune", tags: ["jeûne", "goshen", "prière"] },
    { filename: "21-jours-jeune-tlbc.jpg", category: "jeune", tags: ["jeûne", "tlbc", "prière"] },
    { filename: "centre-chretien-excellence.jpg", category: "service", tags: ["culte", "église", "dimanche"] },
    { filename: "church-flyer-cameroon.jpg", category: "service", tags: ["culte", "cameroun", "église"] },
    { filename: "church-flyer-french-2.jpg", category: "service", tags: ["culte", "francophone"] },
    { filename: "church-flyer-french.jpg", category: "service", tags: ["culte", "francophone"] },
    { filename: "ciel-ouvert.jpg", category: "conference", tags: ["conférence", "ciel ouvert"] },
    { filename: "jinterviens-trone-grace.jpg", category: "priere", tags: ["prière", "intercession"] },
    { filename: "special-bonzola-2022.jpg", category: "special", tags: ["spécial", "invité"] },
    { filename: "special-bonzola.jpg", category: "special", tags: ["spécial", "invité"] },
    { filename: "telechargement-1.jpg", category: "service", tags: ["culte"] },
    { filename: "telechargement-2.jpg", category: "service", tags: ["culte"] },
    { filename: "telechargement-3.jpg", category: "service", tags: ["culte"] },
    { filename: "telechargement-4.jpg", category: "service", tags: ["culte"] },
    { filename: "telechargement.jpg", category: "service", tags: ["culte"] },
    { filename: "unity-convention.jpg", category: "convention", tags: ["convention", "unité"] },
    { filename: "visuel-church.jpg", category: "service", tags: ["culte", "église"] },
  ],
  ecommerce: [
    { filename: "jays-deoden.jpg", category: "fashion", tags: ["mode", "vêtements", "promo"] },
    { filename: "mega-sales-event.jpg", category: "sales", tags: ["soldes", "promo", "vente"] },
    { filename: "rush-fruitys-products.jpg", category: "food", tags: ["fruits", "produits", "frais"] },
    { filename: "see-wide-collections.jpg", category: "fashion", tags: ["collection", "mode"] },
    { filename: "terez-ember-sales.jpg", category: "sales", tags: ["soldes", "promo"] },
    { filename: "valentine-package.jpg", category: "special", tags: ["saint-valentin", "cadeau"] },
  ],
  event: [
    { filename: "african-praise.jpg", category: "concert", tags: ["concert", "gospel", "louange"] },
    { filename: "apostolic-praise-2024.jpg", category: "concert", tags: ["concert", "apostolique"] },
    { filename: "concert-celebration-epouse.jpg", category: "concert", tags: ["concert", "célébration"] },
    { filename: "concert-celebration-tabernacle.jpg", category: "concert", tags: ["concert", "tabernacle"] },
    { filename: "concert-de-la-vie.jpg", category: "concert", tags: ["concert", "vie"] },
    { filename: "concert-gospel-cct.jpg", category: "concert", tags: ["concert", "gospel"] },
    { filename: "event-flyer.jpg", category: "general", tags: ["événement"] },
    { filename: "excursion-flyer.jpg", category: "excursion", tags: ["excursion", "sortie"] },
    { filename: "handkerchief-praise.jpg", category: "concert", tags: ["concert", "louange"] },
    { filename: "mega-all-night.jpg", category: "veille", tags: ["veillée", "prière", "nuit"] },
    { filename: "praise-concert-flyer.jpg", category: "concert", tags: ["concert", "louange"] },
    { filename: "praise-worship-concert.jpg", category: "concert", tags: ["concert", "louange", "adoration"] },
    { filename: "telechargement-event-1.jpg", category: "general", tags: ["événement"] },
    { filename: "telechargement-event-2.jpg", category: "general", tags: ["événement"] },
    { filename: "telechargement-event-3.jpg", category: "general", tags: ["événement"] },
    { filename: "waajal-koom-koom.jpg", category: "cultural", tags: ["culturel", "festival"] },
    { filename: "worship-xperience.jpg", category: "concert", tags: ["concert", "adoration"] },
  ],
  fashion: [
    { filename: "aicha-couture.jpg", category: "couture", tags: ["couture", "mode", "africaine"] },
  ],
  formation: [
    { filename: "certification-rh.jpg", category: "certification", tags: ["RH", "certification", "formation"] },
    { filename: "certified-hr-manager.jpg", category: "certification", tags: ["RH", "manager", "certification"] },
    { filename: "dba-projet-recherche.jpg", category: "academique", tags: ["DBA", "recherche", "doctorat"] },
    { filename: "dba-reference-scientifique.jpg", category: "academique", tags: ["DBA", "scientifique"] },
    { filename: "formation-1.jpg", category: "general", tags: ["formation"] },
    { filename: "formation-2.jpg", category: "general", tags: ["formation"] },
    { filename: "formation-3.jpg", category: "general", tags: ["formation"] },
    { filename: "formation-4.jpg", category: "general", tags: ["formation"] },
    { filename: "formation-ecommerce-alibaba.jpg", category: "ecommerce", tags: ["e-commerce", "alibaba", "import"] },
    { filename: "webinaire-power-bi.jpg", category: "webinaire", tags: ["webinaire", "power bi", "data"] },
  ],
  restaurant: [
    { filename: "best-taste-kitchen.jpg", category: "cuisine", tags: ["cuisine", "restaurant"] },
    { filename: "bloom-resto-bar.jpg", category: "bar", tags: ["bar", "restaurant", "resto"] },
    { filename: "favours-kitchen-2.jpg", category: "cuisine", tags: ["cuisine", "traiteur"] },
    { filename: "favours-kitchen.jpg", category: "cuisine", tags: ["cuisine", "traiteur"] },
    { filename: "giftys-cuisine.jpg", category: "cuisine", tags: ["cuisine", "africaine"] },
    { filename: "jassy-la-manjay.jpg", category: "cuisine", tags: ["cuisine", "manjay"] },
    { filename: "kom-party.jpg", category: "event", tags: ["fête", "kom", "restaurant"] },
    { filename: "piment-doux-promo.jpg", category: "promo", tags: ["promo", "piment doux"] },
    { filename: "primo-promo-bar.jpg", category: "bar", tags: ["bar", "promo"] },
    { filename: "restaurant-grille-maquis.jpg", category: "maquis", tags: ["maquis", "grillades"] },
    { filename: "saveurs-authentik.jpg", category: "cuisine", tags: ["cuisine", "authentique"] },
    { filename: "special-fetes-chef.jpg", category: "special", tags: ["fêtes", "chef", "spécial"] },
  ],
  service: [
    { filename: "ariwas-import-export.jpg", category: "import-export", tags: ["import", "export", "commerce"] },
    { filename: "baddest-beauty-salon.jpg", category: "beaute", tags: ["beauté", "salon", "coiffure"] },
    { filename: "boost-social-media.jpg", category: "digital", tags: ["social media", "marketing"] },
    { filename: "boostez-visuels-premium.jpg", category: "design", tags: ["design", "visuel", "premium"] },
    { filename: "designer-professionnel.jpg", category: "design", tags: ["design", "professionnel"] },
    { filename: "la-joie-coiffure.jpg", category: "beaute", tags: ["coiffure", "tresse", "beauté"] },
    { filename: "lanro-picture-visuels.jpg", category: "photo", tags: ["photo", "visuels"] },
    { filename: "ozark-graphics-design.jpg", category: "design", tags: ["graphisme", "design"] },
    { filename: "pat-beauty-care.jpg", category: "beaute", tags: ["beauté", "soins"] },
    { filename: "peemas-beauty-studio.jpg", category: "beaute", tags: ["beauté", "studio"] },
    { filename: "smart-design-flyer.jpg", category: "design", tags: ["design", "flyer"] },
    { filename: "williams-service-international-2.jpg", category: "international", tags: ["service", "international"] },
    { filename: "williams-service-international.jpg", category: "international", tags: ["service", "international"] },
    { filename: "yahuta-graphic-design.jpg", category: "design", tags: ["graphisme", "design"] },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the base URL for templates (using the app's public URL)
    const body = await req.json().catch(() => ({}));
    const baseUrl = body.baseUrl || "https://lovable.dev";

    // Check if templates already exist
    const { count } = await supabase
      .from("reference_templates")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return new Response(JSON.stringify({
        success: true,
        message: `Templates already seeded. ${count} templates exist.`,
        skipped: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build template records
    const templates: Array<{
      domain: string;
      design_category: string;
      image_url: string;
      description: string;
      tags: string[];
    }> = [];

    for (const [domain, items] of Object.entries(TEMPLATE_DATA)) {
      for (const item of items) {
        templates.push({
          domain,
          design_category: item.category,
          image_url: `/reference-templates/${domain}/${item.filename}`,
          description: `Template ${domain} - ${item.category}`,
          tags: item.tags,
        });
      }
    }

    // Insert all templates
    const { data, error } = await supabase
      .from("reference_templates")
      .insert(templates)
      .select();

    if (error) {
      throw new Error(`Failed to insert templates: ${error.message}`);
    }

    // Get stats
    const stats: Record<string, number> = {};
    for (const template of templates) {
      stats[template.domain] = (stats[template.domain] || 0) + 1;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully seeded ${data.length} templates`,
      stats,
      total: data.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
