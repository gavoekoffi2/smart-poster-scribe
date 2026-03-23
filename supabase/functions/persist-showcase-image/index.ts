import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Non autorisé");

    const { data: isAdmin } = await supabase.rpc("has_any_role", {
      _user_id: user.id,
      _roles: ["super_admin", "admin", "content_manager"],
    });
    if (!isAdmin) throw new Error("Non autorisé");

    const { image_id } = await req.json();
    if (!image_id) throw new Error("image_id requis");

    // Get the image record
    const { data: image, error: imgError } = await supabase
      .from("generated_images")
      .select("id, image_url")
      .eq("id", image_id)
      .single();
    if (imgError || !image) throw new Error("Image non trouvée");

    const imageUrl = image.image_url;

    // Skip if already in Supabase storage
    if (imageUrl.includes(supabaseUrl)) {
      return new Response(JSON.stringify({ success: true, url: imageUrl, already_persisted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the image
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error(`Impossible de télécharger l'image: ${imgResponse.status}`);

    const contentType = imgResponse.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    const blob = await imgResponse.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage
    const filePath = `showcase/${image_id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("reference-templates")
      .upload(filePath, uint8, {
        contentType,
        upsert: true,
      });
    if (uploadError) throw new Error(`Upload échoué: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("reference-templates")
      .getPublicUrl(filePath);

    const permanentUrl = urlData.publicUrl;

    // Update the image record with permanent URL
    const { error: updateError } = await supabase
      .from("generated_images")
      .update({ image_url: permanentUrl })
      .eq("id", image_id);
    if (updateError) throw new Error(`Mise à jour échouée: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, url: permanentUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
