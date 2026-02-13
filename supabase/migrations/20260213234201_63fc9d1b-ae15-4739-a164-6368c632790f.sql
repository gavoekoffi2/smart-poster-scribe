
-- Fix reference_templates SELECT policy: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view reference templates" ON public.reference_templates;
CREATE POLICY "Anyone can view reference templates"
ON public.reference_templates
FOR SELECT
USING (true);

-- Fix generated_images SELECT policies: make key ones PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view generated images" ON public.generated_images;
CREATE POLICY "Anyone can view generated images"
ON public.generated_images
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow anonymous read for null user_id" ON public.generated_images;
DROP POLICY IF EXISTS "Users can view their own images" ON public.generated_images;

-- Fix marquee_items SELECT policy
DROP POLICY IF EXISTS "Anyone can view active marquee items" ON public.marquee_items;
CREATE POLICY "Anyone can view active marquee items"
ON public.marquee_items
FOR SELECT
USING (is_active = true);

-- Fix INSERT policies for generated_images to be permissive
DROP POLICY IF EXISTS "Anyone can insert generated images" ON public.generated_images;
CREATE POLICY "Anyone can insert generated images"
ON public.generated_images
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous insert for null user_id" ON public.generated_images;
DROP POLICY IF EXISTS "Users can create their own images" ON public.generated_images;

-- Fix UPDATE policies
DROP POLICY IF EXISTS "Anyone can delete generated images" ON public.generated_images;
CREATE POLICY "Anyone can delete generated images"
ON public.generated_images
FOR DELETE
USING (true);

DROP POLICY IF EXISTS "Allow anonymous update for null user_id" ON public.generated_images;
DROP POLICY IF EXISTS "Users can update their own images" ON public.generated_images;
DROP POLICY IF EXISTS "Admins can update showcase images" ON public.generated_images;

CREATE POLICY "Users can update their own images"
ON public.generated_images
FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can update all images"
ON public.generated_images
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

-- Fix other restrictive policies
DROP POLICY IF EXISTS "Users can delete their own images" ON public.generated_images;

-- Fix Admins can view all marquee items
DROP POLICY IF EXISTS "Admins can view all marquee items" ON public.marquee_items;
CREATE POLICY "Admins can view all marquee items"
ON public.marquee_items
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

-- Fix INSERT/UPDATE/DELETE on marquee_items
DROP POLICY IF EXISTS "Admins can insert marquee items" ON public.marquee_items;
CREATE POLICY "Admins can insert marquee items"
ON public.marquee_items
FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

DROP POLICY IF EXISTS "Admins can update marquee items" ON public.marquee_items;
CREATE POLICY "Admins can update marquee items"
ON public.marquee_items
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

DROP POLICY IF EXISTS "Admins can delete marquee items" ON public.marquee_items;
CREATE POLICY "Admins can delete marquee items"
ON public.marquee_items
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- Fix reference_templates other policies
DROP POLICY IF EXISTS "Content managers can add templates" ON public.reference_templates;
CREATE POLICY "Content managers can add templates"
ON public.reference_templates
FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

DROP POLICY IF EXISTS "Designers can insert their own templates" ON public.reference_templates;
CREATE POLICY "Designers can insert their own templates"
ON public.reference_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'designer'::app_role) AND designer_id IN (SELECT id FROM partner_designers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Managers can update templates" ON public.reference_templates;
CREATE POLICY "Managers can update templates"
ON public.reference_templates
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

DROP POLICY IF EXISTS "Designers can update their own templates" ON public.reference_templates;
CREATE POLICY "Designers can update their own templates"
ON public.reference_templates
FOR UPDATE
USING (designer_id IN (SELECT id FROM partner_designers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete templates" ON public.reference_templates;
CREATE POLICY "Only admins can delete templates"
ON public.reference_templates
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

DROP POLICY IF EXISTS "Designers can delete their own templates" ON public.reference_templates;
CREATE POLICY "Designers can delete their own templates"
ON public.reference_templates
FOR DELETE
USING (designer_id IN (SELECT id FROM partner_designers WHERE user_id = auth.uid()));
