-- Ajouter les colonnes pour tracker téléchargement et note pour le showcase
ALTER TABLE public.generated_images 
ADD COLUMN IF NOT EXISTS is_downloaded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS user_rating integer DEFAULT NULL;

-- Mettre à jour la politique showcase: seulement les images téléchargées avec bonne note (4 ou 5)
-- Les anciennes images du showcase restent visibles
COMMENT ON COLUMN public.generated_images.is_downloaded IS 'True si l''utilisateur a téléchargé l''image';
COMMENT ON COLUMN public.generated_images.user_rating IS 'Note de l''utilisateur (1-5)';