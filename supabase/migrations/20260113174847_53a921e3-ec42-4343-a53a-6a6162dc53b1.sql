-- Clear existing showcase entries and add the 9 new posters
-- First, delete existing showcase entries that were placeholders
DELETE FROM generated_images WHERE is_showcase = true AND is_free_plan = true;

-- Insert the 9 new showcase images from the public folder
-- These will be served from the app's public folder
INSERT INTO generated_images (
  image_url, 
  prompt, 
  domain, 
  aspect_ratio, 
  resolution, 
  is_free_plan, 
  is_showcase,
  created_at
) VALUES 
  ('/showcase/showcase-1.png', 'Affiche professionnelle créée avec Graphiste GPT', 'event', '3:4', '1K', true, true, now()),
  ('/showcase/showcase-2.png', 'Design événementiel premium', 'event', '3:4', '1K', true, true, now() - interval '1 hour'),
  ('/showcase/showcase-3.png', 'Affiche formation professionnelle', 'formation', '3:4', '1K', true, true, now() - interval '2 hours'),
  ('/showcase/showcase-4.png', 'Visuel église moderne', 'church', '3:4', '1K', true, true, now() - interval '3 hours'),
  ('/showcase/showcase-5.png', 'Affiche concert gospel', 'event', '3:4', '1K', true, true, now() - interval '4 hours'),
  ('/showcase/showcase-6.png', 'Design service professionnel', 'service', '3:4', '1K', true, true, now() - interval '5 hours'),
  ('/showcase/showcase-7.png', 'Affiche événement spécial', 'event', '3:4', '1K', true, true, now() - interval '6 hours'),
  ('/showcase/showcase-8.png', 'Visuel artistique premium', 'event', '3:4', '1K', true, true, now() - interval '7 hours'),
  ('/showcase/showcase-9.png', 'Affiche créative moderne', 'service', '3:4', '1K', true, true, now() - interval '8 hours');