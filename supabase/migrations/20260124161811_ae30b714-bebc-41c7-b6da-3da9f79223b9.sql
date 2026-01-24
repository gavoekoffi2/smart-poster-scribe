-- Add tutorial_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.tutorial_completed IS 'Whether the user has completed or skipped the onboarding tutorial';