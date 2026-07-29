
UPDATE public.subscription_plans SET price_fcfa = 4900 WHERE slug = 'essentiel';

INSERT INTO public.promo_codes (code, description, discount_percent, is_active, applicable_plans, once_per_user)
VALUES ('BOOST20', 'Offre flash -20% sur votre abonnement', 20, true, ARRAY['essentiel','illimite'], true)
ON CONFLICT (code) DO UPDATE SET
  discount_percent = EXCLUDED.discount_percent,
  is_active = true,
  applicable_plans = EXCLUDED.applicable_plans,
  once_per_user = EXCLUDED.once_per_user,
  updated_at = now();
