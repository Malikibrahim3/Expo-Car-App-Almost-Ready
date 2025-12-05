-- ============================================================================
-- ADD STRIPE COLUMNS FOR PAYMENT INTEGRATION
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add Stripe customer ID to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add Stripe columns to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
ON profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub 
ON user_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust 
ON user_subscriptions(stripe_customer_id);

-- ============================================================================
-- SUBSCRIPTION HISTORY TABLE (for tracking plan changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'upgraded', 'downgraded', 'canceled', 'reactivated', 'payment_failed'
  from_plan TEXT,
  to_plan TEXT,
  stripe_event_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user history lookups
CREATE INDEX IF NOT EXISTS idx_subscription_history_user 
ON subscription_history(user_id, created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on subscription_history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscription history
CREATE POLICY "Users can view own subscription history"
ON subscription_history FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert (from webhook)
CREATE POLICY "Service role can insert subscription history"
ON subscription_history FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTION: Record subscription event
-- ============================================================================

CREATE OR REPLACE FUNCTION record_subscription_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_from_plan TEXT DEFAULT NULL,
  p_to_plan TEXT DEFAULT NULL,
  p_stripe_event_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO subscription_history (
    user_id, event_type, from_plan, to_plan, stripe_event_id, metadata
  ) VALUES (
    p_user_id, p_event_type, p_from_plan, p_to_plan, p_stripe_event_id, p_metadata
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check profiles table has stripe_customer_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id';

-- Check user_subscriptions table has stripe columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND column_name IN ('stripe_subscription_id', 'stripe_customer_id', 'cancel_at_period_end', 'billing_cycle_start', 'billing_cycle_end');

-- Check subscription_history table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'subscription_history'
);
