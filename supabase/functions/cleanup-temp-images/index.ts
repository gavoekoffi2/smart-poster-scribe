import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller is admin (optional auth check)
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: hasAdmin } = await supabase.rpc("has_any_role", {
          _user_id: user.id,
          _roles: ["super_admin", "admin"],
        });
        if (!hasAdmin) {
          return new Response(JSON.stringify({ error: "Non autorisé" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const bucketName = "temp-images";
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    // List all folders in the bucket
    const { data: folders, error: listError } = await supabase.storage
      .from(bucketName)
      .list("", { limit: 1000 });

    if (listError) {
      console.error("Error listing bucket:", listError);
      return new Response(JSON.stringify({ error: "Erreur lors du listing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const item of folders || []) {
      // List files in each folder
      const { data: files } = await supabase.storage
        .from(bucketName)
        .list(item.name, { limit: 1000 });

      if (!files) continue;

      const oldFiles = files.filter((f) => {
        if (!f.created_at) return false;
        return new Date(f.created_at) < sevenDaysAgo;
      });

      if (oldFiles.length > 0) {
        const paths = oldFiles.map((f) => `${item.name}/${f.name}`);
        const { error: delError } = await supabase.storage
          .from(bucketName)
          .remove(paths);

        if (!delError) {
          deletedCount += paths.length;
        } else {
          console.error(`Error deleting from ${item.name}:`, delError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, deleted: deletedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cleanup-temp-images error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
