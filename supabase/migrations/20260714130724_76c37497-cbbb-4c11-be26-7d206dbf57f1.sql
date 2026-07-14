
-- Promo codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  applicable_plans TEXT[] DEFAULT NULL,
  once_per_user BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE POLICY "Authenticated can read active codes for validation" ON public.promo_codes FOR SELECT TO authenticated
  USING (is_active = true);

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Redemptions table
CREATE TABLE public.promo_code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_slug TEXT,
  original_amount NUMERIC,
  discount_amount NUMERIC,
  final_amount NUMERIC,
  currency TEXT,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.promo_code_redemptions TO authenticated;
GRANT ALL ON public.promo_code_redemptions TO service_role;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own redemptions" ON public.promo_code_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE POLICY "Admins manage all redemptions" ON public.promo_code_redemptions FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE INDEX idx_promo_redemptions_user ON public.promo_code_redemptions(user_id);
CREATE INDEX idx_promo_redemptions_code ON public.promo_code_redemptions(promo_code_id);

-- Validation function
CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code TEXT, p_plan_slug TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.promo_codes;
  v_user_id UUID := auth.uid();
  v_already_used INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'NOT_AUTHENTICATED', 'message', 'Vous devez être connecté');
  END IF;

  SELECT * INTO v_code FROM public.promo_codes WHERE upper(code) = upper(p_code) LIMIT 1;

  IF v_code.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'NOT_FOUND', 'message', 'Code promo invalide');
  END IF;

  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'INACTIVE', 'message', 'Ce code promo est désactivé');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'EXPIRED', 'message', 'Ce code promo est expiré');
  END IF;

  IF v_code.max_uses IS NOT NULL AND v_code.uses_count >= v_code.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'LIMIT_REACHED', 'message', 'Ce code promo a atteint sa limite d''utilisation');
  END IF;

  IF v_code.applicable_plans IS NOT NULL AND array_length(v_code.applicable_plans, 1) > 0
     AND p_plan_slug IS NOT NULL AND NOT (p_plan_slug = ANY(v_code.applicable_plans)) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'PLAN_NOT_ELIGIBLE', 'message', 'Ce code n''est pas applicable à ce plan');
  END IF;

  IF v_code.once_per_user THEN
    SELECT COUNT(*) INTO v_already_used FROM public.promo_code_redemptions
      WHERE promo_code_id = v_code.id AND user_id = v_user_id;
    IF v_already_used > 0 THEN
      RETURN jsonb_build_object('valid', false, 'error', 'ALREADY_USED', 'message', 'Vous avez déjà utilisé ce code');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code_id', v_code.id,
    'code', v_code.code,
    'discount_percent', v_code.discount_percent,
    'description', v_code.description
  );
END;
$$;

-- Redemption function
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code TEXT,
  p_plan_slug TEXT,
  p_original_amount NUMERIC,
  p_currency TEXT DEFAULT 'FCFA',
  p_payment_transaction_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation JSONB;
  v_code_id UUID;
  v_discount_percent INTEGER;
  v_discount NUMERIC;
  v_final NUMERIC;
  v_user_id UUID := auth.uid();
BEGIN
  v_validation := public.validate_promo_code(p_code, p_plan_slug);
  IF (v_validation->>'valid')::boolean IS NOT TRUE THEN
    RETURN v_validation;
  END IF;

  v_code_id := (v_validation->>'code_id')::uuid;
  v_discount_percent := (v_validation->>'discount_percent')::int;
  v_discount := round((p_original_amount * v_discount_percent / 100.0)::numeric, 2);
  v_final := GREATEST(p_original_amount - v_discount, 0);

  INSERT INTO public.promo_code_redemptions
    (promo_code_id, user_id, plan_slug, original_amount, discount_amount, final_amount, currency, payment_transaction_id)
  VALUES
    (v_code_id, v_user_id, p_plan_slug, p_original_amount, v_discount, v_final, p_currency, p_payment_transaction_id);

  UPDATE public.promo_codes SET uses_count = uses_count + 1, updated_at = now() WHERE id = v_code_id;

  RETURN jsonb_build_object(
    'success', true,
    'discount_percent', v_discount_percent,
    'discount_amount', v_discount,
    'final_amount', v_final,
    'original_amount', p_original_amount
  );
END;
$$;

-- Admin listing function
CREATE OR REPLACE FUNCTION public.admin_list_promo_redemptions(p_admin_id UUID)
RETURNS TABLE(
  id UUID, promo_code_id UUID, code TEXT, user_id UUID, user_name TEXT, user_email TEXT,
  plan_slug TEXT, original_amount NUMERIC, discount_amount NUMERIC, final_amount NUMERIC,
  currency TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_any_role(p_admin_id, ARRAY['super_admin'::app_role, 'admin'::app_role]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT r.id, r.promo_code_id, pc.code, r.user_id, p.full_name, p.email,
         r.plan_slug, r.original_amount, r.discount_amount, r.final_amount, r.currency, r.created_at
  FROM public.promo_code_redemptions r
  LEFT JOIN public.promo_codes pc ON pc.id = r.promo_code_id
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  ORDER BY r.created_at DESC;
END;
$$;
