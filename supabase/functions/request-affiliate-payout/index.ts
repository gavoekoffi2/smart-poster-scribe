import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_USD = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { amount_usd, payment_method, payment_details } = await req.json();
    if (!amount_usd || amount_usd < MIN_USD) {
      return new Response(JSON.stringify({ error: `Montant minimum: ${MIN_USD}$` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!payment_method) {
      return new Response(JSON.stringify({ error: "Méthode de paiement requise" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);
    const { data: aff } = await admin.from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
    if (!aff) return new Response(JSON.stringify({ error: "Compte affilié introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: balance } = await admin.rpc("get_affiliate_balance", { p_affiliate_id: aff.id });
    const available = Number((balance as any)?.available_usd || 0);
    if (amount_usd > available) {
      return new Response(JSON.stringify({ error: `Solde disponible insuffisant (${available}$)` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: row, error } = await admin.from("affiliate_payout_requests").insert({
      affiliate_id: aff.id,
      amount_usd,
      amount_fcfa: Math.round(amount_usd * 600),
      payment_method,
      payment_details: payment_details || {},
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, request: row }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
