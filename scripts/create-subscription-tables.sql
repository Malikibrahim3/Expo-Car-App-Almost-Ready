-- Subscription & Refresh Management Tables
-- Run this in Supabase SQL Editor to create subscription system tables

-- ============================================================================
-- USER SUBSCRIPTIONS
-- Tracks user plan type and limits
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  
  -- Plan limits
  max_vehicles INTEGER NOT NULL DEFAULT 2,
  daily_refresh_vehicles INTEGER NOT NULL DEFAULT 0, -- Pro: up to 10 cars get daily updates
  manual_refresh_interval_days INTEGER NOT NULL DEFAULT 7, -- Free: 7 days, Pro: 1 day
  
  -- Billing (for future Stripe integration)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_cycle_start TIMESTAMPTZ,
  billing_cycle_end TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_type);

-- ============================================================================
-- VEHICLE REFRESH TRACKING
-- Tracks refresh schedules and history per vehicle
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_refresh_tracking (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Refresh schedule
  refresh_tier TEXT NOT NULL DEFAULT 'weekly' CHECK (refresh_tier IN ('daily', 'weekly')),
  priority_queue BOOLEAN DEFAULT false, -- Pro users get priority
  
  -- Last refresh timestamps
  last_auto_refresh TIMESTAMPTZ,
  last_manual_refresh TIMESTAMPTZ,
  next_scheduled_refresh TIMESTAMPTZ,
  
  -- Value tracking for market shift detection
  last_value INTEGER,
  previous_value INTEGER,
  value_change_percent DECIMAL(5,2),
  
  -- Refresh counts (reset weekly/daily based on plan)
  manual_refreshes_used INTEGER DEFAULT 0,
  manual_refresh_reset_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_refresh_vehicle ON vehicle_refresh_tracking(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_refresh_user ON vehicle_refresh_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_refresh_next ON vehicle_refresh_tracking(next_scheduled_refresh);
CREATE INDEX IF NOT EXISTS idx_vehicle_refresh_tier ON vehicle_refresh_tracking(refresh_tier);

-- ============================================================================
-- REFRESH HISTORY LOG
-- Audit trail of all refreshes performed
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_history (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Refresh details
  refresh_type TEXT NOT NULL CHECK (refresh_type IN ('auto_weekly', 'auto_daily', 'manual', 'market_shift')),
  trigger_reason TEXT, -- 'scheduled', 'user_request', 'market_movement', etc.
  
  -- Values before/after
  value_before INTEGER,
  value_after INTEGER,
  change_amount INTEGER,
  change_percent DECIMAL(5,2),
  
  -- API usage tracking
  api_calls_used INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_history_vehicle ON refresh_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_refresh_history_user ON refresh_history(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_history_created ON refresh_history(created_at);
CREATE INDEX IF NOT EXISTS idx_refresh_history_type ON refresh_history(refresh_type);

-- ============================================================================
-- MARKET SHIFT ALERTS
-- Tracks significant market movements that trigger extra refreshes
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_shift_alerts (
  id BIGSERIAL PRIMARY KEY,
  
  -- Vehicle identification (can be specific or segment-wide)
  make TEXT,
  model TEXT,
  year_start INTEGER,
  year_end INTEGER,
  segment TEXT,
  
  -- Shift details
  shift_percent DECIMAL(5,2) NOT NULL,
  shift_direction TEXT NOT NULL CHECK (shift_direction IN ('up', 'down')),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Alert status
  is_active BOOLEAN DEFAULT true,
  affected_vehicles_count INTEGER DEFAULT 0,
  refreshes_triggered INTEGER DEFAULT 0,
  
  -- Metadata
  source TEXT, -- 'listings_analysis', 'price_history', etc.
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_market_shift_active ON market_shift_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_market_shift_make_model ON market_shift_alerts(make, model);
CREATE INDEX IF NOT EXISTS idx_market_shift_segment ON market_shift_alerts(segment);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_refresh_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_shift_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription" ON user_subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON user_subscriptions 
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service can manage subscriptions" ON user_subscriptions 
  FOR ALL USING (true);

-- Users can only see their own refresh tracking
CREATE POLICY "Users can view own refresh tracking" ON vehicle_refresh_tracking 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage refresh tracking" ON vehicle_refresh_tracking 
  FOR ALL USING (true);

-- Users can only see their own refresh history
CREATE POLICY "Users can view own refresh history" ON refresh_history 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage refresh history" ON refresh_history 
  FOR ALL USING (true);

-- Market shift alerts are public read
CREATE POLICY "Public can view market shifts" ON market_shift_alerts 
  FOR SELECT USING (true);

CREATE POLICY "Service can manage market shifts" ON market_shift_alerts 
  FOR ALL USING (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to create default subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_type, max_vehicles, daily_refresh_vehicles, manual_refresh_interval_days)
  VALUES (NEW.id, 'free', 1, 0, 7)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create subscription on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- Function to check if user can add more vehicles
CREATE OR REPLACE FUNCTION can_add_vehicle(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_vehicles INTEGER;
  v_current_count INTEGER;
BEGIN
  SELECT max_vehicles INTO v_max_vehicles
  FROM user_subscriptions
  WHERE user_id = p_user_id AND is_active = true;
  
  IF v_max_vehicles IS NULL THEN
    v_max_vehicles := 2; -- Default free tier
  END IF;
  
  -- Pro users have unlimited vehicles
  IF v_max_vehicles = -1 THEN
    RETURN true;
  END IF;
  
  SELECT COUNT(*) INTO v_current_count
  FROM vehicles
  WHERE user_id = p_user_id;
  
  RETURN v_current_count < v_max_vehicles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform manual refresh
CREATE OR REPLACE FUNCTION can_manual_refresh(p_user_id UUID, p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_interval_days INTEGER;
  v_last_manual TIMESTAMPTZ;
  v_refreshes_used INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_plan_type TEXT;
BEGIN
  -- Get user's plan details
  SELECT manual_refresh_interval_days, plan_type INTO v_interval_days, v_plan_type
  FROM user_subscriptions
  WHERE user_id = p_user_id AND is_active = true;
  
  IF v_interval_days IS NULL THEN
    v_interval_days := 7; -- Default free tier
    v_plan_type := 'free';
  END IF;
  
  -- Get vehicle's refresh tracking
  SELECT last_manual_refresh, manual_refreshes_used, manual_refresh_reset_at 
  INTO v_last_manual, v_refreshes_used, v_reset_at
  FROM vehicle_refresh_tracking
  WHERE vehicle_id = p_vehicle_id;
  
  -- If no tracking record, allow refresh
  IF v_last_manual IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if reset period has passed
  IF v_plan_type = 'pro' THEN
    -- Pro: 1 refresh per day, resets daily
    IF v_reset_at < NOW() - INTERVAL '1 day' THEN
      RETURN true;
    END IF;
    RETURN v_refreshes_used < 1;
  ELSE
    -- Free: 1 refresh per 7 days
    IF v_reset_at < NOW() - INTERVAL '7 days' THEN
      RETURN true;
    END IF;
    RETURN v_refreshes_used < 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vehicles due for refresh
CREATE OR REPLACE FUNCTION get_vehicles_due_for_refresh()
RETURNS TABLE (
  vehicle_id UUID,
  user_id UUID,
  refresh_tier TEXT,
  priority_queue BOOLEAN,
  hours_overdue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vrt.vehicle_id,
    vrt.user_id,
    vrt.refresh_tier,
    vrt.priority_queue,
    EXTRACT(EPOCH FROM (NOW() - vrt.next_scheduled_refresh)) / 3600 as hours_overdue
  FROM vehicle_refresh_tracking vrt
  WHERE vrt.next_scheduled_refresh <= NOW()
  ORDER BY vrt.priority_queue DESC, vrt.next_scheduled_refresh ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Subscription tables created successfully!' as status;

SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('user_subscriptions', 'vehicle_refresh_tracking', 'refresh_history', 'market_shift_alerts');
