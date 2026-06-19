CREATE TABLE public.api_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  response_body jsonb NOT NULL,
  status_code int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (api_key_id, idempotency_key)
);

GRANT ALL ON public.api_idempotency_keys TO service_role;

ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_api_idempotency_expires ON public.api_idempotency_keys(expires_at);