import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a simple hash from base64 image data for duplicate detection
async function generateImageHash(base64Data: string): Promise<string> {
  // Remove data URL prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
  
  // Take a sample of the image data (first 10KB) for faster hashing
  const sample = cleanBase64.slice(0, 10000);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(sample);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Extract base64 data from various image URL formats
function extractBase64(imageData: string): string | null {
  if (imageData.startsWith("data:image")) {
    return imageData;
  }
  return null;
}

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

    const body = await req.json();
    const { imageData, domain, description, designCategory, tags } = body;

    if (!imageData) {
      throw new Error("imageData is required");
    }

    if (!domain) {
      throw new Error("domain is required");
    }

    console.log(`Processing reference image for domain: ${domain}`);

    // Generate hash for duplicate detection
    const imageHash = await generateImageHash(imageData);
    console.log(`Generated image hash: ${imageHash.slice(0, 16)}...`);

    // Check if this image hash already exists in our templates
    // We'll store the hash in the description field prefix for now
    const hashPrefix = `[HASH:${imageHash.slice(0, 32)}]`;
    
    const { data: existingTemplates, error: searchError } = await supabase
      .from("reference_templates")
      .select("id, description")
      .like("description", `${hashPrefix}%`);

    if (searchError) {
      console.error("Error checking for duplicates:", searchError);
    }

    if (existingTemplates && existingTemplates.length > 0) {
      console.log("Duplicate image detected, skipping insertion");
      return new Response(JSON.stringify({
        success: true,
        isDuplicate: true,
        message: "Cette image existe déjà dans la base de données",
        existingId: existingTemplates[0].id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload image to storage
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Determine file extension from data URL
    const mimeMatch = imageData.match(/^data:image\/([a-z]+);base64,/);
    const extension = mimeMatch ? mimeMatch[1] : "jpg";
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `user-contributed/${domain}/${timestamp}-${imageHash.slice(0, 8)}.${extension}`;

    console.log(`Uploading image to storage: ${filename}`);

    const { error: uploadError } = await supabase.storage
      .from("reference-templates")
      .upload(filename, imageBytes, {
        contentType: `image/${extension}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("reference-templates")
      .getPublicUrl(filename);

    const imageUrl = urlData.publicUrl;
    console.log(`Image uploaded: ${imageUrl}`);

    // Prepare template data
    const templateDescription = `${hashPrefix} ${description || `Template ${domain} contribué par utilisateur`}`;
    const templateCategory = designCategory || "general";
    const templateTags = tags || [domain, "user-contributed"];

    // Insert into reference_templates
    const { data: insertedTemplate, error: insertError } = await supabase
      .from("reference_templates")
      .insert({
        domain,
        design_category: templateCategory,
        image_url: imageUrl,
        description: templateDescription,
        tags: templateTags,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      // Try to clean up uploaded file
      await supabase.storage.from("reference-templates").remove([filename]);
      throw new Error(`Failed to save template: ${insertError.message}`);
    }

    console.log(`Template saved successfully: ${insertedTemplate.id}`);

    return new Response(JSON.stringify({
      success: true,
      isDuplicate: false,
      message: "Image de référence ajoutée à la base de données",
      template: {
        id: insertedTemplate.id,
        domain: insertedTemplate.domain,
        imageUrl: insertedTemplate.image_url,
      },
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
