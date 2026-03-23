-- Remove seed/placeholder showcase entries with invalid paths
UPDATE public.generated_images 
SET is_showcase = false, showcase_order = 0 
WHERE is_showcase = true 
AND (image_url LIKE '/showcase/%' OR image_url LIKE '%tempfile.aiquickdraw.com%');