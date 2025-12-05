-- Prediction Engine Tables
-- Run this in Supabase SQL Editor to create tables for the advanced prediction system

-- ============================================================================
-- MARKET LISTINGS CACHE
-- Stores fetched listings for 7-day caching
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_listings_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  trim TEXT,
  zip_code TEXT,
  listings JSONB NOT NULL DEFAULT '[]',
  total_found INTEGER DEFAULT 0,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_cache_key ON market_listings_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_listings_cache_make_model ON market_listings_cache(make, model, year);
CREATE INDEX IF NOT EXISTS idx_listings_cache_cached_at ON market_listings_cache(cached_at);

-- ============================================================================
-- PRICE HISTORY
-- Tracks price trends over time for market momentum analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  trim TEXT,
  average_price INTEGER NOT NULL,
  median_price INTEGER,
  price_low INTEGER,
  price_high INTEGER,
  listings_count INTEGER DEFAULT 0,
  median_mileage INTEGER,
  avg_days_on_market INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_vehicle ON price_history(make, model, year);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at);

-- ============================================================================
-- VALUATION LOG
-- Analytics tracking for valuations performed
-- ============================================================================

CREATE TABLE IF NOT EXISTS valuation_log (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  mileage INTEGER,
  trim TEXT,
  zip_code TEXT,
  estimated_value INTEGER,
  trade_in_value INTEGER,
  confidence TEXT,
  listings_used INTEGER DEFAULT 0,
  segment TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuation_log_vehicle ON valuation_log(make, model, year);
CREATE INDEX IF NOT EXISTS idx_valuation_log_created ON valuation_log(created_at);

-- ============================================================================
-- MODEL REFRESH CYCLES
-- Tracks when vehicle models get refreshed/redesigned
-- ============================================================================

CREATE TABLE IF NOT EXISTS model_refresh_cycles (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  last_refresh_year INTEGER NOT NULL,
  cycle_years INTEGER DEFAULT 5,
  next_expected_year INTEGER,
  refresh_type TEXT DEFAULT 'full', -- 'full', 'facelift', 'minor'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(make, model)
);

CREATE INDEX IF NOT EXISTS idx_model_refresh_make_model ON model_refresh_cycles(make, model);

-- ============================================================================
-- REGIONAL PRICE ADJUSTMENTS
-- Stores regional price variations for different vehicle types
-- ============================================================================

CREATE TABLE IF NOT EXISTS regional_adjustments (
  id BIGSERIAL PRIMARY KEY,
  segment TEXT NOT NULL,
  region TEXT NOT NULL,
  adjustment_factor DECIMAL(4,3) DEFAULT 1.000,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment, region)
);

-- ============================================================================
-- MILEAGE CLIFF IMPACTS
-- Tracks actual price drops at mileage thresholds
-- ============================================================================

