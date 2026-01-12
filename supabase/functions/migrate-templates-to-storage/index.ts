import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Liste des templates à migrer (chemins relatifs dans public/)
const TEMPLATES = [
  // Church
  "church/14-jours-jeune.jpg",
  "church/21-jours-jeune-goshen.jpg",
  "church/21-jours-jeune-tlbc.jpg",
  "church/centre-chretien-excellence.jpg",
  "church/church-flyer-cameroon.jpg",
  "church/church-flyer-french-2.jpg",
  "church/church-flyer-french.jpg",
  "church/ciel-ouvert.jpg",
  "church/jinterviens-trone-grace.jpg",
  "church/special-bonzola-2022.jpg",
  "church/special-bonzola.jpg",
  "church/telechargement-1.jpg",
  "church/telechargement-2.jpg",
  "church/telechargement-3.jpg",
  "church/telechargement-4.jpg",
  "church/telechargement.jpg",
  "church/unity-convention.jpg",
  "church/visuel-church.jpg",
  // Event
  "event/african-praise.jpg",
  "event/apostolic-praise-2024.jpg",
  "event/concert-celebration-epouse.jpg",
  "event/concert-celebration-tabernacle.jpg",
  "event/concert-de-la-vie.jpg",
  "event/concert-gospel-cct.jpg",
  "event/event-flyer.jpg",
  "event/excursion-flyer.jpg",
  "event/handkerchief-praise.jpg",
  "event/mega-all-night.jpg",
  "event/praise-concert-flyer.jpg",
  "event/praise-worship-concert.jpg",
  "event/telechargement-event-1.jpg",
  "event/telechargement-event-2.jpg",
  "event/telechargement-event-3.jpg",
  "event/waajal-koom-koom.jpg",
  "event/worship-xperience.jpg",
  // Ecommerce
  "ecommerce/jays-deoden.jpg",
  "ecommerce/mega-sales-event.jpg",
  "ecommerce/rush-fruitys-products.jpg",
  "ecommerce/see-wide-collections.jpg",
  "ecommerce/terez-ember-sales.jpg",
  "ecommerce/valentine-package.jpg",
  // Fashion
  "fashion/aicha-couture.jpg",
  // Formation
  "formation/dba-projet-recherche.jpg",
  "formation/dba-reference-scientifique.jpg",
  "formation/formation-1.jpg",
  "formation/formation-2.jpg",
  "formation/formation-3.jpg",
  "formation/formation-4.jpg",
  "formation/formation-ecommerce-alibaba.jpg",
  "formation/webinaire-power-bi.jpg",
  // Restaurant
  "restaurant/best-taste-kitchen.jpg",
  "restaurant/bloom-resto-bar.jpg",
  "restaurant/favours-kitchen-2.jpg",
  "restaurant/favours-kitchen.jpg",
  "restaurant/giftys-cuisine.jpg",
  "restaurant/jassy-la-manjay.jpg",
  "restaurant/kom-party.jpg",
  "restaurant/piment-doux-promo.jpg",
  "restaurant/primo-promo-bar.jpg",
  "restaurant/restaurant-grille-maquis.jpg",
  "restaurant/saveurs-authentik.jpg",
  "restaurant/special-fetes-chef.jpg",
  // Service
  "service/ariwas-import-export.jpg",
  "service/baddest-beauty-salon.jpg",
  "service/boost-social-media.jpg",
  "service/boostez-visuels-premium.jpg",
  "service/designer-professionnel.jpg",
  "service/la-joie-coiffure.jpg",
  "service/lanro-picture-visuels.jpg",
  "service/ozark-graphics-design.jpg",
  "service/pat-beauty-care.jpg",
  "service/peemas-beauty-studio.jpg",
  "service/smart-design-flyer.jpg",
  "service/williams-service-international-2.jpg",
  "service/williams-service-international.jpg",
  "service/yahuta-graphic-design.jpg",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { sourceOrigin } = body;

    if (!sourceOrigin) {
      throw new Error("sourceOrigin est requis (ex: https://votre-app.lovable.app)");
    }

    console.log("Starting migration from:", sourceOrigin);

    const results: { path: string; success: boolean; newUrl?: string; error?: string }[] = [];

    for (const templatePath of TEMPLATES) {
      try {
        const sourceUrl = `${sourceOrigin}/reference-templates/${templatePath}`;
        console.log(`Fetching: ${sourceUrl}`);

        const response = await fetch(sourceUrl);
        if (!response.ok) {
          results.push({ path: templatePath, success: false, error: `HTTP ${response.status}` });
          continue;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          results.push({ path: templatePath, success: false, error: `Not an image: ${contentType}` });
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Upload to storage
        const storagePath = templatePath;
        const { error: uploadError } = await supabase.storage
          .from("reference-templates")
          .upload(storagePath, bytes, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          results.push({ path: templatePath, success: false, error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("reference-templates")
          .getPublicUrl(storagePath);

        // Update database
        const oldPath = `/reference-templates/${templatePath}`;
        const { error: updateError } = await supabase
          .from("reference_templates")
          .update({ image_url: urlData.publicUrl })
          .eq("image_url", oldPath);

        if (updateError) {
          console.warn(`DB update warning for ${templatePath}:`, updateError.message);
        }

        results.push({ path: templatePath, success: true, newUrl: urlData.publicUrl });
        console.log(`Migrated: ${templatePath}`);

      } catch (e) {
        results.push({ path: templatePath, success: false, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration terminée: ${successCount} succès, ${failCount} échecs`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
