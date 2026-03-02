
-- 1. Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Update handle_new_user trigger to capture email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;

-- 3. Create admin function to get all users with subscriptions (avoids N+1 and RLS issues)
CREATE OR REPLACE FUNCTION public.admin_get_users_with_subscriptions(p_admin_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  company_name text,
  created_at timestamptz,
  plan_name text,
  plan_slug text,
  credits_remaining integer,
  free_generations_used integer,
  sub_status text,
  current_period_end timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_any_role(p_admin_id, ARRAY['super_admin'::app_role, 'admin'::app_role]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.email,
    p.company_name,
    p.created_at,
    sp.name as plan_name,
    sp.slug as plan_slug,
    us.credits_remaining,
    us.free_generations_used,
    us.status as sub_status,
    us.current_period_end
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions us ON p.user_id = us.user_id
  LEFT JOIN public.subscription_plans sp ON us.plan_id = sp.id
  ORDER BY p.created_at DESC;
END;
$$;

-- 4. Create admin function to get payment transactions
CREATE OR REPLACE FUNCTION public.admin_get_payment_transactions(p_admin_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  amount_fcfa integer,
  amount_usd numeric,
  status text,
  payment_method text,
  plan_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_any_role(p_admin_id, ARRAY['super_admin'::app_role, 'admin'::app_role]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    pt.id,
    pt.user_id,
    p.full_name as user_name,
    p.email as user_email,
    pt.amount_fcfa,
    pt.amount_usd,
    pt.status,
    pt.payment_method,
    sp.name as plan_name,
    pt.created_at
  FROM public.payment_transactions pt
  LEFT JOIN public.profiles p ON pt.user_id = p.user_id
  LEFT JOIN public.subscription_plans sp ON pt.plan_id = sp.id
  ORDER BY pt.created_at DESC;
END;
$$;

-- 5. Create admin function to get financial stats
CREATE OR REPLACE FUNCTION public.admin_get_financial_stats(p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_revenue numeric;
  v_monthly_revenue numeric;
  v_paid_subscribers integer;
  v_failed_payments integer;
  v_month_start timestamptz;
BEGIN
  IF NOT has_any_role(p_admin_id, ARRAY['super_admin'::app_role, 'admin'::app_role]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_month_start := date_trunc('month', now());

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_total_revenue
  FROM public.payment_transactions WHERE status = 'completed';

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_monthly_revenue
  FROM public.payment_transactions WHERE status = 'completed' AND created_at >= v_month_start;

  SELECT COUNT(*) INTO v_paid_subscribers
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON us.plan_id = sp.id
  WHERE sp.slug != 'free' AND us.status = 'active';

  SELECT COUNT(*) INTO v_failed_payments
  FROM public.payment_transactions WHERE status IN ('failed', 'pending');

  RETURN jsonb_build_object(
    'total_revenue', v_total_revenue,
    'monthly_revenue', v_monthly_revenue,
    'paid_subscribers', v_paid_subscribers,
    'failed_payments', v_failed_payments
  );
END;
$$;

-- 6. Fix reset_monthly_counters to check for recent payment before renewing
CREATE OR REPLACE FUNCTION public.reset_monthly_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_recent_payment boolean;
  v_free_plan_id uuid;
BEGIN
  IF OLD.current_period_end < now() THEN
    NEW.current_period_start := now();
    NEW.current_period_end := now() + interval '1 month';
    
    -- Only renew credits for PAID plans with a recent completed payment
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE id = NEW.plan_id AND slug != 'free') THEN
      -- Check if there's a completed payment in the last 35 days
      SELECT EXISTS (
        SELECT 1 FROM public.payment_transactions
        WHERE user_id = NEW.user_id
          AND status = 'completed'
          AND created_at >= (now() - interval '35 days')
      ) INTO v_has_recent_payment;
      
      IF v_has_recent_payment THEN
        NEW.credits_remaining := (SELECT credits_per_month FROM subscription_plans WHERE id = NEW.plan_id);
      ELSE
        -- No recent payment: downgrade to free plan
        SELECT id INTO v_free_plan_id FROM subscription_plans WHERE slug = 'free' LIMIT 1;
        IF v_free_plan_id IS NOT NULL THEN
          NEW.plan_id := v_free_plan_id;
          NEW.credits_remaining := 0;
          NEW.status := 'expired';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
