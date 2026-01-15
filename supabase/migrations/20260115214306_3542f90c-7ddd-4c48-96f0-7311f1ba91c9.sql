-- Mettre à jour le nom du plan Enterprise en français
UPDATE subscription_plans 
SET name = 'Entreprise', description = 'Solutions sur mesure pour grandes entreprises'
WHERE slug = 'enterprise';