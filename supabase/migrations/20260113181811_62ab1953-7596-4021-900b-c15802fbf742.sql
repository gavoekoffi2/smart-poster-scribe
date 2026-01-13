-- Ajouter les colonnes de préférences utilisateur à la table profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_logo_url text,
ADD COLUMN IF NOT EXISTS default_color_palette text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS website text;