
-- 1. PRICING OFFERS
CREATE TABLE public.pricing_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  discount_pct integer NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 80),
  reason text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pricing_offers_user_active ON public.pricing_offers(user_id, expires_at) WHERE used_at IS NULL;
GRANT SELECT ON public.pricing_offers TO authenticated;
GRANT ALL ON public.pricing_offers TO service_role;
ALTER TABLE public.pricing_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own offers" ON public.pricing_offers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service manages offers" ON public.pricing_offers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. AFFILIATE PAYOUT REQUESTS
CREATE TABLE public.affiliate_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  amount_fcfa integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  payment_method text NOT NULL,
  payment_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid
);
CREATE INDEX idx_aff_payout_status ON public.affiliate_payout_requests(status, requested_at DESC);
GRANT SELECT, INSERT ON public.affiliate_payout_requests TO authenticated;
GRANT ALL ON public.affiliate_payout_requests TO service_role;
ALTER TABLE public.affiliate_payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate reads own payouts" ON public.affiliate_payout_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "affiliate inserts own payouts" ON public.affiliate_payout_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "admins read all payouts" ON public.affiliate_payout_requests FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'admin'::app_role]));
CREATE POLICY "admins update payouts" ON public.affiliate_payout_requests FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'admin'::app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'admin'::app_role]));

CREATE OR REPLACE FUNCTION public.get_affiliate_balance(p_affiliate_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_total numeric; v_locked numeric; v_paid numeric;
BEGIN
  SELECT user_id, total_earnings INTO v_owner, v_total FROM public.affiliates WHERE id = p_affiliate_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Affiliate not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role,'admin'::app_role]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT COALESCE(SUM(amount_usd),0) INTO v_locked FROM public.affiliate_payout_requests
    WHERE affiliate_id = p_affiliate_id AND status IN ('pending','approved');
  SELECT COALESCE(SUM(amount_usd),0) INTO v_paid FROM public.affiliate_payout_requests
    WHERE affiliate_id = p_affiliate_id AND status = 'paid';
  RETURN jsonb_build_object('total_earned_usd', COALESCE(v_total,0), 'paid_usd', v_paid, 'locked_usd', v_locked,
    'available_usd', GREATEST(COALESCE(v_total,0) - v_paid - v_locked, 0));
END; $$;

-- 3. NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_recent ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "service inserts notifications" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_body text DEFAULT NULL, p_link text DEFAULT NULL, p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link, payload)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_payload) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_job_completed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status <> 'completed') AND NEW.user_id IS NOT NULL THEN
    PERFORM public.create_notification(NEW.user_id, 'generation_completed', 'Votre affiche est prête !',
      'Votre génération est terminée. Cliquez pour la voir.', '/app', jsonb_build_object('job_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_job_completed ON public.image_jobs;
CREATE TRIGGER trg_notify_job_completed AFTER UPDATE OF status ON public.image_jobs
  FOR EACH ROW EXECUTE FUNCTION public.notify_job_completed();

CREATE OR REPLACE FUNCTION public.notify_affiliate_commission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.affiliates WHERE id = NEW.affiliate_id;
  IF v_owner IS NOT NULL THEN
    PERFORM public.create_notification(v_owner, 'commission_received', 'Nouvelle commission !',
      'Vous avez gagné ' || round(NEW.amount::numeric, 2)::text || ' $ grâce à votre parrainage.', '/account',
      jsonb_build_object('amount', NEW.amount));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_commission ON public.referral_commissions;
CREATE TRIGGER trg_notify_commission AFTER INSERT ON public.referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_affiliate_commission();

-- 4. TEAMS (create both tables first, then add policies)
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id),
  credits_pool integer NOT NULL DEFAULT 0,
  max_members integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  invited_email text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages team" ON public.teams FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "members read their team" ON public.teams FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = id AND tm.user_id = auth.uid()));
CREATE POLICY "members read teammates" ON public.team_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()));
CREATE POLICY "owner manages members" ON public.team_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owner_id = auth.uid()));

-- 5. SERVICE HEALTH
CREATE TABLE public.service_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','degraded','down','maintenance')),
  message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_health TO anon, authenticated;
GRANT ALL ON public.service_health TO service_role;
ALTER TABLE public.service_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads health" ON public.service_health FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "service writes health" ON public.service_health FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.service_health(service, status) VALUES
  ('Génération d''images', 'operational'),
  ('Paiements', 'operational'),
  ('API publique', 'operational'),
  ('Authentification', 'operational')
ON CONFLICT (service) DO NOTHING;

-- 6. ADMIN HELPERS
CREATE OR REPLACE FUNCTION public.admin_list_designer_payouts(p_admin_id uuid)
RETURNS TABLE(id uuid, designer_id uuid, designer_name text, amount_usd numeric, amount_fcfa integer,
  status text, payment_method text, payment_details jsonb, admin_note text,
  requested_at timestamptz, processed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_any_role(p_admin_id, ARRAY['super_admin'::app_role,'admin'::app_role]) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT pr.id, pr.designer_id, pd.full_name, pr.amount_usd, pr.amount_fcfa,
         pr.status, pr.payment_method, pr.payment_details, pr.admin_note,
         pr.requested_at, pr.processed_at
  FROM public.designer_payout_requests pr
  LEFT JOIN public.partner_designers pd ON pd.id = pr.designer_id
  ORDER BY pr.requested_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_affiliate_payouts(p_admin_id uuid)
RETURNS TABLE(id uuid, affiliate_id uuid, affiliate_name text, affiliate_email text, amount_usd numeric, amount_fcfa integer,
  status text, payment_method text, payment_details jsonb, admin_note text,
  requested_at timestamptz, processed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_any_role(p_admin_id, ARRAY['super_admin'::app_role,'admin'::app_role]) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT pr.id, pr.affiliate_id, p.full_name, p.email, pr.amount_usd, pr.amount_fcfa,
         pr.status, pr.payment_method, pr.payment_details, pr.admin_note,
         pr.requested_at, pr.processed_at
  FROM public.affiliate_payout_requests pr
  LEFT JOIN public.affiliates a ON a.id = pr.affiliate_id
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  ORDER BY pr.requested_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_platform_setting(p_admin_id uuid, p_key text, p_value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_any_role(p_admin_id, ARRAY['super_admin'::app_role,'admin'::app_role]) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.platform_settings(key, value, updated_by, updated_at)
  VALUES (p_key, p_value, p_admin_id, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now();
END; $$;

INSERT INTO public.platform_settings(key, value) VALUES
  ('designer_royalty_rate', '0.20'::jsonb),
  ('generation_unit_value_usd', '0.20'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.subscription_plans(name, slug, description, price_fcfa, price_usd, credits_per_month, max_resolution, features, is_popular, is_active, sort_order)
VALUES ('Agence', 'agency',
  'Pour les équipes : 50 sièges, pool de crédits partagé, gestion centralisée',
  29000, 49, 9999, '4K',
  '["50 sièges utilisateurs","Pool de crédits partagé","Gestion centralisée d''équipe","Toutes résolutions","Accès API complet","Support prioritaire"]'::jsonb,
  false, true, 5)
ON CONFLICT (slug) DO NOTHING;
