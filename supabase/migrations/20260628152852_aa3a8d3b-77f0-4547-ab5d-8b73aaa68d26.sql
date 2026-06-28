
-- ============================================================
-- 1. platform_settings : clé/valeur pour paramètres globaux
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert settings"
  ON public.platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE POLICY "Admins can update settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- Seeds
INSERT INTO public.platform_settings (key, value)
VALUES
  ('designer_royalty_rate', '0.20'::jsonb),
  ('generation_unit_value_usd', '0.20'::jsonb),
  ('designer_payout_threshold_fcfa', '10000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. template_earnings : traçabilité (job + taux + valeur unitaire)
-- ============================================================
ALTER TABLE public.template_earnings
  ADD COLUMN IF NOT EXISTS job_id uuid,
  ADD COLUMN IF NOT EXISTS designer_id uuid REFERENCES public.partner_designers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS royalty_rate numeric,
  ADD COLUMN IF NOT EXISTS unit_value_usd numeric;

-- Idempotence par job
CREATE UNIQUE INDEX IF NOT EXISTS template_earnings_job_id_uniq
  ON public.template_earnings(job_id)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS template_earnings_designer_idx
  ON public.template_earnings(designer_id);

-- Sécuriser les lectures par le designer concerné
ALTER TABLE public.template_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Designers can view their earnings" ON public.template_earnings;
CREATE POLICY "Designers can view their earnings"
  ON public.template_earnings FOR SELECT
  TO authenticated
  USING (
    designer_id IN (
      SELECT id FROM public.partner_designers WHERE user_id = auth.uid()
    )
    OR public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role])
  );

GRANT SELECT ON public.template_earnings TO authenticated;
GRANT ALL ON public.template_earnings TO service_role;

-- ============================================================
-- 3. image_jobs : lier au template utilisé
-- ============================================================
ALTER TABLE public.image_jobs
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.reference_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS image_jobs_template_idx ON public.image_jobs(template_id);

-- ============================================================
-- 4. designer_payout_requests : demandes de retrait
-- ============================================================
CREATE TABLE IF NOT EXISTS public.designer_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id uuid NOT NULL REFERENCES public.partner_designers(id) ON DELETE CASCADE,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  amount_fcfa integer NOT NULL CHECK (amount_fcfa > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  payment_method text NOT NULL,
  payment_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid
);

GRANT SELECT, INSERT ON public.designer_payout_requests TO authenticated;
GRANT ALL ON public.designer_payout_requests TO service_role;

ALTER TABLE public.designer_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designers can view own payouts"
  ON public.designer_payout_requests FOR SELECT
  TO authenticated
  USING (
    designer_id IN (SELECT id FROM public.partner_designers WHERE user_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role])
  );

CREATE POLICY "Designers can request payouts"
  ON public.designer_payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    designer_id IN (SELECT id FROM public.partner_designers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update payouts"
  ON public.designer_payout_requests FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

CREATE INDEX IF NOT EXISTS designer_payout_requests_designer_idx ON public.designer_payout_requests(designer_id);
CREATE INDEX IF NOT EXISTS designer_payout_requests_status_idx ON public.designer_payout_requests(status);

-- ============================================================
-- 5. Fonction de crédit de royalty + trigger sur image_jobs
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_designer_royalty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.reference_templates;
  v_rate numeric;
  v_unit_value numeric;
  v_royalty_usd numeric;
BEGIN
  -- Trigger only on transition to completed
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.template_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_template FROM public.reference_templates WHERE id = NEW.template_id;
  IF v_template.id IS NULL OR v_template.designer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read settings (default to 0.20 each)
  SELECT COALESCE((value)::text::numeric, 0.20) INTO v_rate
    FROM public.platform_settings WHERE key = 'designer_royalty_rate';
  IF v_rate IS NULL THEN v_rate := 0.20; END IF;

  SELECT COALESCE((value)::text::numeric, 0.20) INTO v_unit_value
    FROM public.platform_settings WHERE key = 'generation_unit_value_usd';
  IF v_unit_value IS NULL THEN v_unit_value := 0.20; END IF;

  v_royalty_usd := round((v_unit_value * v_rate)::numeric, 4);

  -- Insert earning (idempotent on job_id)
  INSERT INTO public.template_earnings
    (template_id, designer_id, amount, job_id, royalty_rate, unit_value_usd, description)
  VALUES
    (v_template.id, v_template.designer_id, v_royalty_usd, NEW.id, v_rate, v_unit_value,
     'Royalty génération job ' || NEW.id::text)
  ON CONFLICT (job_id) DO NOTHING;

  -- Update aggregates
  UPDATE public.reference_templates
     SET earnings = COALESCE(earnings, 0) + v_royalty_usd,
         usage_count = COALESCE(usage_count, 0) + 1
   WHERE id = v_template.id;

  UPDATE public.partner_designers
     SET total_earnings = COALESCE(total_earnings, 0) + v_royalty_usd,
         updated_at = now()
   WHERE id = v_template.designer_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_designer_royalty ON public.image_jobs;
CREATE TRIGGER trg_record_designer_royalty
  AFTER INSERT OR UPDATE OF status ON public.image_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.record_designer_royalty();

-- ============================================================
-- 6. RPC : solde disponible et création de demande de retrait
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_designer_balance(p_designer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_total numeric;
  v_locked numeric;
  v_paid numeric;
BEGIN
  SELECT user_id INTO v_owner FROM public.partner_designers WHERE id = p_designer_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Designer not found';
  END IF;

  IF v_owner <> auth.uid() AND NOT public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.template_earnings WHERE designer_id = p_designer_id;

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_locked
    FROM public.designer_payout_requests
   WHERE designer_id = p_designer_id AND status IN ('pending', 'approved');

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_paid
    FROM public.designer_payout_requests
   WHERE designer_id = p_designer_id AND status = 'paid';

  RETURN jsonb_build_object(
    'total_earned_usd', v_total,
    'paid_usd', v_paid,
    'locked_usd', v_locked,
    'available_usd', GREATEST(v_total - v_paid - v_locked, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_designer_balance(uuid) TO authenticated;
