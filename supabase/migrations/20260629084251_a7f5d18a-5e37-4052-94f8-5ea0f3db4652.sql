
-- 1. Fix mutable search_path on 4 functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 2. Restrict platform_settings reads to admins
DROP POLICY IF EXISTS "Public can read settings" ON public.platform_settings;
CREATE POLICY "Admins can read settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- 3. Allow anonymous visitors to read showcase images
CREATE POLICY "Anyone can view showcase images"
ON public.generated_images
FOR SELECT
TO anon, authenticated
USING (is_showcase = true);

GRANT SELECT ON public.generated_images TO anon;
