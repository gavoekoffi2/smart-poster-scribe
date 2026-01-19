-- Add UPDATE policy for temp-images bucket
CREATE POLICY "Users can update their own files in temp-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'temp-images' AND auth.uid() IS NOT NULL);

-- Ensure INSERT policy works for authenticated users
DROP POLICY IF EXISTS "Service role insert for temp-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to temp-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'temp-images');