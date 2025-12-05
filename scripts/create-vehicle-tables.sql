-- Vehicle Data Tables for Car Value Tracker
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS vehicle_years CASCADE;
DROP TABLE IF EXISTS vehicle_trims CASCADE;
DROP TABLE IF EXISTS vehicle_models CASCADE;
DROP TABLE IF EXISTS vehicle_makes CASCADE;

-- 1. Vehicle Makes
CREATE TABLE vehicle_makes (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Vehicle Models
CREATE TABLE vehicle_models (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(make, model)
);

-- 3. Vehicle Trims
CREATE TABLE vehicle_trims (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(make, model, trim)
);

-- 4. Vehicle Years (make/model/trim/year combinations)
CREATE TABLE vehicle_years (
  id BIGSERIAL PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(make, model, trim, year)
);

-- Create indexes for faster lookups
CREATE INDEX idx_vehicle_models_make ON vehicle_models(make);
CREATE INDEX idx_vehicle_trims_make_model ON vehicle_trims(make, model);
CREATE INDEX idx_vehicle_years_make_model_trim ON vehicle_years(make, model, trim);
CREATE INDEX idx_vehicle_years_year ON vehicle_years(year);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE vehicle_makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_trims ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_years ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access" ON vehicle_makes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON vehicle_models FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON vehicle_trims FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON vehicle_years FOR SELECT USING (true);

-- Create policies for service role write access
CREATE POLICY "Allow service role insert" ON vehicle_makes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role insert" ON vehicle_models FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role insert" ON vehicle_trims FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role insert" ON vehicle_years FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role update" ON vehicle_makes FOR UPDATE USING (true);
CREATE POLICY "Allow service role update" ON vehicle_models FOR UPDATE USING (true);
CREATE POLICY "Allow service role update" ON vehicle_trims FOR UPDATE USING (true);
CREATE POLICY "Allow service role update" ON vehicle_years FOR UPDATE USING (true);

CREATE POLICY "Allow service role delete" ON vehicle_makes FOR DELETE USING (true);
CREATE POLICY "Allow service role delete" ON vehicle_models FOR DELETE USING (true);
CREATE POLICY "Allow service role delete" ON vehicle_trims FOR DELETE USING (true);
CREATE POLICY "Allow service role delete" ON vehicle_years FOR DELETE USING (true);

-- Verify tables were created
SELECT 'Tables created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'vehicle_%';
