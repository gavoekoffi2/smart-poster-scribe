-- Ajouter une colonne pour distinguer les créations gratuites des payantes
ALTER TABLE public.generated_images 
ADD COLUMN IF NOT EXISTS is_free_plan BOOLEAN DEFAULT true;

-- Ajouter une colonne pour marquer les images à afficher publiquement
ALTER TABLE public.generated_images 
ADD COLUMN IF NOT EXISTS is_showcase BOOLEAN DEFAULT false;

-- Créer un index pour optimiser les requêtes de la vitrine
CREATE INDEX IF NOT EXISTS idx_generated_images_showcase 
ON public.generated_images (is_showcase, is_free_plan, created_at DESC);