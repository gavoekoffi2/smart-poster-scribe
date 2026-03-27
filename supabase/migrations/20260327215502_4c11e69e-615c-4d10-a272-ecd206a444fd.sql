CREATE OR REPLACE FUNCTION public.check_and_debit_credits(p_user_id uuid, p_resolution text, p_image_id uuid DEFAULT NULL::uuid, p_is_modification boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_subscription public.user_subscriptions;
  v_plan public.subscription_plans;
  v_credits_needed INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
    AND role IN ('super_admin', 'admin', 'content_manager')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    INSERT INTO public.credit_transactions (user_id, amount, type, resolution_used, related_image_id, description)
    VALUES (p_user_id, 0, 'admin_generation', p_resolution, p_image_id, 'Génération admin (gratuit)');
    
    RETURN jsonb_build_object(
      'success', true, 'credits_used', 0, 'remaining', 999999,
      'is_free', false, 'is_admin', true, 'add_watermark', false
    );
  END IF;

  IF p_is_modification THEN
    RETURN jsonb_build_object(
      'success', true, 'credits_used', 0, 'remaining', -1,
      'is_free', false, 'is_admin', false, 'add_watermark', false,
      'is_modification', true
    );
  END IF;

  SELECT * INTO v_subscription FROM public.get_or_create_user_subscription(p_user_id);
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_subscription.plan_id;
  
  v_credits_needed := 2;
  
  IF v_plan.slug = 'free' THEN
    IF v_subscription.free_generations_used >= 3 THEN
      RETURN jsonb_build_object(
        'success', false, 'error', 'FREE_LIMIT_REACHED',
        'message', 'Vous avez utilisé vos 3 affiches gratuites. Abonnez-vous pour continuer à créer.',
        'remaining', 0, 'is_free', true
      );
    END IF;
    
    IF p_resolution != '1K' THEN
      RETURN jsonb_build_object(
        'success', false, 'error', 'RESOLUTION_NOT_ALLOWED',
        'message', 'L''essai gratuit est limité à la résolution 1K. Passez à Pro pour accéder à toutes les résolutions.',
        'remaining', 3 - v_subscription.free_generations_used, 'is_free', true
      );
    END IF;
    
    UPDATE public.user_subscriptions
    SET free_generations_used = free_generations_used + 1, updated_at = now()
    WHERE id = v_subscription.id;
    
    INSERT INTO public.credit_transactions (user_id, amount, type, resolution_used, related_image_id, description)
    VALUES (p_user_id, -1, 'free_generation', p_resolution, p_image_id, 'Crédit d''essai utilisé');
    
    RETURN jsonb_build_object(
      'success', true, 'credits_used', 1,
      'remaining', 3 - v_subscription.free_generations_used - 1,
      'is_free', true, 'add_watermark', true
    );
  END IF;
  
  IF v_subscription.credits_remaining < v_credits_needed THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'INSUFFICIENT_CREDITS',
      'message', 'Crédits insuffisants. Vous avez ' || v_subscription.credits_remaining || ' crédits, mais ' || v_credits_needed || ' sont nécessaires.',
      'remaining', v_subscription.credits_remaining, 'needed', v_credits_needed, 'is_free', false
    );
  END IF;
  
  UPDATE public.user_subscriptions
  SET credits_remaining = credits_remaining - v_credits_needed, updated_at = now()
  WHERE id = v_subscription.id;
  
  INSERT INTO public.credit_transactions (user_id, amount, type, resolution_used, related_image_id, description)
  VALUES (p_user_id, -v_credits_needed, 'generation', p_resolution, p_image_id, 'Génération image ' || p_resolution);
  
  RETURN jsonb_build_object(
    'success', true, 'credits_used', v_credits_needed,
    'remaining', v_subscription.credits_remaining - v_credits_needed,
    'is_free', false, 'add_watermark', false
  );
END;
$function$