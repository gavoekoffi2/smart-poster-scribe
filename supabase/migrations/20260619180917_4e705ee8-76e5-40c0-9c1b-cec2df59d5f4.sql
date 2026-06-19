
ALTER VIEW public.reference_templates_public SET (security_invoker = true);
ALTER VIEW public.partner_designers_public SET (security_invoker = true);

DROP POLICY IF EXISTS "Service role manages idempotency keys" ON public.api_idempotency_keys;
CREATE POLICY "Service role manages idempotency keys"
  ON public.api_idempotency_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Content managers can add templates" ON public.reference_templates;
CREATE POLICY "Content managers can add templates"
  ON public.reference_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role])
    AND (
      designer_id IS NULL
      OR designer_id IN (SELECT id FROM public.partner_designers WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers and designers can upload reference templates" ON storage.objects;
CREATE POLICY "Managers and designers can upload reference templates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reference-templates'
    AND (
      has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role])
      OR has_role(auth.uid(), 'designer'::app_role)
    )
  );

DROP POLICY IF EXISTS "Managers can update reference templates" ON storage.objects;
CREATE POLICY "Managers can update reference templates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reference-templates'
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role])
  )
  WITH CHECK (
    bucket_id = 'reference-templates'
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role])
  );

DROP POLICY IF EXISTS "Admins can delete reference templates" ON storage.objects;
CREATE POLICY "Admins can delete reference templates"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reference-templates'
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role])
  );
