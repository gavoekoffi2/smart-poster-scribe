-- Drop and recreate the check constraint to include admin_generation
ALTER TABLE public.credit_transactions 
DROP CONSTRAINT credit_transactions_type_check;

ALTER TABLE public.credit_transactions 
ADD CONSTRAINT credit_transactions_type_check 
CHECK (type = ANY (ARRAY['subscription_renewal'::text, 'purchase'::text, 'generation'::text, 'refund'::text, 'bonus'::text, 'free_generation'::text, 'admin_generation'::text]));