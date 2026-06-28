
CREATE OR REPLACE FUNCTION public.get_affiliate_referrals(p_affiliate_id uuid)
RETURNS TABLE(
  referral_name text,
  joined_at timestamptz,
  status text,
  plan_name text,
  total_earned numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_owner uuid;
BEGIN
  SELECT user_id, referral_code INTO v_owner, v_code
  FROM public.affiliates
  WHERE id = p_affiliate_id;

  IF v_owner IS NULL THEN
    RETURN;
  END IF;

  IF v_owner <> auth.uid() AND NOT public.has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN p.full_name IS NULL OR length(trim(p.full_name)) = 0 THEN 'Utilisateur'
      ELSE split_part(trim(p.full_name), ' ', 1)
        || CASE
             WHEN position(' ' in trim(p.full_name)) > 0
               THEN ' ' || upper(substr(split_part(trim(p.full_name), ' ', 2), 1, 1)) || '.'
             ELSE ''
           END
    END AS referral_name,
    p.created_at AS joined_at,
    CASE
      WHEN us.id IS NULL THEN 'Inscrit'
      WHEN sp.slug = 'free' THEN 'Essai'
      WHEN us.status = 'active' THEN 'Abonné'
      WHEN us.status = 'expired' THEN 'Expiré'
      ELSE COALESCE(us.status, 'Inscrit')
    END AS status,
    sp.name AS plan_name,
    COALESCE((
      SELECT SUM(rc.amount)
      FROM public.referral_commissions rc
      WHERE rc.affiliate_id = p_affiliate_id
        AND rc.referred_user_id = p.user_id
    ), 0)::numeric AS total_earned
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT * FROM public.user_subscriptions
    WHERE user_id = p.user_id
    ORDER BY created_at DESC
    LIMIT 1
  ) us ON true
  LEFT JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE p.referred_by = v_code
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_affiliate_referrals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_affiliate_referrals(uuid) TO authenticated, service_role;
