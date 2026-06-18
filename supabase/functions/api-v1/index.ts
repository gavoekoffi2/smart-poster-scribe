// Public API v1 — GraphisteGPT
// Routes (all under /api-v1):
//   POST /v1/posters/generate
//   GET  /v1/posters/:jobId
//   GET  /v1/templates
//   POST /v1/templates/suggest
//   POST /v1/images/analyze
//   GET  /v1/account/credits
//   GET  /v1/account/usage
//
// Auth: Bearer <api_key>  (key format gpt_live_... or gpt_test_...)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// --- helpers ---
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

function errorResponse(code: string, message: string, status: number, requestId: string) {
  return jsonResponse({ success: false, error: { code, message }, request_id: requestId }, status);
}

function successResponse(data: unknown, requestId: string, status = 200) {
  return jsonResponse({ success: true, data, request_id: requestId }, status);
}

interface ApiKeyContext {
  apiKeyId: string;
  userId: string;
  scopes: string[];
  environment: "live" | "test";
}

async function authenticate(req: Request, requestId: string): Promise<ApiKeyContext | Response> {
  const auth = req.headers.get("authorization") || req.headers.get("x-api-key");
  if (!auth) {
    return errorResponse("UNAUTHENTICATED", "Missing Authorization header. Use 'Authorization: Bearer <api_key>'.", 401, requestId);
  }
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();
  if (!key.startsWith("gpt_live_") && !key.startsWith("gpt_test_")) {
    return errorResponse("INVALID_API_KEY", "API key format is invalid.", 401, requestId);
  }
  const hash = await sha256(key);
  const { data, error } = await admin.rpc("validate_api_key", { p_key_hash: hash });
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return errorResponse("INVALID_API_KEY", "API key is invalid, expired, or revoked.", 401, requestId);
  }
  const row = Array.isArray(data) ? data[0] : data;
  // touch last_used_at (fire-and-forget)
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.api_key_id).then(() => {});
  return {
    apiKeyId: row.api_key_id,
    userId: row.user_id,
    scopes: row.scopes || [],
    environment: row.environment || "live",
  };
}

function hasScope(ctx: ApiKeyContext, scope: string): boolean {
  return ctx.scopes.includes(scope) || ctx.scopes.includes("*");
}

async function logUsage(params: {
  ctx: ApiKeyContext;
  endpoint: string;
  method: string;
  statusCode: number;
  creditsUsed?: number;
  mode?: string;
  templateUsedId?: string | null;
  requestId: string;
  ip?: string;
  ua?: string;
  durationMs: number;
  errorCode?: string;
}) {
  await admin.from("api_usage_logs").insert({
    api_key_id: params.ctx.apiKeyId,
    user_id: params.ctx.userId,
    endpoint: params.endpoint,
    method: params.method,
    status_code: params.statusCode,
    credits_used: params.creditsUsed ?? 0,
    mode: params.mode ?? null,
    template_used_id: params.templateUsedId ?? null,
    request_id: params.requestId,
    ip: params.ip ?? null,
    user_agent: params.ua ?? null,
    duration_ms: params.durationMs,
    error_code: params.errorCode ?? null,
  }).then(() => {});
}

// In-memory token bucket per api_key (60 req/min)
const rateBuckets = new Map<string, { count: number; reset: number }>();
function checkRateLimit(apiKeyId: string, limit = 60, windowMs = 60_000): { ok: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const b = rateBuckets.get(apiKeyId);
  if (!b || b.reset < now) {
    rateBuckets.set(apiKeyId, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, reset: now + windowMs };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, reset: b.reset };
  b.count++;
  return { ok: true, remaining: limit - b.count, reset: b.reset };
}

// --- domain logic ---
async function suggestTemplate(domain: string, subject: string) {
  const { data, error } = await admin.rpc("match_reference_template", { p_domain: domain, p_subject: subject });
  if (error) {
    console.error("match_reference_template error:", error);
    return null;
  }
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return null;
  // Only return if score > 0; otherwise fallback handled by caller
  if (Number(rows[0].score) <= 0) {
    // still return first as soft fallback (same domain)
    return rows[0];
  }
  return rows[0];
}

