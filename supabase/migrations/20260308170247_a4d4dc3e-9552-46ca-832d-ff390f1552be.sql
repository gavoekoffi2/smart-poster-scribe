-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- 1. FIX user_subscriptions: Remove INSERT/UPDATE for users (privilege escalation)
DROP POLICY IF EXISTS "Users can create their subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their subscription" ON public.user_subscriptions;

-- 2. FIX generated_images: Restrict SELECT to owner + showcase + admins
DROP POLICY IF EXISTS "Anyone can view generated images" ON public.generated_images;
CREATE POLICY "Users can view own or showcase images" ON public.generated_images
  FOR SELECT USING (
    auth.uid() = user_id 
    OR is_showcase = true 
    OR has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'content_manager'::app_role])
  );

-- 3. FIX generated_images: Remove dangerous UPDATE with user_id IS NULL
DROP POLICY IF EXISTS "Users can update their own images" ON public.generated_images;
CREATE POLICY "Users can update their own images" ON public.generated_images
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. FIX role_permissions: Restrict SELECT to admins only
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.role_permissions;
CREATE POLICY "Admins can view permissions" ON public.role_permissions
  FOR SELECT USING (
    has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role])
  );

-- 5. RECREATE all essential triggers

-- handle_new_user trigger (creates profile on signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- track_referral_signup trigger
DROP TRIGGER IF EXISTS track_referral_signup_trigger ON public.profiles;
CREATE TRIGGER track_referral_signup_trigger
  AFTER INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_signup();

-- record_referral_commission trigger
DROP TRIGGER IF EXISTS record_referral_commission_trigger ON public.payment_transactions;
CREATE TRIGGER record_referral_commission_trigger
  AFTER INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.record_referral_commission();

-- reset_monthly_counters trigger
DROP TRIGGER IF EXISTS reset_monthly_counters_trigger ON public.user_subscriptions;
CREATE TRIGGER reset_monthly_counters_trigger
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_monthly_counters();