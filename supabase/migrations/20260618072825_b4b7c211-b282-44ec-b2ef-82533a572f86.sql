
-- 1) Lock down partner_designers public exposure (hide total_earnings)
DROP POLICY IF EXISTS "Anyone can view verified designers" ON public.partner_designers;

CREATE POLICY "Admins can view all designers"
ON public.partner_designers
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE OR REPLACE VIEW public.partner_designers_public
WITH (security_invoker = false) AS
SELECT id, user_id, display_name, portfolio_url, bio, templates_count, is_verified, created_at, updated_at
FROM public.partner_designers
WHERE is_verified = true;

GRANT SELECT ON public.partner_designers_public TO anon, authenticated;

-- 2) Lock down reference_templates public exposure (hide earnings)
DROP POLICY IF EXISTS "Anyone can view reference templates" ON public.reference_templates;

CREATE POLICY "Designers can view their own templates"
ON public.reference_templates
FOR SELECT
TO authenticated
USING (designer_id IN (
  SELECT id FROM public.partner_designers WHERE user_id = auth.uid()
));

CREATE POLICY "Admins and managers can view all templates"
ON public.reference_templates
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role]));

CREATE OR REPLACE VIEW public.reference_templates_public
WITH (security_invoker = false) AS
SELECT id, domain, design_category, image_url, description, tags, designer_id, is_active, usage_count, created_at
FROM public.reference_templates
WHERE is_active = true;

GRANT SELECT ON public.reference_templates_public TO anon, authenticated;

-- 3) Revoke EXECUTE on role-check SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role_level(uuid) FROM PUBLIC, anon;