function buildPromptFromStructured(input: any): string {
  const lines: string[] = [];
  if (input.title) lines.push(`Titre principal : ${input.title}`);
  if (input.subject) lines.push(`Sujet : ${input.subject}`);
  if (input.date) lines.push(`Date : ${input.date}`);
  if (input.location) lines.push(`Lieu : ${input.location}`);
  if (input.contact) lines.push(`Contact : ${input.contact}`);
  if (Array.isArray(input.prices) && input.prices.length) {
    lines.push(`Tarifs : ${input.prices.join(" | ")}`);
  }
  if (Array.isArray(input.speakers) && input.speakers.length) {
    lines.push(`Intervenants : ${input.speakers.join(", ")}`);
  }
  if (Array.isArray(input.colors) && input.colors.length) {
    lines.push(`Palette de couleurs : ${input.colors.join(", ")}`);
  }
  if (input.extra_instructions) lines.push(`Instructions supplémentaires : ${input.extra_instructions}`);
  lines.push(`Domaine : ${input.domain}`);
  lines.push(
    `Crée une affiche professionnelle, haute qualité, typographie soignée, hiérarchie visuelle claire, ` +
    `respectant exactement les textes fournis (anti-hallucination strict).`
  );
  return lines.join("\n");
}

async function callGenerateImage(payload: Record<string, unknown>, userId: string) {
  const url = `${SUPABASE_URL}/functions/v1/generate-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "x-internal-user-id": userId,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { /* not json */ }
  return { ok: res.ok, status: res.status, body: parsed ?? text };
}

// --- routes ---
async function routeGenerate(req: Request, ctx: ApiKeyContext, requestId: string) {
  if (!hasScope(ctx, "posters:generate")) {
    return errorResponse("FORBIDDEN", "Missing scope 'posters:generate'.", 403, requestId);
  }
  let body: any;
  try { body = await req.json(); } catch { return errorResponse("INVALID_BODY", "Body must be JSON.", 400, requestId); }

  const domain = typeof body.domain === "string" ? body.domain.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!domain) return errorResponse("MISSING_DOMAIN", "Field 'domain' is required.", 400, requestId);
  if (!subject && !body.title && !body.prompt) {
    return errorResponse("MISSING_SUBJECT", "Provide at least 'subject', 'title' or 'prompt'.", 400, requestId);
  }

  // 🔒 STRICT PREMIUM POLICY: every API request is forced to gpt-image-2.
  // `mode` / `quality` from the body are recorded for logging but ignored.
  const requestedQuality = typeof body.quality === "string"
    ? body.quality
    : (body.mode === "fast" ? "fast" : (body.mode === "quality" ? "quality" : "unspecified"));
  const mode: "quality" = "quality";
  const aspectRatio = typeof body.aspect_ratio === "string" ? body.aspect_ratio : "9:16";
  const resolution = typeof body.resolution === "string" ? body.resolution : "2K";

  // Reference image: explicit URL provided OR auto-pick from DB
  let referenceImage: string | undefined = typeof body.reference_image_url === "string" ? body.reference_image_url : undefined;
  let templateUsedId: string | null = null;
  if (!referenceImage) {
    const tpl = await suggestTemplate(domain, subject || body.title || "");
    if (tpl) {
      referenceImage = tpl.image_url;
      templateUsedId = tpl.id;
    }
  }

  // Build prompt
  const basePrompt = typeof body.prompt === "string" && body.prompt.trim().length > 0
    ? body.prompt
    : buildPromptFromStructured({ ...body, domain, subject });
  // Short-text policy for API posters
  const prompt = `${basePrompt}\n\n[Règle texte stricte] L'affiche doit contenir : un titre court (≤6 mots), 2 à 5 mots-clés courts, 1 CTA court. Aucun paragraphe long. Le texte long reste hors de l'image.`;

  const quality: "premium" = "premium";

  const payload: Record<string, unknown> = {
    prompt,
    domain,
    aspectRatio,
    resolution,
    quality,
    apiStrictPremium: true,
    referenceImage,
    logoImages: Array.isArray(body.logo_urls) ? body.logo_urls : (body.logo_url ? [body.logo_url] : undefined),
  };

  console.log(JSON.stringify({
    request_id: requestId,
    requested_quality: requestedQuality,
    forced_quality: "premium",
    expected_model: "gpt-image-2",
    expected_provider: "openai",
    template_id: templateUsedId,
  }));

  // Constant identity exposed to API clients
  const MODEL = "gpt-image-2";
  const PROVIDER = "openai";

  // Test mode: simulate without consuming credits
  if (ctx.environment === "test") {
    return successResponse({
      job_id: `test_${requestId}`,
      status: "completed",
      image_url: "https://placehold.co/1080x1920/png?text=API+test+mode",
      mode,
      quality: "premium",
      model: MODEL,
      provider: PROVIDER,
      fallback_used: false,
      template_used: templateUsedId ? { id: templateUsedId, image_url: referenceImage } : null,
      sandbox: true,
    }, requestId);
  }

  const { ok, status, body: respBody } = await callGenerateImage(payload, ctx.userId);
  if (!ok || !respBody || (respBody as any).success === false) {
    const msg = (respBody as any)?.message || (respBody as any)?.error || "Generation failed";
    const code = (respBody as any)?.error || "GENERATION_FAILED";
    return errorResponse(typeof code === "string" ? code : "GENERATION_FAILED", msg, status >= 400 ? status : 502, requestId);
  }

  // generate-image is async: it returns { success: true, jobId, status: 'processing' }
  // and runs the actual generation in the background. Poll image_jobs for the final result.
  // IMPORTANT: we deliberately do NOT fall back to the template URL — the template is a
  // reference only and must never be returned as the final image.
  let imageUrl: string | undefined =
    (respBody as any)?.imageUrl ||
    (respBody as any)?.image_url ||
    (respBody as any)?.url ||
    (respBody as any)?.result_url ||
    (respBody as any)?.data?.imageUrl;
  const jobId: string | undefined = (respBody as any)?.jobId || (respBody as any)?.job_id;
  let jobStatus: "completed" | "failed" | "processing" = "completed";
  let creditsUsed = (respBody as any)?.credits_used ?? (respBody as any)?.creditsUsed ?? 0;
  let errorMessage: string | null = null;
  let modelUsed: string | null = null;
  let providerUsed: string | null = null;
  let fallbackUsed = false;

  if (!imageUrl && jobId) {
    const pollStart = Date.now();
    const timeoutMs = 110_000;
    const intervalMs = 1500;
    jobStatus = "processing";
    while (Date.now() - pollStart < timeoutMs) {
      await new Promise((r) => setTimeout(r, intervalMs));
      const { data: job, error: jobErr } = await admin
        .from("image_jobs")
        .select("status, result_url, error_message, model_used, provider_used, fallback_used")
        .eq("id", jobId)
        .maybeSingle();
      if (jobErr) {
        console.error("image_jobs poll error:", jobErr);
        continue;
      }
      if (!job) continue;
      if (job.status === "completed" && job.result_url) {
        imageUrl = job.result_url;
        modelUsed = (job as any).model_used ?? null;
        providerUsed = (job as any).provider_used ?? null;
        fallbackUsed = (job as any).fallback_used ?? false;
        jobStatus = "completed";
        break;
      }
      if (job.status === "failed") {
        errorMessage = job.error_message || "Generation failed";
        jobStatus = "failed";
        break;
      }
    }
  }

  if (jobStatus === "failed") {
    const isPremiumUnavailable = (errorMessage || "").includes("PREMIUM_MODEL_UNAVAILABLE");
    return errorResponse(
      isPremiumUnavailable ? "PREMIUM_MODEL_UNAVAILABLE" : "GENERATION_FAILED",
      isPremiumUnavailable
        ? "GPT Image 2 is required for all API generations. No fast or fallback model was used."
        : (errorMessage || "Generation failed"),
      502,
      requestId,
    );
  }

  if (jobStatus === "processing") {
    return jsonResponse({
      success: true,
      data: {
        job_id: jobId,
        status: "processing",
        image_url: null,
        mode,
        quality: "premium",
        model: MODEL,
        provider: PROVIDER,
        fallback_used: false,
        credits_used: creditsUsed,
        template_used: templateUsedId ? { id: templateUsedId, image_url: referenceImage } : null,
        poll_url: `/v1/posters/${jobId}`,
        message: "Generation still in progress. Poll GET /v1/posters/{job_id} to retrieve the final image.",
      },
      request_id: requestId,
    }, 202);
  }

  // Safety: in strict premium mode the final image_url must never equal the template URL.
  if (imageUrl && referenceImage && imageUrl === referenceImage) {
    return errorResponse(
      "PREMIUM_MODEL_UNAVAILABLE",
      "GPT Image 2 is required for all API generations. No fast or fallback model was used.",
      502,
      requestId,
    );
  }

  // Best-effort credit count when downstream didn't report it (matches check_and_debit_credits).
  if (!creditsUsed || creditsUsed === 0) {
    creditsUsed = 2;
  }

  console.log(JSON.stringify({
    request_id: requestId,
    job_id: jobId,
    forced_quality: "premium",
    actual_model: modelUsed || MODEL,
    actual_provider: providerUsed || PROVIDER,
    fallback_used: fallbackUsed,
    template_id: templateUsedId,
    status: "completed",
  }));

  return successResponse({
    job_id: jobId || requestId,
    status: "completed",
    image_url: imageUrl,
    mode,
    quality: "premium",
    model: modelUsed || MODEL,
    provider: providerUsed || PROVIDER,
    fallback_used: fallbackUsed,
    credits_used: creditsUsed,
    template_used: templateUsedId ? { id: templateUsedId, image_url: referenceImage } : null,
  }, requestId);
}

async function routePosterStatus(jobId: string, ctx: ApiKeyContext, requestId: string) {
  if (!hasScope(ctx, "posters:generate") && !hasScope(ctx, "posters:read")) {
    return errorResponse("FORBIDDEN", "Missing scope 'posters:generate' or 'posters:read'.", 403, requestId);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
    return errorResponse("INVALID_JOB_ID", "Job id must be a UUID.", 400, requestId);
  }
  const { data: job, error } = await admin
    .from("image_jobs")
    .select("id, status, result_url, error_message, user_id, created_at, updated_at, model_used, provider_used, fallback_used, params")
    .eq("id", jobId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) return errorResponse("DB_ERROR", error.message, 500, requestId);
  if (!job) return errorResponse("NOT_FOUND", "Job not found.", 404, requestId);
  const normStatus = job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : "processing";
  const apiStrict = (job as any).params?.apiStrictPremium === true;
  if (normStatus === "failed") {
    const msg = job.error_message || "Generation failed";
    const isPremiumUnavailable = msg.includes("PREMIUM_MODEL_UNAVAILABLE");
    return errorResponse(
      isPremiumUnavailable ? "PREMIUM_MODEL_UNAVAILABLE" : "GENERATION_FAILED",
      isPremiumUnavailable
        ? "GPT Image 2 is required for all API generations. No fast or fallback model was used."
        : msg,
      502,
      requestId,
    );
  }
  return successResponse({
    job_id: job.id,
    status: normStatus,
    image_url: job.result_url || null,
    quality: apiStrict ? "premium" : null,
    model: (job as any).model_used || (apiStrict ? "gpt-image-2" : null),
    provider: (job as any).provider_used || (apiStrict ? "openai" : null),
    fallback_used: (job as any).fallback_used ?? false,
    error_message: job.error_message || null,
    created_at: job.created_at,
    updated_at: job.updated_at,
  }, requestId);
}

async function routeTemplates(_req: Request, url: URL, ctx: ApiKeyContext, requestId: string) {
  if (!hasScope(ctx, "templates:read")) return errorResponse("FORBIDDEN", "Missing scope 'templates:read'.", 403, requestId);
  const domain = url.searchParams.get("domain");
  const category = url.searchParams.get("category");
  const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);
  let q = admin.from("reference_templates").select("id,image_url,domain,design_category,tags,description,usage_count").eq("is_active", true).order("usage_count", { ascending: false }).limit(limit);
  if (domain) q = q.eq("domain", domain);
  if (category) q = q.eq("design_category", category);
  const { data, error } = await q;
  if (error) return errorResponse("DB_ERROR", error.message, 500, requestId);
  return successResponse({ templates: data || [] }, requestId);
}

async function routeTemplateSuggest(req: Request, ctx: ApiKeyContext, requestId: string) {
  if (!hasScope(ctx, "templates:read")) return errorResponse("FORBIDDEN", "Missing scope 'templates:read'.", 403, requestId);
  let body: any;
  try { body = await req.json(); } catch { return errorResponse("INVALID_BODY", "Body must be JSON.", 400, requestId); }
  const domain = typeof body.domain === "string" ? body.domain : "";
  const subject = typeof body.subject === "string" ? body.subject : "";
  if (!domain) return errorResponse("MISSING_DOMAIN", "Field 'domain' required.", 400, requestId);
  const tpl = await suggestTemplate(domain, subject);
  return successResponse({ template: tpl }, requestId);
}

async function routeAccountCredits(ctx: ApiKeyContext, requestId: string) {
  if (!hasScope(ctx, "account:read")) return errorResponse("FORBIDDEN", "Missing scope 'account:read'.", 403, requestId);
  const { data: sub } = await admin.from("user_subscriptions").select("credits_remaining,free_generations_used,current_period_end,status,plan_id").eq("user_id", ctx.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: plan } = sub?.plan_id ? await admin.from("subscription_plans").select("name,slug").eq("id", sub.plan_id).maybeSingle() : { data: null };
  return successResponse({
    credits_remaining: sub?.credits_remaining ?? 0,
    free_generations_used: sub?.free_generations_used ?? 0,
    period_end: sub?.current_period_end ?? null,
    status: sub?.status ?? "inactive",
    plan: plan || null,
  }, requestId);
}

async function routeAccountUsage(ctx: ApiKeyContext, requestId: string) {
  if (!hasScope(ctx, "account:read")) return errorResponse("FORBIDDEN", "Missing scope 'account:read'.", 403, requestId);
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data } = await admin.from("api_usage_logs").select("endpoint,status_code,credits_used,mode,created_at,duration_ms").eq("user_id", ctx.userId).gte("created_at", since).order("created_at", { ascending: false }).limit(500);
  return successResponse({ logs: data || [] }, requestId);
}

async function routeAnalyze(req: Request, ctx: ApiKeyContext, requestId: string) {
  if (!hasScope(ctx, "images:analyze")) return errorResponse("FORBIDDEN", "Missing scope 'images:analyze'.", 403, requestId);
  let body: any;
  try { body = await req.json(); } catch { return errorResponse("INVALID_BODY", "Body must be JSON.", 400, requestId); }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = null; try { parsed = JSON.parse(text); } catch {}
  if (!res.ok) return errorResponse("ANALYZE_FAILED", parsed?.error || text || "Analyze failed", res.status, requestId);
  return successResponse(parsed ?? { raw: text }, requestId);
}

// --- entrypoint ---
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Strip the function name prefix (anything before /v1/)
  const v1Idx = url.pathname.indexOf("/v1/");
  const path = v1Idx >= 0 ? url.pathname.slice(v1Idx) : url.pathname;
  const requestId = crypto.randomUUID();
  const t0 = Date.now();

  if (!path.startsWith("/v1/")) {
    return successResponse({
      name: "GraphisteGPT API",
      version: "v1",
      docs: "https://graphistegpt.pro/docs/api",
      endpoints: [
        "POST /v1/posters/generate",
        "GET /v1/templates",
        "POST /v1/templates/suggest",
        "POST /v1/images/analyze",
        "GET /v1/account/credits",
        "GET /v1/account/usage",
      ],
    }, requestId);
  }

  // Auth
  const authResult = await authenticate(req, requestId);
  if (authResult instanceof Response) return authResult;
  const ctx = authResult;

  // Rate limit
  const rl = checkRateLimit(ctx.apiKeyId);
  if (!rl.ok) {
    return jsonResponse(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many requests." }, request_id: requestId },
      429,
      { "X-RateLimit-Limit": "60", "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(rl.reset) }
    );
  }

  const ip = req.headers.get("x-forwarded-for") || undefined;
  const ua = req.headers.get("user-agent") || undefined;

  let response: Response;
  try {
    if (path === "/v1/posters/generate" && req.method === "POST") {
      response = await routeGenerate(req, ctx, requestId);
    } else if (path.startsWith("/v1/posters/") && req.method === "GET") {
      const jobId = path.slice("/v1/posters/".length).split("/")[0];
      response = await routePosterStatus(jobId, ctx, requestId);
    } else if (path === "/v1/templates" && req.method === "GET") {
      response = await routeTemplates(req, url, ctx, requestId);
    } else if (path === "/v1/templates/suggest" && req.method === "POST") {
      response = await routeTemplateSuggest(req, ctx, requestId);
    } else if (path === "/v1/images/analyze" && req.method === "POST") {
      response = await routeAnalyze(req, ctx, requestId);
    } else if (path === "/v1/account/credits" && req.method === "GET") {
      response = await routeAccountCredits(ctx, requestId);
    } else if (path === "/v1/account/usage" && req.method === "GET") {
      response = await routeAccountUsage(ctx, requestId);
    } else {
      response = errorResponse("NOT_FOUND", `No route for ${req.method} ${path}`, 404, requestId);
    }
  } catch (err) {
    console.error("api-v1 unhandled error:", err);
    response = errorResponse("INTERNAL_ERROR", (err as Error).message || "Unknown error", 500, requestId);
  }

  // log usage async
  const duration = Date.now() - t0;
  let parsedStatus = response.status;
  logUsage({
    ctx,
    endpoint: path,
    method: req.method,
    statusCode: parsedStatus,
    requestId,
    ip,
    ua,
    durationMs: duration,
  });

  // Inject rate-limit headers
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", "60");
  headers.set("X-RateLimit-Remaining", String(rl.remaining));
  headers.set("X-RateLimit-Reset", String(rl.reset));
  headers.set("X-Request-Id", requestId);
  return new Response(response.body, { status: response.status, headers });
});
