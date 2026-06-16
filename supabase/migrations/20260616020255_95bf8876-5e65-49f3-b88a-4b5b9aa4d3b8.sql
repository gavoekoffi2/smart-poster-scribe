CREATE OR REPLACE FUNCTION public.record_referral_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_code text;
  v_affiliate_id uuid;
  v_commission numeric;
BEGIN
  IF NEW.status NOT IN ('completed', 'success') THEN
    RETURN NEW;
  END IF;

  SELECT referred_by INTO v_referral_code
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF v_referral_code IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_affiliate_id
  FROM public.affiliates
  WHERE referral_code = v_referral_code AND is_active = true;

  IF v_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_commission := NEW.amount_usd * 0.30;

  INSERT INTO public.referral_commissions (affiliate_id, referred_user_id, payment_transaction_id, amount, commission_rate)
  VALUES (v_affiliate_id, NEW.user_id, NEW.id, v_commission, 0.30);

  UPDATE public.affiliates
  SET total_earnings = total_earnings + v_commission, updated_at = now()
  WHERE id = v_affiliate_id;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger actually fires on payment status changes
DROP TRIGGER IF EXISTS trg_record_referral_commission ON public.payment_transactions;
CREATE TRIGGER trg_record_referral_commission
AFTER INSERT OR UPDATE OF status ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.record_referral_commission();

-- Ensure referral signup tracking trigger exists on profiles
DROP TRIGGER IF EXISTS trg_track_referral_signup ON public.profiles;
CREATE TRIGGER trg_track_referral_signup
AFTER INSERT OR UPDATE OF referred_by ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.track_referral_signup();