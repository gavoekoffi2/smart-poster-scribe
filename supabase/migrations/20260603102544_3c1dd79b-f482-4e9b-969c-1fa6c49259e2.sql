
-- Désactiver les anciens plans pro et business
UPDATE public.subscription_plans 
SET is_active = false, is_popular = false 
WHERE slug IN ('pro', 'business');

-- Insérer le plan Essentiel (5000 FCFA, 40 crédits = 20 affiches)
INSERT INTO public.subscription_plans (
  slug, name, description, price_fcfa, price_usd,
  credits_per_month, max_resolution, features, is_popular, is_active, sort_order
) VALUES (
  'essentiel',
  'Essentiel',
  '20 affiches professionnelles par mois',
  5000, 8.00, 40, '2K',
  '["20 affiches par mois", "Modifications illimitées (gratuites)", "Choix du modèle : Rapide (NanoBanana Pro) ou Pro (GPT Image 2)", "Tous les domaines & templates", "Sans filigrane", "Résolution jusqu''à 2K"]'::jsonb,
  false, true, 2
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price_fcfa = EXCLUDED.price_fcfa, price_usd = EXCLUDED.price_usd,
  credits_per_month = EXCLUDED.credits_per_month,
  features = EXCLUDED.features, is_popular = EXCLUDED.is_popular,
  is_active = true, sort_order = EXCLUDED.sort_order;

-- Insérer le plan Illimité (25000 FCFA, crédits sentinelle 9999)
INSERT INTO public.subscription_plans (
  slug, name, description, price_fcfa, price_usd,
  credits_per_month, max_resolution, features, is_popular, is_active, sort_order
) VALUES (
  'illimite',
  'Illimité',
  'Générations illimitées avec qualité premium',
  25000, 42.00, 9999, '4K',
  '["Générations illimitées", "Modifications illimitées (gratuites)", "Choix libre Rapide / Pro à chaque création", "Modèle Pro (GPT Image 2) — qualité maximale", "Templates premium exclusifs", "Support prioritaire", "Sans filigrane", "Résolution jusqu''à 4K"]'::jsonb,
  true, true, 3
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price_fcfa = EXCLUDED.price_fcfa, price_usd = EXCLUDED.price_usd,
  credits_per_month = EXCLUDED.credits_per_month,
  features = EXCLUDED.features, is_popular = EXCLUDED.is_popular,
  is_active = true, sort_order = EXCLUDED.sort_order;
