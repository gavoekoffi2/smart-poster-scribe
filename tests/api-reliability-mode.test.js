import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const api = readFileSync(join(__dirname, '..', 'supabase/functions/api-v1/index.ts'), 'utf8');
const generator = readFileSync(join(__dirname, '..', 'supabase/functions/generate-image/index.ts'), 'utf8');
const refundMigration = readFileSync(join(__dirname, '..', 'supabase/migrations/20260720014500_refund_stale_image_jobs.sql'), 'utf8');

test('API emits a canonical HTTPS polling URL including the Edge Function prefix', () => {
  assert.ok(api.includes('const PUBLIC_API_BASE = `${SUPABASE_URL.replace(/\\/$/, "")}/functions/v1/api-v1`;'));
  assert.match(api, /const baseUrl = PUBLIC_API_BASE/);
  assert.doesNotMatch(api, /const baseUrl = v1Idx >= 0/);
});

test('API accepts an explicit reliability mode without weakening strict mode by default', () => {
  assert.match(api, /"reliability_mode"/);
  assert.match(api, /const reliabilityMode = body\.reliability_mode === true/);
  assert.match(api, /apiStrictPremium: !reliabilityMode/);
  assert.match(api, /apiReliabilityMode: reliabilityMode/);
});

test('provider calls are bounded so EdgeRuntime jobs cannot remain processing forever', () => {
  assert.match(generator, /async function fetchWithTimeout/);
  assert.match(generator, /controller\.abort\(\)/);
  assert.match(generator, /OPENROUTER_PREMIUM_TIMEOUT_MS\s*=\s*55_000/);
  assert.match(generator, /GOOGLE_FALLBACK_TIMEOUT_MS\s*=\s*35_000/);
  assert.match(generator, /LOVABLE_FALLBACK_TIMEOUT_MS\s*=\s*25_000/);
});

test('reliability mode is premium-first then uses bounded real-image fallbacks', () => {
  assert.match(generator, /if \(apiReliabilityMode\)/);
  assert.match(generator, /generateWithOpenRouter\([\s\S]*?"premium"[\s\S]*?OPENROUTER_PREMIUM_TIMEOUT_MS/);
  assert.match(generator, /generateWithGoogleGemini[\s\S]*?GOOGLE_FALLBACK_TIMEOUT_MS/);
  assert.match(generator, /generateWithLovableFallback[\s\S]*?LOVABLE_FALLBACK_TIMEOUT_MS/);
  assert.match(generator, /fallbackUsed = apiStrictPremium \? false : !tid\.startsWith\("openrouter-"\)/);
});

test('stale processing jobs become terminal instead of polling forever', () => {
  assert.match(api, /STALE_JOB_TIMEOUT_MS\s*=\s*10 \* 60_000/);
  assert.match(api, /code[^\n]*JOB_TIMEOUT|"JOB_TIMEOUT"/);
  assert.match(api, /fail_stale_image_job/);
  assert.match(api, /normStatus = "failed"/);
});

test('job failure and credit refund are atomic and idempotent', () => {
  assert.match(generator, /fail_image_job_and_refund/);
  assert.doesNotMatch(generator, /Remboursement auto: génération échouée/);
  assert.match(refundMigration, /CREATE OR REPLACE FUNCTION public\.fail_image_job_and_refund/);
  assert.match(refundMigration, /FOR UPDATE/);
  assert.match(refundMigration, /refund_processed/);
  assert.match(refundMigration, /GRANT EXECUTE[\s\S]*service_role/);
});
