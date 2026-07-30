CREATE TABLE public.generation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  is_anonymous boolean NOT NULL DEFAULT false,
  prompt text,
  domain text,
  aspect_ratio text,
  resolution text,
  is_modification boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'received',
  job_id uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_generation_requests_created_at ON public.generation_requests(created_at DESC);
CREATE INDEX idx_generation_requests_user_id ON public.generation_requests(user_id);

GRANT ALL ON public.generation_requests TO service_role;

ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view generation requests"
ON public.generation_requests FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'admin'::app_role]));

CREATE TRIGGER update_generation_requests_updated_at
BEFORE UPDATE ON public.generation_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.generation_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_generation_requests(p_admin_id uuid, p_limit integer DEFAULT 200)
RETURNS TABLE(
  id uuid, user_id uuid, is_anonymous boolean, prompt text, domain text,
  aspect_ratio text, resolution text, is_modification boolean, status text,
  job_id uuid, error_message text, created_at timestamptz,
  user_name text, user_email text, job_status text, result_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_any_role(p_admin_id, ARRAY['super_admin'::app_role,'admin'::app_role]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT gr.id, gr.user_id, gr.is_anonymous, gr.prompt, gr.domain,
         gr.aspect_ratio, gr.resolution, gr.is_modification, gr.status,
         gr.job_id, gr.error_message, gr.created_at,
         p.full_name, p.email, j.status, j.result_url
  FROM public.generation_requests gr
  LEFT JOIN public.profiles p ON p.user_id = gr.user_id
  LEFT JOIN public.image_jobs j ON j.id = gr.job_id
  ORDER BY gr.created_at DESC
  LIMIT COALESCE(p_limit, 200);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_generation_requests(uuid, integer) FROM anon;