// Cron: alerts admins when > 5 payments failed in the last hour.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("payment_transactions")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", since);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const failed = count || 0;
  let alerted = 0;

  if (failed > 5) {
    // Notify all admins
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["super_admin", "admin"]);

    const userIds = Array.from(new Set((admins || []).map((a: any) => a.user_id)));
    for (const uid of userIds) {
      await supabase.rpc("create_notification", {
        p_user_id: uid,
        p_type: "payment_health_alert",
        p_title: "⚠ Paiements en échec",
        p_body: `${failed} paiements ont échoué dans la dernière heure. Vérifiez l'état de GeniusPay.`,
        p_link: "/admin/dashboard",
        p_payload: { failed_count: failed },
      });
      alerted++;
    }
  }

  return new Response(JSON.stringify({ failed, alerted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
