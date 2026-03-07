-- Remove duplicate track_referral_signup trigger (keep on_profile_referred_by_set)
DROP TRIGGER IF EXISTS track_referral_signup_trigger ON public.profiles;

-- Remove duplicate reset_monthly_counters trigger (keep trigger_reset_monthly_counters)
DROP TRIGGER IF EXISTS reset_monthly_counters_trigger ON public.user_subscriptions;