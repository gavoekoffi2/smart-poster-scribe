CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_url TEXT,
  task_id TEXT,
  error_message TEXT,
  error_code TEXT,
  params JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_jobs_user_id ON public.image_jobs(user_id);
CREATE INDEX idx_image_jobs_status ON public.image_jobs(status);

ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own image jobs"
ON public.image_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image jobs"
ON public.image_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_image_jobs_updated_at
BEFORE UPDATE ON public.image_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();