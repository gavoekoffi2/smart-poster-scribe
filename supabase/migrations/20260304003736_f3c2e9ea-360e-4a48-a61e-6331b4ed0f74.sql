
-- Phase 1: Clean up duplicate triggers - keep only one per function

-- Drop ALL existing triggers for record_referral_commission on payment_transactions
DROP TRIGGER IF EXISTS on_payment_completed_record_commission ON public.payment_transactions;
DROP TRIGGER IF EXISTS on_payment_completed ON public.payment_transactions;
DROP TRIGGER IF EXISTS record_referral_commission_trigger ON public.payment_transactions;

-- Drop ALL existing triggers for track_referral_signup on profiles
DROP TRIGGER IF EXISTS track_referral_signup_trigger ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_referral ON public.profiles;

-- Drop ALL existing triggers for reset_monthly_counters on user_subscriptions
DROP TRIGGER IF EXISTS reset_monthly_counters_trigger ON public.user_subscriptions;
DROP TRIGGER IF EXISTS on_subscription_update_reset ON public.user_subscriptions;

-- Recreate exactly ONE trigger per function
CREATE TRIGGER record_referral_commission_trigger
  AFTER UPDATE OF status ON public.payment_transactions
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'success'))
  EXECUTE FUNCTION public.record_referral_commission();

CREATE TRIGGER track_referral_signup_trigger
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referred_by IS NOT NULL)
  EXECUTE FUNCTION public.track_referral_signup();

CREATE TRIGGER reset_monthly_counters_trigger
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_monthly_counters();
