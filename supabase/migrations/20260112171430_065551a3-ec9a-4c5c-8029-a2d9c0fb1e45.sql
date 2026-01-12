-- Table des plans d'abonnement
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_fcfa INTEGER NOT NULL DEFAULT 0,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  credits_per_month INTEGER NOT NULL DEFAULT 0,
  max_resolution TEXT NOT NULL DEFAULT '1K',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des abonnements utilisateurs
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  free_generations_used INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 month'),
  moneroo_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des transactions de crédits
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription_renewal', 'purchase', 'generation', 'refund', 'bonus', 'free_generation')),
  resolution_used TEXT,
  related_image_id UUID REFERENCES public.generated_images(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des transactions de paiement
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id),
  moneroo_payment_id TEXT,
  amount_fcfa INTEGER NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  payment_method TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage plans"
ON public.subscription_plans
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their subscription"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their subscription"
ON public.user_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
ON public.user_subscriptions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions"
ON public.credit_transactions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view their own payments"
ON public.payment_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create payments"
ON public.payment_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payments"
ON public.payment_transactions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_fcfa, price_usd, credits_per_month, max_resolution, features, is_popular, sort_order) VALUES
('Gratuit', 'free', 'Parfait pour découvrir la plateforme', 0, 0, 0, '1K', '["5 affiches gratuites par mois", "Résolution 1K (réseaux sociaux)", "Filigrane Graphiste GPT", "Templates de base", "Formats réseaux sociaux"]'::jsonb, false, 1),
('Pro', 'pro', 'Idéal pour les créateurs de contenu', 9900, 16, 50, '4K', '["50 crédits par mois", "Toutes résolutions (1K, 2K, 4K)", "Sans filigrane", "Templates premium", "Éditeur visuel complet", "Historique illimité", "Support par email"]'::jsonb, true, 2),
('Business', 'business', 'Pour les équipes et entreprises', 29900, 49, 200, '4K', '["200 crédits par mois", "Toutes fonctionnalités Pro", "Templates exclusifs", "Support prioritaire", "Accès API", "Multi-utilisateurs (3 comptes)", "Statistiques avancées"]'::jsonb, false, 3),
('Enterprise', 'enterprise', 'Solutions sur mesure pour grandes entreprises', 0, 0, -1, '4K', '["Crédits illimités", "White-label disponible", "Support dédié 24/7", "SLA garanti", "Intégration personnalisée", "Formation incluse"]'::jsonb, false, 4);

-- Function to get or create user subscription
CREATE OR REPLACE FUNCTION public.get_or_create_user_subscription(p_user_id UUID)
RETURNS public.user_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription public.user_subscriptions;
  v_free_plan_id UUID;
BEGIN
  -- Try to get existing subscription
  SELECT * INTO v_subscription
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no subscription exists, create one with free plan
  IF v_subscription IS NULL THEN
    SELECT id INTO v_free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
    
    INSERT INTO public.user_subscriptions (user_id, plan_id, credits_remaining, free_generations_used)
    VALUES (p_user_id, v_free_plan_id, 0, 0)
    RETURNING * INTO v_subscription;
  END IF;
  
  RETURN v_subscription;
END;
$$;

-- Function to check and debit credits
CREATE OR REPLACE FUNCTION public.check_and_debit_credits(
  p_user_id UUID,
  p_resolution TEXT,
  p_image_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription public.user_subscriptions;
  v_plan public.subscription_plans;
  v_credits_needed INTEGER;
  v_result JSONB;
BEGIN
  -- Get user subscription
  SELECT * INTO v_subscription FROM public.get_or_create_user_subscription(p_user_id);
  
  -- Get plan details
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_subscription.plan_id;
  
  -- Calculate credits needed based on resolution
  v_credits_needed := CASE p_resolution
    WHEN '1K' THEN 1
    WHEN '2K' THEN 2
    WHEN '4K' THEN 4
    ELSE 1
  END;
  
  -- Check if free plan
  IF v_plan.slug = 'free' THEN
    -- Free plan: check monthly limit (5 images max)
    IF v_subscription.free_generations_used >= 5 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'FREE_LIMIT_REACHED',
        'message', 'Vous avez atteint la limite de 5 affiches gratuites ce mois-ci',
        'remaining', 0,
        'is_free', true
      );
    END IF;
    
    -- Check resolution limit for free plan
    IF p_resolution != '1K' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'RESOLUTION_NOT_ALLOWED',
        'message', 'Le plan gratuit est limité à la résolution 1K',
        'remaining', 5 - v_subscription.free_generations_used,
        'is_free', true
      );
    END IF;
    
    -- Update free generations count
    UPDATE public.user_subscriptions
    SET free_generations_used = free_generations_used + 1,
        updated_at = now()
    WHERE id = v_subscription.id;
    
    -- Record transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, resolution_used, related_image_id, description)
    VALUES (p_user_id, 0, 'free_generation', p_resolution, p_image_id, 'Génération gratuite');
    
    RETURN jsonb_build_object(
      'success', true,
      'credits_used', 0,
      'remaining', 5 - v_subscription.free_generations_used - 1,
      'is_free', true,
      'add_watermark', true
    );
  END IF;
  
  -- Paid plan: check credits
  IF v_subscription.credits_remaining < v_credits_needed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_CREDITS',
      'message', 'Crédits insuffisants. Vous avez ' || v_subscription.credits_remaining || ' crédits, mais ' || v_credits_needed || ' sont nécessaires.',
      'remaining', v_subscription.credits_remaining,
      'needed', v_credits_needed,
      'is_free', false
    );
  END IF;
  
  -- Debit credits
  UPDATE public.user_subscriptions
  SET credits_remaining = credits_remaining - v_credits_needed,
      updated_at = now()
  WHERE id = v_subscription.id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, resolution_used, related_image_id, description)
  VALUES (p_user_id, -v_credits_needed, 'generation', p_resolution, p_image_id, 'Génération image ' || p_resolution);
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_used', v_credits_needed,
    'remaining', v_subscription.credits_remaining - v_credits_needed,
    'is_free', false,
    'add_watermark', false
  );
END;
$$;

-- Trigger to reset free generations monthly
CREATE OR REPLACE FUNCTION public.reset_monthly_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.current_period_end < now() THEN
    NEW.free_generations_used := 0;
    NEW.current_period_start := now();
    NEW.current_period_end := now() + interval '1 month';
    
    -- Renew credits for paid plans
    IF EXISTS (SELECT 1 FROM subscription_plans WHERE id = NEW.plan_id AND slug != 'free') THEN
      NEW.credits_remaining := (SELECT credits_per_month FROM subscription_plans WHERE id = NEW.plan_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_reset_monthly_counters
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.reset_monthly_counters();