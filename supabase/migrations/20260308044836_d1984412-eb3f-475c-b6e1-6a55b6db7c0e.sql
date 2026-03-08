
-- Triggers already exist, just ensure they're there with DROP IF EXISTS + CREATE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS record_referral_commission_trigger ON public.payment_transactions;
CREATE TRIGGER record_referral_commission_trigger
  AFTER UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.record_referral_commission();

DROP TRIGGER IF EXISTS on_profile_referred_by_set ON public.profiles;
CREATE TRIGGER on_profile_referred_by_set
  AFTER UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_signup();

DROP TRIGGER IF EXISTS trigger_reset_monthly_counters ON public.user_subscriptions;
CREATE TRIGGER trigger_reset_monthly_counters
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_monthly_counters();
