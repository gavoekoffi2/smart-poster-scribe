
-- 1. reference_templates: public SELECT for active rows
CREATE POLICY "Public can view active templates"
ON public.reference_templates
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 2. storage.objects: replace open temp-images SELECT with ownership-scoped
DROP POLICY IF EXISTS "Public read access for temp-images" ON storage.objects;

CREATE POLICY "Users read own files in temp-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'temp-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 3. Recreate reference-templates public read policy scoped correctly (bucket-only, no anon needed via API since bucket is public via CDN)
DROP POLICY IF EXISTS "Public read access for reference templates" ON storage.objects;

CREATE POLICY "Anyone can read reference templates"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'reference-templates');
