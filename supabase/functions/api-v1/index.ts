// Public API v1 — GraphisteGPT
// Routes (all under /api-v1):
//   POST /v1/posters/generate
//   GET  /v1/posters/:jobId
//   GET  /v1/templates
//   POST /v1/templates/suggest
//   POST /v1/images/analyze
//   GET  /v1/account/credits
//   GET  /v1/account/usage
//   GET  /v1/domains
//   GET  /v1/openapi.json
//
// Auth: Bearer <api_key>  (key format gpt_live_... or gpt_test_...)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key",
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

function errorResponse(code: string, message: string, status: number, requestId: string, extra: Record<string, unknown> = {}) {
  return jsonResponse({ success: false, error: { code, message, request_id: requestId, ...extra } }, status);
}

function successResponse(data: unknown, requestId: string, status = 200, warnings?: string[]) {
  const body: any = { success: true, data, request_id: requestId };
  if (warnings && warnings.length) body.warnings = warnings;
  return jsonResponse(body, status);
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

// --- aspect ratio handling ---
const ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:5", "5:4", "4:3", "3:4", "2:3", "3:2", "1.91:1"] as const;
type AspectRatio = typeof ASPECT_RATIOS[number];

function dimensionsFor(aspect: string, resolution: string): { width: number; height: number } {
  // base "long edge" by resolution
  const longEdge = resolution === "4K" ? 3840 : resolution === "2K" ? 2048 : 1024;
  const map: Record<string, [number, number]> = {
    "9:16": [9, 16],
    "16:9": [16, 9],
    "1:1": [1, 1],
    "4:5": [4, 5],
    "5:4": [5, 4],
    "4:3": [4, 3],
    "3:4": [3, 4],
    "2:3": [2, 3],
    "3:2": [3, 2],
    "1.91:1": [1.91, 1],
  };
  const [w, h] = map[aspect] || [9, 16];
  const scale = longEdge / Math.max(w, h);
  const round = (n: number) => Math.round(n / 8) * 8;
  return { width: round(w * scale), height: round(h * scale) };
}

// --- allowed-fields validation (warnings, non-breaking) ---
const ALLOWED_FIELDS = new Set([
  "domain", "subject", "title", "date", "location", "contact",
  "prices", "speakers", "colors", "extra_instructions",
  "aspect_ratio", "resolution", "reference_image_url",
  "logo_url", "logo_urls",
  "mode", "webhook_url", "idempotency_key",
  // tolerated (forced internally):
  "quality",
  // tolerated legacy:
  "prompt",
]);

const SNAKE_ALIASES: Record<string, string> = {
  aspectRatio: "aspect_ratio",
  logoUrl: "logo_url",
  logoUrls: "logo_urls",
  referenceImageUrl: "reference_image_url",
  webhookUrl: "webhook_url",
  idempotencyKey: "idempotency_key",
  extraInstructions: "extra_instructions",
};

function normalizeAndValidate(body: any): { normalized: any; warnings: string[] } {
  const warnings: string[] = [];
  const normalized: any = {};
  for (const [k, v] of Object.entries(body || {})) {
    let key = k;
    if (SNAKE_ALIASES[k]) {
      warnings.push(`champ '${k}' renommé en '${SNAKE_ALIASES[k]}' (utilisez snake_case)`);
      key = SNAKE_ALIASES[k];
    }
    if (!ALLOWED_FIELDS.has(key)) {
      warnings.push(`champ '${k}' ignoré : non supporté. Voir la doc /docs/api ou GET /v1/openapi.json`);
      continue;
    }
    normalized[key] = v;
  }
  if ("prompt" in normalized) {
    warnings.push("champ 'prompt' ignoré : utilisez 'subject' pour la direction créative");
  }
  if ("quality" in normalized && normalized.quality && normalized.quality !== "premium") {
    warnings.push(`'quality' demandé = '${normalized.quality}' ; forcé à 'premium' (politique API)`);
  }
  return { normalized, warnings };
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

// --- idempotency cache ---
async function getIdempotent(apiKeyId: string, key: string): Promise<{ status: number; body: any } | null> {
  if (!key) return null;
  const { data } = await admin
    .from("api_idempotency_keys")
    .select("response_body, status_code, expires_at")
    .eq("api_key_id", apiKeyId)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return { status: data.status_code, body: data.response_body };
}
async function saveIdempotent(apiKeyId: string, key: string, status: number, body: any) {
  if (!key) return;
  await admin.from("api_idempotency_keys").upsert({
    api_key_id: apiKeyId,
    idempotency_key: key,
    response_body: body,
    status_code: status,
  }, { onConflict: "api_key_id,idempotency_key" });
}

// --- routes ---
async function routeGenerate(req: Request, ctx: ApiKeyContext, requestId: string, baseUrl: string, idemHeader: string) {
  if (!hasScope(ctx, "posters:generate")) {
    return errorResponse("FORBIDDEN", "Missing scope 'posters:generate'.", 403, requestId);
  }
  let raw: any;
  try { raw = await req.json(); } catch { return errorResponse("INVALID_BODY", "Body must be JSON.", 400, requestId); }

  const { normalized: body, warnings } = normalizeAndValidate(raw);

  // Idempotency check
  const idemKey = idemHeader || (typeof body.idempotency_key === "string" ? body.idempotency_key : "");
  if (idemKey) {
    const hit = await getIdempotent(ctx.apiKeyId, idemKey);
    if (hit) {
      return jsonResponse({ ...hit.body, request_id: requestId, idempotent_replay: true }, hit.status);
    }
  }

  const domain = typeof body.domain === "string" ? body.domain.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!domain) return errorResponse("MISSING_DOMAIN", "Field 'domain' is required.", 400, requestId);
  if (!subject && !body.title) {
    return errorResponse("MISSING_SUBJECT", "Provide at least 'subject' or 'title'.", 400, requestId);
  }

  // Aspect ratio: strict whitelist; default 9:16 with warning
  let aspectRatio: string;
  if (typeof body.aspect_ratio !== "string" || body.aspect_ratio.length === 0) {
    aspectRatio = "9:16";
    warnings.push("aspect_ratio non fourni, défaut 9:16 appliqué");
  } else if (!ASPECT_RATIOS.includes(body.aspect_ratio as AspectRatio)) {
    return errorResponse(
      "INVALID_ASPECT_RATIO",
      `aspect_ratio '${body.aspect_ratio}' non supporté.`,
      400,
      requestId,
      { allowed: ASPECT_RATIOS },
    );
  } else {
    aspectRatio = body.aspect_ratio;
  }

  const resolution = typeof body.resolution === "string" ? body.resolution : "2K";
  const { width, height } = dimensionsFor(aspectRatio, resolution);

  // Mode
  const mode: "sync" | "async" = body.mode === "async" ? "async" : "sync";
  const webhookUrl = typeof body.webhook_url === "string" ? body.webhook_url : undefined;

  // Reference image
  let referenceImage: string | undefined = typeof body.reference_image_url === "string" ? body.reference_image_url : undefined;
  let templateUsedId: string | null = null;
  if (!referenceImage) {
    const tpl = await suggestTemplate(domain, subject || body.title || "");
    if (tpl) {
      referenceImage = tpl.image_url;
      templateUsedId = tpl.id;
    }
  }

  // Build prompt (legacy `prompt` field is ignored — warned above)
  const basePrompt = buildPromptFromStructured({ ...body, domain, subject });
  const prompt = `${basePrompt}\n\n[Règle texte stricte] L'affiche doit contenir : un titre court (≤6 mots), 2 à 5 mots-clés courts, 1 CTA court. Aucun paragraphe long. Le texte long reste hors de l'image.`;

  const payload: Record<string, unknown> = {
    prompt,
    domain,
    aspectRatio,
    resolution,
    quality: "premium",
    apiStrictPremium: true,
    referenceImage,
    logoImages: Array.isArray(body.logo_urls) ? body.logo_urls : (body.logo_url ? [body.logo_url] : undefined),
    webhookUrl,
  };

  const MODEL = "gpt-image-2";
  const PROVIDER = "openai";
  const FORMAT = "png";

  // Sandbox / test mode: respect requested aspect ratio
  if (ctx.environment === "test") {
    const body = {
      job_id: `test_${requestId}`,
      status: "completed",
      image_url: `https://placehold.co/${width}x${height}/png?text=API+test+mode`,
      mode,
      quality: "premium",
      model: MODEL,
      provider: PROVIDER,
      fallback_used: false,
      aspect_ratio: aspectRatio,
      width,
      height,
      format: FORMAT,
      bytes: null,
      credits_used: 0,
      template_used: templateUsedId ? { id: templateUsedId, image_url: referenceImage, note: "Reference only — NOT the final image." } : null,
      sandbox: true,
    };
    const resp = { success: true, data: body, request_id: requestId, warnings: warnings.length ? warnings : undefined };
    if (idemKey) await saveIdempotent(ctx.apiKeyId, idemKey, 200, resp);
    return jsonResponse(resp, 200);
  }

  const { ok, status, body: respBody } = await callGenerateImage(payload, ctx.userId);
  if (!ok || !respBody || (respBody as any).success === false) {
    const msg = (respBody as any)?.message || (respBody as any)?.error || "Generation failed";
    const code = (respBody as any)?.error || "GENERATION_FAILED";
    return errorResponse(typeof code === "string" ? code : "GENERATION_FAILED", msg, status >= 400 ? status : 502, requestId);
  }

  let imageUrl: string | undefined =
    (respBody as any)?.imageUrl ||
    (respBody as any)?.image_url ||
    (respBody as any)?.url ||
    (respBody as any)?.result_url;
  const jobId: string | undefined = (respBody as any)?.jobId || (respBody as any)?.job_id;
  let jobStatus: "completed" | "failed" | "processing" = "completed";
  let creditsUsed = (respBody as any)?.credits_used ?? (respBody as any)?.creditsUsed ?? 0;
  let errorMessage: string | null = null;
  let modelUsed: string | null = null;
  let providerUsed: string | null = null;
  let fallbackUsed = false;

  // ASYNC mode: return 202 immediately if we got a job_id
  if (mode === "async" && jobId) {
    const statusUrl = `${baseUrl}/v1/posters/${jobId}`;
    const respAsync = {
      success: true,
      data: {
        job_id: jobId,
        status: "processing",
        image_url: null,
        status_url: statusUrl,
        webhook_url: webhookUrl ?? null,
        mode: "async",
        quality: "premium",
        model: MODEL,
        provider: PROVIDER,
        fallback_used: false,
        aspect_ratio: aspectRatio,
        width,
        height,
        format: FORMAT,
        credits_used: 2,
        template_used: templateUsedId ? { id: templateUsedId, image_url: referenceImage, note: "Reference only — NOT the final image." } : null,
      },
      request_id: requestId,
      warnings: warnings.length ? warnings : undefined,
    };
    if (idemKey) await saveIdempotent(ctx.apiKeyId, idemKey, 202, respAsync);
    return jsonResponse(respAsync, 202);
  }

  // SYNC mode: poll until completion or timeout
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
      if (jobErr) { console.error("image_jobs poll error:", jobErr); continue; }
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
    // sync mode timeout — return 202 + status_url so the client can poll
    const statusUrl = `${baseUrl}/v1/posters/${jobId}`;
    const respTimeout = {
      success: true,
      data: {
        job_id: jobId,
        status: "processing",
        image_url: null,
        status_url: statusUrl,
        mode: "sync",
        quality: "premium",
        model: MODEL,
        provider: PROVIDER,
        fallback_used: false,
        aspect_ratio: aspectRatio,
        width,
        height,
        format: FORMAT,
        credits_used: creditsUsed,
        template_used: templateUsedId ? { id: templateUsedId, image_url: referenceImage, note: "Reference only — NOT the final image." } : null,
        message: "Generation still in progress. Poll status_url to retrieve the final image.",
      },
      request_id: requestId,
      warnings: warnings.length ? warnings : undefined,
    };
    if (idemKey) await saveIdempotent(ctx.apiKeyId, idemKey, 202, respTimeout);
    return jsonResponse(respTimeout, 202);
  }

  // Safety: template URL must never be returned as final image
  if (imageUrl && referenceImage && imageUrl === referenceImage) {
    return errorResponse(
      "PREMIUM_MODEL_UNAVAILABLE",
      "GPT Image 2 is required for all API generations. No fast or fallback model was used.",
      502,
      requestId,
    );
  }

  if (!creditsUsed || creditsUsed === 0) creditsUsed = 2;

  const respOk = {
    success: true,
    data: {
      job_id: jobId || requestId,
      status: "completed",
      image_url: imageUrl,
      mode,
      quality: "premium",
      model: modelUsed || MODEL,
      provider: providerUsed || PROVIDER,
      fallback_used: fallbackUsed,
      aspect_ratio: aspectRatio,
      width,
      height,
      format: FORMAT,
      bytes: null,
      credits_used: creditsUsed,
      template_used: templateUsedId ? { id: templateUsedId, image_url: referenceImage, note: "Reference only — NOT the final image." } : null,
    },
    request_id: requestId,
    warnings: warnings.length ? warnings : undefined,
  };
  if (idemKey) await saveIdempotent(ctx.apiKeyId, idemKey, 200, respOk);
  return jsonResponse(respOk, 200);
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
  const params = (job as any).params || {};
  const apiStrict = params.apiStrictPremium === true;
  const aspectRatio = typeof params.aspectRatio === "string" ? params.aspectRatio : "9:16";
  const resolution = typeof params.resolution === "string" ? params.resolution : "2K";
  const { width, height } = dimensionsFor(aspectRatio, resolution);

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
    aspect_ratio: aspectRatio,
    width,
    height,
    format: "png",
    error: null,
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

async function routeDomains(_ctx: ApiKeyContext, requestId: string) {
  const { data } = await admin
    .from("reference_templates")
    .select("domain")
    .eq("is_active", true);
  const seen = new Set<string>();
  for (const r of data || []) {
    if (r.domain && typeof r.domain === "string") seen.add(r.domain.toLowerCase());
  }
  seen.add("business");
  const domains = Array.from(seen).sort().map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }));
  return successResponse({ domains, default: "business" }, requestId);
}

