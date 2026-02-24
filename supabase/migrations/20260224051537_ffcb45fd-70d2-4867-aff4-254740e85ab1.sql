
-- Add referred_by column to profiles (stores the referral code used at signup)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text DEFAULT NULL;

-- Create affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  referral_code text NOT NULL UNIQUE,
  total_referrals integer NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referral commissions table
CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL,
  payment_transaction_id uuid REFERENCES public.payment_transactions(id),
  amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.10,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own affiliate record
CREATE POLICY "Users can view their own affiliate" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);

-- RLS: Users can create their own affiliate record
CREATE POLICY "Users can create their own affiliate" ON public.affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: Users can update their own affiliate record
CREATE POLICY "Users can update their own affiliate" ON public.affiliates
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS: Admins can view all affiliates
CREATE POLICY "Admins can view all affiliates" ON public.affiliates
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- RLS: Admins can update all affiliates
CREATE POLICY "Admins can update all affiliates" ON public.affiliates
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- RLS: Users can view their own commissions
CREATE POLICY "Users can view their own commissions" ON public.referral_commissions
  FOR SELECT USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- RLS: Admins can view all commissions
CREATE POLICY "Admins can view all commissions" ON public.referral_commissions
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- RLS: Admins can manage all commissions
CREATE POLICY "Admins can manage all commissions" ON public.referral_commissions
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- RLS: Service role can manage commissions (for webhooks/edge functions)
CREATE POLICY "Service role can manage commissions" ON public.referral_commissions
  FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Function to generate a unique referral code from user name
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_code text;
  v_suffix text;
BEGIN
  -- Get user name from profiles
  SELECT COALESCE(full_name, 'user') INTO v_name FROM public.profiles WHERE user_id = p_user_id;
  
  -- Clean name: lowercase, remove spaces, take first 10 chars
  v_code := lower(regexp_replace(v_name, '[^a-zA-Z0-9]', '', 'g'));
  v_code := substring(v_code from 1 for 10);
  
  -- Add random suffix
  v_suffix := substring(md5(random()::text) from 1 for 4);
  v_code := v_code || v_suffix;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.affiliates WHERE referral_code = v_code) LOOP
    v_suffix := substring(md5(random()::text) from 1 for 4);
    v_code := substring(v_code from 1 for 10) || v_suffix;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Function to record a referral commission (called when a referred user makes a payment)
CREATE OR REPLACE FUNCTION public.record_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
  v_affiliate_id uuid;
  v_commission numeric;
BEGIN
  -- Only process successful payments
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Check if the paying user was referred
  SELECT referred_by INTO v_referral_code
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  IF v_referral_code IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find the affiliate
  SELECT id INTO v_affiliate_id
  FROM public.affiliates
  WHERE referral_code = v_referral_code AND is_active = true;
  
  IF v_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate 10% commission
  v_commission := NEW.amount_usd * 0.10;
  
  -- Insert commission record
  INSERT INTO public.referral_commissions (affiliate_id, referred_user_id, payment_transaction_id, amount, commission_rate)
  VALUES (v_affiliate_id, NEW.user_id, NEW.id, v_commission, 0.10);
  
  -- Update affiliate totals
  UPDATE public.affiliates
  SET total_earnings = total_earnings + v_commission,
      updated_at = now()
  WHERE id = v_affiliate_id;
  
  RETURN NEW;
END;
$$;

-- Trigger on payment_transactions to auto-record commissions
CREATE TRIGGER on_payment_completed_record_commission
  AFTER INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.record_referral_commission();

-- Function to increment referral count when a new user signs up with a referral code
CREATE OR REPLACE FUNCTION public.track_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL AND (OLD IS NULL OR OLD.referred_by IS NULL) THEN
    UPDATE public.affiliates
    SET total_referrals = total_referrals + 1,
        updated_at = now()
    WHERE referral_code = NEW.referred_by AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on profiles to track referral signups
CREATE TRIGGER on_profile_referred_by_set
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_signup();

-- Index for fast referral code lookups
CREATE INDEX idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX idx_profiles_referred_by ON public.profiles(referred_by);
