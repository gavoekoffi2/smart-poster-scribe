-- Create table for generated images history
CREATE TABLE public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL,
  resolution TEXT NOT NULL,
  domain TEXT,
  reference_image_url TEXT,
  content_image_url TEXT,
  logo_urls TEXT[],
  logo_positions TEXT[],
  color_palette TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (no auth required for this app)
CREATE POLICY "Anyone can view generated images" 
ON public.generated_images 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert generated images" 
ON public.generated_images 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete generated images" 
ON public.generated_images 
FOR DELETE 
USING (true);