-- Add UPDATE policy for generated_images table to allow users to update their own images
CREATE POLICY "Users can update their own images" 
ON public.generated_images 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to update their own images (null user_id)
CREATE POLICY "Allow anonymous update for null user_id" 
ON public.generated_images 
FOR UPDATE 
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);