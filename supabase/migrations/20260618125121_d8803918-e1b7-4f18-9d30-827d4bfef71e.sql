ALTER TABLE public.image_jobs
  ADD COLUMN IF NOT EXISTS model_used text,
  ADD COLUMN IF NOT EXISTS provider_used text,
  ADD COLUMN IF NOT EXISTS fallback_used boolean NOT NULL DEFAULT false;