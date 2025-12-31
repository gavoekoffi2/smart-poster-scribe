-- Create reference_templates table for storing design templates
CREATE TABLE public.reference_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  design_category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reference_templates ENABLE ROW LEVEL SECURITY;

-- Allow public read access (templates are public resources)
CREATE POLICY "Anyone can view reference templates"
ON public.reference_templates
FOR SELECT
USING (true);

-- Only allow insert/update/delete through service role (admin only)
CREATE POLICY "Service role can manage templates"
ON public.reference_templates
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster domain lookups
CREATE INDEX idx_reference_templates_domain ON public.reference_templates(domain);
CREATE INDEX idx_reference_templates_design_category ON public.reference_templates(design_category);

-- Create storage bucket for reference templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-templates', 'reference-templates', true);

-- Allow public read access to reference templates bucket
CREATE POLICY "Public read access for reference templates"
ON storage.objects
FOR SELECT
USING (bucket_id = 'reference-templates');