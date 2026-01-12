
-- Create design_categories table for dynamic categories
CREATE TABLE public.design_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.design_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories"
ON public.design_categories
FOR SELECT
USING (true);

-- Designers and above can create categories
CREATE POLICY "Designers can create categories"
ON public.design_categories
FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role, 'designer'::app_role]));

-- Add designer-related columns to reference_templates
ALTER TABLE public.reference_templates
ADD COLUMN designer_id uuid REFERENCES public.partner_designers(id),
ADD COLUMN is_active boolean DEFAULT true,
ADD COLUMN earnings numeric DEFAULT 0,
ADD COLUMN usage_count integer DEFAULT 0;

-- Update reference_templates policies to allow designers to manage their own templates
CREATE POLICY "Designers can insert their own templates"
ON public.reference_templates
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'designer'::app_role) AND 
  designer_id IN (SELECT id FROM public.partner_designers WHERE user_id = auth.uid())
);

CREATE POLICY "Designers can update their own templates"
ON public.reference_templates
FOR UPDATE
USING (
  designer_id IN (SELECT id FROM public.partner_designers WHERE user_id = auth.uid())
);

CREATE POLICY "Designers can delete their own templates"
ON public.reference_templates
FOR DELETE
USING (
  designer_id IN (SELECT id FROM public.partner_designers WHERE user_id = auth.uid())
);

-- Create template_earnings table to track individual earnings
CREATE TABLE public.template_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES public.reference_templates(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_earnings ENABLE ROW LEVEL SECURITY;

-- Designers can view their own template earnings
CREATE POLICY "Designers can view their template earnings"
ON public.template_earnings
FOR SELECT
USING (
  template_id IN (
    SELECT rt.id FROM public.reference_templates rt
    JOIN public.partner_designers pd ON rt.designer_id = pd.id
    WHERE pd.user_id = auth.uid()
  )
);

-- Admins can manage all earnings
CREATE POLICY "Admins can manage earnings"
ON public.template_earnings
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- Seed initial categories from existing design_category values
INSERT INTO public.design_categories (name, slug, description)
SELECT DISTINCT 
  INITCAP(REPLACE(design_category, '-', ' ')),
  LOWER(REPLACE(design_category, ' ', '-')),
  'Catégorie ' || INITCAP(REPLACE(design_category, '-', ' '))
FROM public.reference_templates
WHERE design_category IS NOT NULL
ON CONFLICT (slug) DO NOTHING;
