-- Create function to submit feedback (bypasses type checking issues)
CREATE OR REPLACE FUNCTION public.submit_generation_feedback(
  p_user_id UUID,
  p_image_id UUID,
  p_rating INTEGER,
  p_comment TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.generation_feedback (user_id, image_id, rating, comment)
  VALUES (p_user_id, p_image_id, p_rating, p_comment);
END;
$$;