CREATE TABLE IF NOT EXISTS mileage_cliff_impacts (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  observed_drop_percent DECIMAL(5,3),
  sample_size INTEGER DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(make, model, threshold)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE market_listings_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_refresh_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_cliff_impacts ENABLE ROW LEVEL SECURITY;

-- Public read access for reference data
CREATE POLICY "Allow public read" ON market_listings_cache FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON price_history FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON model_refresh_cycles FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON regional_adjustments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON mileage_cliff_impacts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON valuation_log FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Allow service insert" ON market_listings_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service update" ON market_listings_cache FOR UPDATE USING (true);
CREATE POLICY "Allow service delete" ON market_listings_cache FOR DELETE USING (true);

CREATE POLICY "Allow service insert" ON price_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service insert" ON valuation_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service insert" ON model_refresh_cycles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service update" ON model_refresh_cycles FOR UPDATE USING (true);

CREATE POLICY "Allow service insert" ON regional_adjustments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service update" ON regional_adjustments FOR UPDATE USING (true);

CREATE POLICY "Allow service insert" ON mileage_cliff_impacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service update" ON mileage_cliff_impacts FOR UPDATE USING (true);

-- ============================================================================
-- SEED DATA: Model Refresh Cycles
-- ============================================================================

INSERT INTO model_refresh_cycles (make, model, last_refresh_year, cycle_years, next_expected_year, refresh_type) VALUES
-- Toyota
('Toyota', 'Camry', 2024, 5, 2029, 'full'),
('Toyota', 'RAV4', 2024, 5, 2029, 'full'),
('Toyota', 'Corolla', 2019, 6, 2025, 'full'),
('Toyota', 'Highlander', 2020, 5, 2025, 'full'),
('Toyota', '4Runner', 2024, 10, 2034, 'full'),
('Toyota', 'Tacoma', 2024, 8, 2032, 'full'),
('Toyota', 'Tundra', 2022, 7, 2029, 'full'),
-- Honda
('Honda', 'Civic', 2022, 5, 2027, 'full'),
('Honda', 'Accord', 2023, 5, 2028, 'full'),
('Honda', 'CR-V', 2023, 5, 2028, 'full'),
('Honda', 'Pilot', 2023, 5, 2028, 'full'),
-- Ford
('Ford', 'F-150', 2021, 6, 2027, 'full'),
('Ford', 'Mustang', 2024, 6, 2030, 'full'),
('Ford', 'Bronco', 2021, 7, 2028, 'full'),
('Ford', 'Explorer', 2020, 6, 2026, 'full'),
-- Chevrolet
('Chevrolet', 'Silverado', 2019, 6, 2025, 'full'),
('Chevrolet', 'Tahoe', 2021, 6, 2027, 'full'),
('Chevrolet', 'Corvette', 2020, 8, 2028, 'full'),
-- BMW
('BMW', '3 Series', 2019, 7, 2026, 'full'),
('BMW', '5 Series', 2024, 7, 2031, 'full'),
('BMW', 'X3', 2024, 7, 2031, 'full'),
('BMW', 'X5', 2019, 7, 2026, 'full'),
-- Mercedes-Benz
('Mercedes-Benz', 'C-Class', 2022, 7, 2029, 'full'),
('Mercedes-Benz', 'E-Class', 2024, 7, 2031, 'full'),
('Mercedes-Benz', 'GLE', 2020, 7, 2027, 'full'),
-- Tesla
('Tesla', 'Model 3', 2024, 4, 2028, 'full'),
('Tesla', 'Model Y', 2024, 4, 2028, 'full'),
('Tesla', 'Model S', 2021, 4, 2025, 'full'),
-- Jeep
('Jeep', 'Wrangler', 2018, 10, 2028, 'full'),
('Jeep', 'Grand Cherokee', 2022, 6, 2028, 'full')
ON CONFLICT (make, model) DO UPDATE SET
  last_refresh_year = EXCLUDED.last_refresh_year,
  cycle_years = EXCLUDED.cycle_years,
  next_expected_year = EXCLUDED.next_expected_year,
  updated_at = NOW();

-- ============================================================================
-- SEED DATA: Regional Adjustments
-- ============================================================================

INSERT INTO regional_adjustments (segment, region, adjustment_factor) VALUES
-- Trucks
('truck', 'northeast', 0.950),
('truck', 'southeast', 1.020),
('truck', 'midwest', 1.050),
('truck', 'southwest', 1.080),
('truck', 'west', 1.000),
('truck', 'pacific', 0.950),
-- AWD SUVs
('suv_awd', 'northeast', 1.080),
('suv_awd', 'southeast', 0.950),
('suv_awd', 'midwest', 1.100),
('suv_awd', 'southwest', 0.920),
('suv_awd', 'west', 1.020),
('suv_awd', 'pacific', 0.980),
-- EVs
('ev', 'northeast', 1.020),
('ev', 'southeast', 0.920),
('ev', 'midwest', 0.880),
('ev', 'southwest', 0.950),
('ev', 'west', 1.050),
('ev', 'pacific', 1.120),
-- Convertibles
('convertible', 'northeast', 0.900),
('convertible', 'southeast', 1.050),
('convertible', 'midwest', 0.880),
('convertible', 'southwest', 1.080),
('convertible', 'west', 1.100),
('convertible', 'pacific', 1.120),
-- Default
('default', 'northeast', 1.000),
('default', 'southeast', 1.000),
('default', 'midwest', 0.980),
('default', 'southwest', 1.000),
('default', 'west', 1.020),
('default', 'pacific', 1.020)
ON CONFLICT (segment, region) DO UPDATE SET
  adjustment_factor = EXCLUDED.adjustment_factor,
  last_calculated = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Prediction tables created successfully!' as status;

SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('market_listings_cache', 'price_history', 'valuation_log', 
                     'model_refresh_cycles', 'regional_adjustments', 'mileage_cliff_impacts');
