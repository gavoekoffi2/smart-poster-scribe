-- Create trigger for tracking referral signups on profiles table
CREATE OR REPLACE TRIGGER track_referral_signup_trigger
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_signup();

-- Create trigger for recording referral commissions on payment_transactions table
CREATE OR REPLACE TRIGGER record_referral_commission_trigger
  AFTER INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.record_referral_commission();