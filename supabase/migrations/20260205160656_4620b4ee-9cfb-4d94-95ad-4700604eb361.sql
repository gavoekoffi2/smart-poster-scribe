-- Allow admins to view all profiles for dashboard stats
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- Allow admins to update showcase_order
CREATE POLICY "Admins can update showcase images"
ON public.generated_images FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));