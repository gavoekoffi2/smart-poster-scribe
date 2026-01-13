-- Update check_and_debit_credits to bypass credit limits for admins
CREATE OR REPLACE FUNCTION public.check_and_debit_credits(p_user_id uuid, p_resolution text, p_image_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_subscription public.user_subscriptions;
  v_plan public.subscription_plans;
  v_credits_needed INTEGER;
  v_result JSONB;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin or super_admin (they get unlimited free access)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
    AND role IN ('super_admin', 'admin', 'content_manager')
  ) INTO v_is_admin;
  
  -- Admins bypass all credit checks
  IF v_is_admin THEN
    -- Record transaction for tracking purposes only
    INSERT INTO public.credit_transactions (user_id, amount, type, resolution_used, related_image_id, description)
    VALUES (p_user_id, 0, 'admin_generation', p_resolution, p_image_id, 'Génération admin (gratuit)');
    
    RETURN jsonb_build_object(
      'success', true,
      'credits_used', 0,
      'remaining', 999999,
      'is_free', false,
      'is_admin', true,
      'add_watermark', false
    );
  END IF;

  -- Get user subscription
  SELECT * INTO v_subscription FROM public.get_or_create_user_subscription(p_user_id);
  
  -- Get plan details
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_subscription.plan_id;
  
  -- Calculate credits needed based on resolution
  v_credits_needed := CASE p_resolution
    WHEN '1K' THEN 1
    WHEN '2K' THEN 2
    WHEN '4K' THEN 4
    ELSE 1
  END;
  
  -- Check if free plan
  IF v_plan.slug = 'free' THEN
    -- Free plan: check one-time bonus limit (5 credits total, not monthly)
    IF v_subscription.free_generations_used >= 5 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'FREE_LIMIT_REACHED',
        'message', 'Vous avez utilisé vos 5 crédits d''essai gratuits. Abonnez-vous pour continuer à créer.',
        'remaining', 0,
        'is_free', true
      );
    END IF;
    
    -- Check resolution limit for free plan
    IF p_resolution != '1K' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'RESOLUTION_NOT_ALLOWED',
        'message', 'L''essai gratuit est limité à la résolution 1K. Passez à Pro pour accéder à toutes les résolutions.',
        'remaining', 5 - v_subscription.free_generations_used,
        'is_free', true
      );
    END IF;
    
    -- Update free generations count (one-time, never resets)
    UPDATE public.user_subscriptions
    SET free_generations_used = free_generations_used + 1,
        updated_at = now()
    WHERE id = v_subscription.id;
    
    -- Record transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, resolution_used, related_image_id, description)
    VALUES (p_user_id, -1, 'free_generation', p_resolution, p_image_id, 'Crédit d''essai utilisé');
    
    RETURN jsonb_build_object(
      'success', true,
      'credits_used', 1,
      'remaining', 5 - v_subscription.free_generations_used - 1,
      'is_free', true,
      'add_watermark', true
    );
  END IF;
  
  -- Paid plan: check credits
  IF v_subscription.credits_remaining < v_credits_needed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_CREDITS',
      'message', 'Crédits insuffisants. Vous avez ' || v_subscription.credits_remaining || ' crédits, mais ' || v_credits_needed || ' sont nécessaires.',
      'remaining', v_subscription.credits_remaining,
      'needed', v_credits_needed,
      'is_free', false
    );
  END IF;
  
  -- Debit credits
  UPDATE public.user_subscriptions
  SET credits_remaining = credits_remaining - v_credits_needed,
      updated_at = now()
  WHERE id = v_subscription.id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, resolution_used, related_image_id, description)
  VALUES (p_user_id, -v_credits_needed, 'generation', p_resolution, p_image_id, 'Génération image ' || p_resolution);
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_used', v_credits_needed,
    'remaining', v_subscription.credits_remaining - v_credits_needed,
    'is_free', false,
    'add_watermark', false
  );
END;
$function$;

-- Create function for admin to grant subscription to user
CREATE OR REPLACE FUNCTION public.admin_grant_subscription(
  p_admin_id uuid,
  p_target_user_id uuid,
  p_plan_slug text,
  p_credits integer DEFAULT NULL,
  p_duration_months integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_plan_id uuid;
  v_plan_credits integer;
  v_existing_sub public.user_subscriptions;
BEGIN
  -- Verify admin has permission
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_admin_id 
    AND role IN ('super_admin', 'admin')
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Seuls les administrateurs peuvent attribuer des abonnements'
    );
  END IF;
  
  -- Get the plan
  SELECT id, credits_per_month INTO v_plan_id, v_plan_credits
  FROM public.subscription_plans 
  WHERE slug = p_plan_slug AND is_active = true;
  
  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PLAN_NOT_FOUND',
      'message', 'Plan d''abonnement non trouvé: ' || p_plan_slug
    );
  END IF;
  
  -- Use custom credits if provided, otherwise use plan default
  IF p_credits IS NOT NULL THEN
    v_plan_credits := p_credits;
  END IF;
  
  -- Check if user already has a subscription
  SELECT * INTO v_existing_sub 
  FROM public.user_subscriptions 
  WHERE user_id = p_target_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing_sub IS NOT NULL THEN
    -- Update existing subscription
    UPDATE public.user_subscriptions
    SET 
      plan_id = v_plan_id,
      credits_remaining = v_plan_credits,
      current_period_start = now(),
      current_period_end = now() + (p_duration_months || ' months')::interval,
      status = 'active',
      updated_at = now()
    WHERE id = v_existing_sub.id;
  ELSE
    -- Create new subscription
    INSERT INTO public.user_subscriptions (
      user_id, 
      plan_id, 
      credits_remaining, 
      current_period_start,
      current_period_end,
      status
    )
    VALUES (
      p_target_user_id, 
      v_plan_id, 
      v_plan_credits,
      now(),
      now() + (p_duration_months || ' months')::interval,
      'active'
    );
  END IF;
  
  -- Record the grant as a credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (
    p_target_user_id, 
    v_plan_credits, 
    'admin_grant', 
    'Abonnement ' || p_plan_slug || ' offert par admin pour ' || p_duration_months || ' mois'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Abonnement ' || p_plan_slug || ' attribué avec succès',
    'plan', p_plan_slug,
    'credits', v_plan_credits,
    'duration_months', p_duration_months
  );
END;
$$;