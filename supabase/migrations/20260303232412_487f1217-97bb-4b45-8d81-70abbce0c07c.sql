-- 1. Trigger: track referral signups when profiles.referred_by is set
CREATE TRIGGER track_referral_signup_trigger
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referred_by IS NOT NULL)
  EXECUTE FUNCTION public.track_referral_signup();

-- 2. Trigger: record referral commission when payment completes
CREATE TRIGGER record_referral_commission_trigger
  AFTER INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'success'))
  EXECUTE FUNCTION public.record_referral_commission();

-- 3. Trigger: reset monthly counters when subscription period ends
CREATE TRIGGER reset_monthly_counters_trigger
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_monthly_counters();