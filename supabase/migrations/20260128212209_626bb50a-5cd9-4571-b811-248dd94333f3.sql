-- Create table for managing marquee items (thumbnails and posters)
CREATE TABLE public.marquee_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  domain text NOT NULL DEFAULT 'event',
  item_type text NOT NULL CHECK (item_type IN ('youtube', 'poster')),
  row_number integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marquee_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active marquee items
CREATE POLICY "Anyone can view active marquee items"
ON public.marquee_items FOR SELECT
USING (is_active = true);

-- Admins can view all marquee items
CREATE POLICY "Admins can view all marquee items"
ON public.marquee_items FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

-- Admins can manage marquee items
CREATE POLICY "Admins can insert marquee items"
ON public.marquee_items FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

CREATE POLICY "Admins can update marquee items"
ON public.marquee_items FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

CREATE POLICY "Admins can delete marquee items"
ON public.marquee_items FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- Create index for performance
CREATE INDEX idx_marquee_items_type_active ON public.marquee_items(item_type, is_active, row_number, sort_order);