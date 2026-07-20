-- Atomically terminate and refund stale image jobs.
-- The row lock + params.refund_processed flag makes repeated status polls idempotent.
CREATE OR REPLACE FUNCTION public.fail_stale_image_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.image_jobs;
  v_params jsonb;
  v_credits integer;
  v_is_free boolean;
  v_subscription public.user_subscriptions;
BEGIN
  SELECT * INTO v_job
  FROM public.image_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job.id IS NULL OR v_job.status <> 'processing' THEN
    RETURN false;
  END IF;

  IF v_job.updated_at >= now() - interval '10 minutes' THEN
    RETURN false;
  END IF;

  v_params := COALESCE(v_job.params, '{}'::jsonb);
  v_credits := GREATEST(COALESCE((v_params ->> 'creditsUsed')::integer, 0), 0);
  v_is_free := COALESCE((v_params ->> 'isFree')::boolean, false);

  UPDATE public.image_jobs
  SET status = 'failed',
      error_message = 'JOB_TIMEOUT: image generation worker exceeded its execution window',
      params = v_params || jsonb_build_object(
        'refund_processed', true,
        'refunded_credits', v_credits,
        'refunded_at', now()
      )
  WHERE id = p_job_id;

  IF COALESCE((v_params ->> 'refund_processed')::boolean, false) OR v_credits <= 0 THEN
    RETURN true;
  END IF;

  SELECT * INTO v_subscription
  FROM public.user_subscriptions
  WHERE user_id = v_job.user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_subscription.id IS NOT NULL THEN
    IF v_is_free THEN
      UPDATE public.user_subscriptions
      SET free_generations_used = GREATEST(free_generations_used - 1, 0),
          updated_at = now()
      WHERE id = v_subscription.id;
    ELSE
      UPDATE public.user_subscriptions
      SET credits_remaining = credits_remaining + v_credits,
          updated_at = now()
      WHERE id = v_subscription.id;
    END IF;

    INSERT INTO public.credit_transactions
      (user_id, amount, type, resolution_used, description)
    VALUES
      (v_job.user_id, v_credits, 'refund', v_params ->> 'resolution',
       'Remboursement automatique job expiré ' || p_job_id::text);
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_stale_image_job(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_stale_image_job(uuid) TO service_role;

-- Terminal failure path used by the background worker. Credits and job status
-- are committed in one database transaction, so a worker crash cannot refund
-- twice or leave a refunded job in `processing`.
CREATE OR REPLACE FUNCTION public.fail_image_job_and_refund(
  p_job_id uuid,
  p_error_message text,
  p_model_used text DEFAULT NULL,
  p_provider_used text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.image_jobs;
  v_params jsonb;
  v_credits integer;
  v_is_free boolean;
  v_subscription public.user_subscriptions;
BEGIN
  SELECT * INTO v_job
  FROM public.image_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job.id IS NULL OR v_job.status = 'completed' THEN
    RETURN false;
  END IF;

  v_params := COALESCE(v_job.params, '{}'::jsonb);
  IF COALESCE((v_params ->> 'refund_processed')::boolean, false) THEN
    UPDATE public.image_jobs
    SET status = 'failed',
        error_message = left(COALESCE(p_error_message, 'Generation failed'), 1000),
        model_used = p_model_used,
        provider_used = p_provider_used,
        fallback_used = false
    WHERE id = p_job_id;
    RETURN true;
  END IF;

  v_credits := GREATEST(COALESCE((v_params ->> 'creditsUsed')::integer, 0), 0);
  v_is_free := COALESCE((v_params ->> 'isFree')::boolean, false);

  SELECT * INTO v_subscription
  FROM public.user_subscriptions
  WHERE user_id = v_job.user_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_subscription.id IS NOT NULL AND v_credits > 0 THEN
    IF v_is_free THEN
      UPDATE public.user_subscriptions
      SET free_generations_used = GREATEST(free_generations_used - 1, 0),
          updated_at = now()
      WHERE id = v_subscription.id;
    ELSE
      UPDATE public.user_subscriptions
      SET credits_remaining = credits_remaining + v_credits,
          updated_at = now()
      WHERE id = v_subscription.id;
    END IF;

    INSERT INTO public.credit_transactions
      (user_id, amount, type, resolution_used, description)
    VALUES
      (v_job.user_id, v_credits, 'refund', v_params ->> 'resolution',
       'Remboursement automatique job échoué ' || p_job_id::text);
  END IF;

  UPDATE public.image_jobs
  SET status = 'failed',
      error_message = left(COALESCE(p_error_message, 'Generation failed'), 1000),
      model_used = p_model_used,
      provider_used = p_provider_used,
      fallback_used = false,
      params = v_params || jsonb_build_object(
        'refund_processed', true,
        'refunded_credits', v_credits,
        'refunded_at', now()
      )
  WHERE id = p_job_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_image_job_and_refund(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_image_job_and_refund(uuid, text, text, text) TO service_role;
