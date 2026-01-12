-- Update the check_and_debit_credits function to not reset free generations
-- Free credits are a one-time bonus, not monthly
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
BEGIN
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

-- Update reset_monthly_counters to NOT reset free_generations_used for free plan
-- Free credits are a one-time bonus, only paid plans get monthly renewal
CREATE OR REPLACE FUNCTION public.reset_monthly_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.current_period_end < now() THEN
    NEW.current_period_start := now();
    NEW.current_period_end := now() + interval '1 month';
    
    -- Only renew credits for PAID plans, NOT free plan
    -- Free plan's free_generations_used is a one-time bonus that never resets
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE id = NEW.plan_id AND slug != 'free') THEN
      NEW.credits_remaining := (SELECT credits_per_month FROM subscription_plans WHERE id = NEW.plan_id);
    END IF;
    -- Note: free_generations_used is NOT reset - it's a one-time trial bonus
  END IF;
  RETURN NEW;
END;
$function$;