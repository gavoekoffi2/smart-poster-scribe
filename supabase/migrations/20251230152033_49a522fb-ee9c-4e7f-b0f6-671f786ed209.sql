-- Create storage bucket for temporary images
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-images', 'temp-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public read access for temp-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'temp-images');

-- Create policy for authenticated insert (edge functions use service role)
CREATE POLICY "Service role insert for temp-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'temp-images');

-- Create policy for service role delete
CREATE POLICY "Service role delete for temp-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'temp-images');