-- First drop dependent objects
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.has_any_role CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role_level CASCADE;
DROP FUNCTION IF EXISTS public.can_manage_role CASCADE;

-- Drop the user_roles table
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop old enum 
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Create new comprehensive role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'content_manager', 'designer', 'user');

-- Create user_roles table with new enum
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Function to get user's highest role level (for hierarchy)
CREATE OR REPLACE FUNCTION public.get_user_role_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE role
        WHEN 'super_admin' THEN 100
        WHEN 'admin' THEN 80
        WHEN 'content_manager' THEN 60
        WHEN 'designer' THEN 40
        WHEN 'user' THEN 20
      END
    FROM public.user_roles
    WHERE user_id = _user_id
    ORDER BY 
      CASE role
        WHEN 'super_admin' THEN 100
        WHEN 'admin' THEN 80
        WHEN 'content_manager' THEN 60
        WHEN 'designer' THEN 40
        WHEN 'user' THEN 20
      END DESC
    LIMIT 1),
    0
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and above can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

CREATE POLICY "Super admin can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin can insert lower roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  AND role NOT IN ('super_admin', 'admin')
);

CREATE POLICY "Admin can delete lower roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') 
  AND role NOT IN ('super_admin', 'admin')
);