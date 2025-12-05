-- Car Values Cache Table
-- Run this in Supabase SQL Editor to create the valuation cache table

-- Create car_values table for caching valuations
CREATE TABLE IF NOT EXISTS car_values (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  trim TEXT DEFAULT 'Base',
  mileage INTEGER,
  estimated_value INTEGER,
  price_low INTEGER,
  price_high INTEGER,
  confidence TEXT DEFAULT 'medium',
  last_fetched TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(make, model, year, trim)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_car_values_lookup ON car_values(make, model, year, trim);
CREATE INDEX IF NOT EXISTS idx_car_values_last_fetched ON car_values(last_fetched);

-- Enable Row Level Security
ALTER TABLE car_values ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Allow public read access" ON car_values;
DROP POLICY IF EXISTS "Allow service role insert" ON car_values;
DROP POLICY IF EXISTS "Allow service role update" ON car_values;
DROP POLICY IF EXISTS "Allow service role delete" ON car_values;

-- Allow public read access (valuations are not sensitive)
CREATE POLICY "Allow public read access" ON car_values FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role insert" ON car_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role update" ON car_values FOR UPDATE USING (true);
CREATE POLICY "Allow service role delete" ON car_values FOR DELETE USING (true);

-- Verify
SELECT 'car_values table created!' as status;
