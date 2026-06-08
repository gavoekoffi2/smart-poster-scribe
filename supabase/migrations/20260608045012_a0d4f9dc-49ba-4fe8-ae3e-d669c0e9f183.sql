
-- 1) api_keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  environment text NOT NULL DEFAULT 'live' CHECK (environment IN ('live','test')),
  scopes text[] NOT NULL DEFAULT ARRAY['posters:generate','posters:read','templates:read','images:analyze','account:read']::text[],
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own api keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own api keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages api keys" ON public.api_keys
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE TRIGGER trg_api_keys_updated
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) api_usage_logs
CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  status_code integer NOT NULL,
  credits_used integer NOT NULL DEFAULT 0,
  mode text,
  template_used_id uuid,
  request_id text,
  ip text,
  user_agent text,
  duration_ms integer,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_logs_user_created ON public.api_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_api_logs_key_created ON public.api_usage_logs(api_key_id, created_at DESC);

GRANT SELECT ON public.api_usage_logs TO authenticated;
GRANT ALL ON public.api_usage_logs TO service_role;

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api logs" ON public.api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages api logs" ON public.api_usage_logs
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- 3) validate_api_key
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash text)
RETURNS TABLE (api_key_id uuid, user_id uuid, scopes text[], environment text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, scopes, environment
  FROM public.api_keys
  WHERE key_hash = p_key_hash
    AND is_active = true
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

-- 4) match_reference_template — picks the best template by domain + subject keywords
CREATE OR REPLACE FUNCTION public.match_reference_template(p_domain text, p_subject text)
RETURNS TABLE (id uuid, image_url text, design_category text, domain text, score numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens text[];
BEGIN
  -- Normalize subject to lowercase tokens (length >= 3)
  v_tokens := ARRAY(
    SELECT DISTINCT lower(t)
    FROM unnest(string_to_array(regexp_replace(coalesce(p_subject,''), '[^a-zA-Z0-9À-ÿ\s]', ' ', 'g'), ' ')) AS t
    WHERE length(t) >= 3
  );

  RETURN QUERY
  SELECT
    rt.id,
    rt.image_url,
    rt.design_category,
    rt.domain,
    (
      -- tag overlap (strong)
      COALESCE((SELECT count(*) FROM unnest(rt.tags) tg WHERE lower(tg) = ANY(v_tokens)), 0) * 3.0
      -- description keyword hits
      + COALESCE((SELECT count(*) FROM unnest(v_tokens) tk WHERE position(tk in lower(coalesce(rt.description,''))) > 0), 0) * 1.0
      -- popularity bonus (capped)
      + LEAST(COALESCE(rt.usage_count,0), 50) * 0.05
      -- exact domain match bonus
      + CASE WHEN lower(rt.domain) = lower(coalesce(p_domain,'')) THEN 5.0 ELSE 0 END
    )::numeric AS score
  FROM public.reference_templates rt
  WHERE rt.is_active = true
    AND (p_domain IS NULL OR lower(rt.domain) = lower(p_domain))
  ORDER BY score DESC, rt.usage_count DESC NULLS LAST
  LIMIT 5;
END;
$$;
