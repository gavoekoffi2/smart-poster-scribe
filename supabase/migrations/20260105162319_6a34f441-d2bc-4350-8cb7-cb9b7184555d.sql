-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id column to generated_images
ALTER TABLE public.generated_images 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for generated_images to be user-specific
DROP POLICY IF EXISTS "Allow public read access" ON public.generated_images;
DROP POLICY IF EXISTS "Allow public insert access" ON public.generated_images;
DROP POLICY IF EXISTS "Allow public delete access" ON public.generated_images;

-- New policies: users can only access their own images
CREATE POLICY "Users can view their own images" 
ON public.generated_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own images" 
ON public.generated_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" 
ON public.generated_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Also allow anonymous access for non-logged-in users (temporary images)
CREATE POLICY "Allow anonymous read for null user_id" 
ON public.generated_images 
FOR SELECT 
USING (user_id IS NULL);

CREATE POLICY "Allow anonymous insert for null user_id" 
ON public.generated_images 
FOR INSERT 
WITH CHECK (user_id IS NULL);