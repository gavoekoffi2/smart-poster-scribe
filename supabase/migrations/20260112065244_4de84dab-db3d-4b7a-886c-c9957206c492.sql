-- Update reference_templates RLS to allow content_manager to add templates
DROP POLICY IF EXISTS "Service role can manage templates" ON public.reference_templates;

CREATE POLICY "Content managers can add templates"
ON public.reference_templates
FOR INSERT
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']::app_role[]));

CREATE POLICY "Managers can update templates"
ON public.reference_templates
FOR UPDATE
USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']::app_role[]));

CREATE POLICY "Only admins can delete templates"
ON public.reference_templates
FOR DELETE
USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- Create role_permissions table for detailed permission tracking
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view permissions"
ON public.role_permissions
FOR SELECT
USING (true);

CREATE POLICY "Only super_admin can modify permissions"
ON public.role_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Insert default permissions for each role
INSERT INTO public.role_permissions (role, permission) VALUES
-- Super Admin - all permissions
('super_admin', 'manage_super_admins'),
('super_admin', 'manage_admins'),
('super_admin', 'manage_content_managers'),
('super_admin', 'manage_designers'),
('super_admin', 'manage_users'),
('super_admin', 'delete_any_user'),
('super_admin', 'view_dashboard'),
('super_admin', 'manage_templates'),
('super_admin', 'delete_templates'),
('super_admin', 'manage_settings'),
('super_admin', 'view_analytics'),
('super_admin', 'export_data'),

-- Admin - most permissions except super admin management
('admin', 'manage_content_managers'),
('admin', 'manage_designers'),
('admin', 'manage_users'),
('admin', 'view_dashboard'),
('admin', 'manage_templates'),
('admin', 'delete_templates'),
('admin', 'view_analytics'),
('admin', 'export_data'),

-- Content Manager - template and content management only
('content_manager', 'view_dashboard'),
('content_manager', 'manage_templates'),
('content_manager', 'view_analytics'),

-- Designer - can submit templates for review
('designer', 'submit_templates'),
('designer', 'view_own_stats')
ON CONFLICT (role, permission) DO NOTHING;