import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. CDN headers (Cloudflare / Vercel / Fly)
    const headerCountry =
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("fly-client-ip-country") ||
      req.headers.get("x-country-code");

    if (headerCountry && headerCountry.length === 2 && headerCountry !== "XX") {
      return new Response(
        JSON.stringify({ country: headerCountry.toUpperCase(), source: "header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fallback : lookup via IP publique (ipapi.co est gratuit, no key)
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip = fwd.split(",")[0].trim();

    if (ip) {
      try {
        const res = await fetch(`https://ipapi.co/${ip}/country/`, {
          headers: { "User-Agent": "graphistegpt-detect/1.0" },
        });
        if (res.ok) {
          const txt = (await res.text()).trim();
          if (txt && txt.length === 2) {
            return new Response(
              JSON.stringify({ country: txt.toUpperCase(), source: "ipapi" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (_) {
        // ignore
      }
    }

    return new Response(JSON.stringify({ country: null, source: "none" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ country: null, error: err instanceof Error ? err.message : "unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
