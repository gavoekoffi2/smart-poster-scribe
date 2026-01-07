import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All template files organized by domain
const TEMPLATE_FILES = {
  church: [
    "14-jours-jeune.jpg",
    "21-jours-jeune-goshen.jpg", 
    "21-jours-jeune-tlbc.jpg",
    "centre-chretien-excellence.jpg",
    "church-flyer-cameroon.jpg",
    "church-flyer-french-2.jpg",
    "church-flyer-french.jpg",
    "ciel-ouvert.jpg",
    "jinterviens-trone-grace.jpg",
    "special-bonzola-2022.jpg",
    "special-bonzola.jpg",
    "telechargement-1.jpg",
    "telechargement-2.jpg",
    "telechargement-3.jpg",
    "telechargement-4.jpg",
    "telechargement.jpg",
    "unity-convention.jpg",
    "visuel-church.jpg",
  ],
  ecommerce: [
    "jays-deoden.jpg",
    "mega-sales-event.jpg",
    "rush-fruitys-products.jpg",
    "see-wide-collections.jpg",
    "terez-ember-sales.jpg",
    "valentine-package.jpg",
  ],
  event: [
    "african-praise.jpg",
    "apostolic-praise-2024.jpg",
    "concert-celebration-epouse.jpg",
    "concert-celebration-tabernacle.jpg",
    "concert-de-la-vie.jpg",
    "concert-gospel-cct.jpg",
    "event-flyer.jpg",
    "excursion-flyer.jpg",
    "handkerchief-praise.jpg",
    "mega-all-night.jpg",
    "praise-concert-flyer.jpg",
    "praise-worship-concert.jpg",
    "telechargement-event-1.jpg",
    "telechargement-event-2.jpg",
    "telechargement-event-3.jpg",
    "waajal-koom-koom.jpg",
    "worship-xperience.jpg",
  ],
  fashion: [
    "aicha-couture.jpg",
  ],
  formation: [
    "certification-rh.jpg",
    "certified-hr-manager.jpg",
    "dba-projet-recherche.jpg",
    "dba-reference-scientifique.jpg",
    "formation-1.jpg",
    "formation-2.jpg",
    "formation-3.jpg",
    "formation-4.jpg",
    "formation-ecommerce-alibaba.jpg",
    "webinaire-power-bi.jpg",
  ],
  restaurant: [
    "best-taste-kitchen.jpg",
    "bloom-resto-bar.jpg",
    "favours-kitchen-2.jpg",
    "favours-kitchen.jpg",
    "giftys-cuisine.jpg",
    "jassy-la-manjay.jpg",
    "kom-party.jpg",
    "piment-doux-promo.jpg",
    "primo-promo-bar.jpg",
    "restaurant-grille-maquis.jpg",
    "saveurs-authentik.jpg",
    "special-fetes-chef.jpg",
  ],
  service: [
    "ariwas-import-export.jpg",
    "baddest-beauty-salon.jpg",
    "boost-social-media.jpg",
    "boostez-visuels-premium.jpg",
    "designer-professionnel.jpg",
    "la-joie-coiffure.jpg",
    "lanro-picture-visuels.jpg",
    "ozark-graphics-design.jpg",
    "pat-beauty-care.jpg",
    "peemas-beauty-studio.jpg",
    "smart-design-flyer.jpg",
    "williams-service-international-2.jpg",
    "williams-service-international.jpg",
    "yahuta-graphic-design.jpg",
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
    
    // Get the source base URL from request body
    const body = await req.json().catch(() => ({}));
    const sourceBaseUrl = body.sourceBaseUrl;
    
    if (!sourceBaseUrl) {
      throw new Error("sourceBaseUrl is required - provide the base URL where images are currently hosted");
    }

    const results: Array<{
      domain: string;
      filename: string;
      success: boolean;
      storageUrl?: string;
      error?: string;
    }> = [];

    const updatedRecords: Array<{
      oldUrl: string;
      newUrl: string;
    }> = [];

    // Process each domain
    for (const [domain, files] of Object.entries(TEMPLATE_FILES)) {
      for (const filename of files) {
        const localPath = `/reference-templates/${domain}/${filename}`;
        const sourceUrl = `${sourceBaseUrl}${localPath}`;
        const storagePath = `${domain}/${filename}`;

        try {
          // Download image from source URL
          const response = await fetch(sourceUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
          }

          const imageBuffer = await response.arrayBuffer();
          const contentType = response.headers.get("content-type") || "image/jpeg";

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("reference-templates")
            .upload(storagePath, imageBuffer, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from("reference-templates")
            .getPublicUrl(storagePath);

          const newStorageUrl = publicUrlData.publicUrl;

          // Update the database record
          const { error: updateError } = await supabase
            .from("reference_templates")
            .update({ image_url: newStorageUrl })
            .eq("image_url", localPath);

          if (updateError) {
            console.warn(`Failed to update DB for ${localPath}:`, updateError.message);
          } else {
            updatedRecords.push({
              oldUrl: localPath,
              newUrl: newStorageUrl,
            });
          }

          results.push({
            domain,
            filename,
            success: true,
            storageUrl: newStorageUrl,
          });

        } catch (error) {
          results.push({
            domain,
            filename,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    // Calculate stats
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const statsByDomain: Record<string, { success: number; failed: number }> = {};

    for (const result of results) {
      if (!statsByDomain[result.domain]) {
        statsByDomain[result.domain] = { success: 0, failed: 0 };
      }
      if (result.success) {
        statsByDomain[result.domain].success++;
      } else {
        statsByDomain[result.domain].failed++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Uploaded ${successCount} images, ${failCount} failed`,
      stats: {
        total: results.length,
        success: successCount,
        failed: failCount,
        byDomain: statsByDomain,
      },
      updatedDatabaseRecords: updatedRecords.length,
      details: results,
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
