// Manage API keys (create / revoke). Authenticated user only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomKey(env: "live" | "test") {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 32);
  return `gpt_${env}_${b64}`;
}

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "UNAUTHENTICATED" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user }, error: uerr } = await userClient.auth.getUser();
  if (uerr || !user) return json({ error: "UNAUTHENTICATED" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (req.method === "GET" ? "list" : "create");

  if (action === "list") {
    const { data, error } = await admin
      .from("api_keys")
      .select("id,name,key_prefix,environment,scopes,is_active,last_used_at,expires_at,revoked_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ keys: data });
  }

  if (action === "create") {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const name = (body.name || "Sans titre").toString().slice(0, 100);
    const environment: "live" | "test" = body.environment === "test" ? "test" : "live";
    const scopes = Array.isArray(body.scopes) && body.scopes.length
      ? body.scopes.map(String)
      : ["posters:generate", "posters:read", "templates:read", "images:analyze", "account:read"];
    const key = randomKey(environment);
    const hash = await sha256(key);
    const prefix = key.slice(0, 16); // e.g. gpt_live_XXXXXXXX

    const { data, error } = await admin
      .from("api_keys")
      .insert({
        user_id: user.id,
        name,
        key_hash: hash,
        key_prefix: prefix,
        environment,
        scopes,
      })
      .select("id,name,key_prefix,environment,scopes,created_at")
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ key, record: data });
  }

  if (action === "revoke") {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const id = body.id;
    if (!id) return json({ error: "MISSING_ID" }, 400);
    const { error } = await admin
      .from("api_keys")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  return json({ error: "UNKNOWN_ACTION" }, 400);
});
