-- Add sort_order column to generated_images for showcase ordering
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS showcase_order INTEGER DEFAULT 0;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_generated_images_showcase_order ON public.generated_images(showcase_order) WHERE is_showcase = true;