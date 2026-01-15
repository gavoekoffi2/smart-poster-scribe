-- Create table for generation feedback
CREATE TABLE public.generation_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  image_id UUID REFERENCES public.generated_images(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generation_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (even anonymous)
CREATE POLICY "Anyone can insert feedback"
ON public.generation_feedback
FOR INSERT
WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.generation_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.generation_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create index for faster queries
CREATE INDEX idx_generation_feedback_user ON public.generation_feedback(user_id);
CREATE INDEX idx_generation_feedback_rating ON public.generation_feedback(rating);
CREATE INDEX idx_generation_feedback_created ON public.generation_feedback(created_at DESC);