// --- OpenAPI 3.1 spec ---
function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "GraphisteGPT API",
      version: "1.1.0",
      description:
        "API publique pour générer des affiches premium via GPT Image 2.\n\n" +
        "**Important** : appel server-to-server uniquement. Ne jamais exposer la clé `gpt_live_*` côté navigateur.",
      contact: { url: "https://graphistegpt.pro/docs/api" },
    },
    servers: [{ url: baseUrl, description: "Production" }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API key (gpt_live_* or gpt_test_*)" },
      },
      schemas: {
        AspectRatio: { type: "string", enum: ASPECT_RATIOS },
        Mode: { type: "string", enum: ["sync", "async"], default: "sync" },
        Resolution: { type: "string", enum: ["1K", "2K", "4K"], default: "2K" },
        Error: {
          type: "object",
          properties: {
            success: { const: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                request_id: { type: "string" },
              },
              required: ["code", "message", "request_id"],
            },
          },
        },
        GenerateRequest: {
          type: "object",
          required: ["domain"],
          properties: {
            domain: { type: "string", description: "Voir GET /v1/domains pour la liste valide." },
            subject: { type: "string", description: "Direction créative principale. À utiliser à la place de 'prompt'." },
            title: { type: "string" },
            date: { type: "string" },
            location: { type: "string" },
            contact: { type: "string" },
            prices: { type: "array", items: { type: "string" } },
            speakers: { type: "array", items: { type: "string" } },
            colors: { type: "array", items: { type: "string" } },
            extra_instructions: { type: "string" },
            aspect_ratio: { $ref: "#/components/schemas/AspectRatio" },
            resolution: { $ref: "#/components/schemas/Resolution" },
            reference_image_url: { type: "string", format: "uri" },
            logo_url: { type: "string", format: "uri" },
            logo_urls: { type: "array", items: { type: "string", format: "uri" } },
            mode: { $ref: "#/components/schemas/Mode" },
            webhook_url: { type: "string", format: "uri", description: "(à venir) Notification de fin de job." },
            idempotency_key: { type: "string", description: "Aussi acceptable via header Idempotency-Key." },
          },
          additionalProperties: false,
        },
        GenerateResponse: {
          type: "object",
          properties: {
            success: { const: true },
            data: {
              type: "object",
              properties: {
                job_id: { type: "string" },
                status: { type: "string", enum: ["completed", "processing", "failed"] },
                image_url: { type: ["string", "null"], description: "URL PNG raster publique. Champ canonique unique." },
                status_url: { type: "string", description: "URL absolue de polling (async/timeout)." },
                mode: { type: "string" },
                quality: { type: "string", enum: ["premium"] },
                model: { type: "string", enum: ["gpt-image-2"] },
                provider: { type: "string", enum: ["openai"] },
                fallback_used: { type: "boolean", enum: [false] },
                aspect_ratio: { $ref: "#/components/schemas/AspectRatio" },
                width: { type: "integer" },
                height: { type: "integer" },
                format: { type: "string", enum: ["png"] },
                credits_used: { type: "integer" },
                template_used: {
                  type: ["object", "null"],
                  properties: {
                    id: { type: "string" },
                    image_url: { type: "string" },
                    note: { type: "string" },
                  },
                },
              },
            },
            warnings: { type: "array", items: { type: "string" } },
            request_id: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/v1/posters/generate": {
        post: {
          summary: "Générer une affiche premium",
          description:
            "Génère une affiche via GPT Image 2.\n\n" +
            "- En mode `sync` (défaut), attente jusqu'à ~110 s.\n" +
            "- En mode `async`, réponse 202 immédiate avec `status_url` absolue.\n" +
            "- Tous les champs inconnus produisent un `warnings[]` (jamais d'ignore silencieux).\n" +
            "- `aspect_ratio` omis : défaut `9:16` documenté + warning. Valeur invalide : 400.",
          parameters: [
            { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateRequest" } } },
          },
          responses: {
            "200": { description: "Sync completed", content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateResponse" } } } },
            "202": { description: "Async accepted / sync timed out", content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateResponse" } } } },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Auth error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Forbidden / missing scope" },
            "429": { description: "Rate limited (headers: Retry-After, X-RateLimit-*)" },
            "502": { description: "Generation failed / PREMIUM_MODEL_UNAVAILABLE" },
          },
        },
      },
      "/v1/posters/{job_id}": {
        get: {
          summary: "Statut canonique d'un job",
          parameters: [{ name: "job_id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Job status" }, "404": { description: "Not found" } },
        },
      },
      "/v1/domains": {
        get: { summary: "Liste des domaines valides", responses: { "200": { description: "OK" } } },
      },
      "/v1/templates": {
        get: {
          summary: "Lister les templates de référence",
          parameters: [
            { name: "domain", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", maximum: 100 } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/v1/templates/suggest": {
        post: { summary: "Suggérer un template", responses: { "200": { description: "OK" } } },
      },
      "/v1/images/analyze": {
        post: { summary: "Analyser une image", responses: { "200": { description: "OK" } } },
      },
      "/v1/account/credits": {
        get: { summary: "Crédits restants", responses: { "200": { description: "OK" } } },
      },
      "/v1/account/usage": {
        get: { summary: "Historique d'usage (30j)", responses: { "200": { description: "OK" } } },
      },
    },
  };
}

// --- entrypoint ---
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const v1Idx = url.pathname.indexOf("/v1/");
  const path = v1Idx >= 0 ? url.pathname.slice(v1Idx) : url.pathname;
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  // Absolute base URL exposed to clients (preserves the /functions/v1/api-v1 prefix).
  const baseUrl = v1Idx >= 0 ? `${url.origin}${url.pathname.slice(0, v1Idx)}` : url.origin;

  // Public: OpenAPI spec (no auth)
  if (path === "/v1/openapi.json" && req.method === "GET") {
    return jsonResponse(buildOpenApiSpec(baseUrl), 200);
  }

  if (!path.startsWith("/v1/")) {
    return successResponse({
      name: "GraphisteGPT API",
      version: "v1.1",
      docs: "https://graphistegpt.pro/docs/api",
      openapi: `${baseUrl}/v1/openapi.json`,
      endpoints: [
        "POST /v1/posters/generate",
        "GET /v1/posters/{job_id}",
        "GET /v1/templates",
        "POST /v1/templates/suggest",
        "POST /v1/images/analyze",
        "GET /v1/account/credits",
        "GET /v1/account/usage",
        "GET /v1/domains",
        "GET /v1/openapi.json",
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
    const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return jsonResponse(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many requests.", request_id: requestId } },
      429,
      {
        "X-RateLimit-Limit": "60",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rl.reset),
        "Retry-After": String(retryAfter),
      },
    );
  }

  const ip = req.headers.get("x-forwarded-for") || undefined;
  const ua = req.headers.get("user-agent") || undefined;
  const idemHeader = req.headers.get("idempotency-key") || "";

  let response: Response;
  try {
    if (path === "/v1/posters/generate" && req.method === "POST") {
      response = await routeGenerate(req, ctx, requestId, baseUrl, idemHeader);
    } else if (path.startsWith("/v1/posters/") && req.method === "GET") {
      const jobId = path.slice("/v1/posters/".length).split("/")[0];
      response = await routePosterStatus(jobId, ctx, requestId);
    } else if (path === "/v1/domains" && req.method === "GET") {
      response = await routeDomains(ctx, requestId);
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

  const duration = Date.now() - t0;
  logUsage({
    ctx, endpoint: path, method: req.method, statusCode: response.status,
    requestId, ip, ua, durationMs: duration,
  });

  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", "60");
  headers.set("X-RateLimit-Remaining", String(rl.remaining));
  headers.set("X-RateLimit-Reset", String(rl.reset));
  headers.set("X-Request-Id", requestId);
  return new Response(response.body, { status: response.status, headers });
});
