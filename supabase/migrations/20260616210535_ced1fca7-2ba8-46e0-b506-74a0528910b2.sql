DROP POLICY IF EXISTS "Users can view own or showcase images" ON public.generated_images;

CREATE POLICY "Users view own images or admins view all"
ON public.generated_images
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role])
);

CREATE OR REPLACE VIEW public.public_showcase_images
WITH (security_invoker = true) AS
SELECT
  id,
  image_url,
  aspect_ratio,
  resolution,
  domain,
  showcase_order,
  created_at
FROM public.generated_images
WHERE is_showcase = true;

GRANT SELECT ON public.public_showcase_images TO anon, authenticated;

REVOKE SELECT ON public.partner_designers FROM anon, authenticated;
GRANT SELECT
  (id, user_id, display_name, portfolio_url, bio, templates_count, is_verified, created_at, updated_at)
  ON public.partner_designers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.partner_designers TO authenticated;
GRANT ALL ON public.partner_designers TO service_role;

DROP POLICY IF EXISTS "Authenticated users can upload to temp-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in temp-images" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete for temp-images" ON storage.objects;

CREATE POLICY "Users upload to own folder in temp-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'temp-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users update own files in temp-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'temp-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'temp-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own files in temp-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'temp-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

REVOKE EXECUTE ON FUNCTION public.validate_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.validate_api_key(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_and_debit_credits(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_debit_credits(uuid, text, uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_user_subscription(uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.admin_grant_subscription(uuid, uuid, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_users_with_subscriptions(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_payment_transactions(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_financial_stats(uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.record_referral_commission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_referral_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_monthly_counters() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_referral_code(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_generation_feedback(uuid, uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_reference_template(text, text) FROM PUBLIC, anon;