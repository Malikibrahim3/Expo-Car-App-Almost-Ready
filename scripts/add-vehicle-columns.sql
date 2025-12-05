-- Add new columns to vehicles table for financial forecasting and valuations
-- Run this in Supabase SQL Editor

-- Finance details columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deposit DECIMAL(12,2) DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good';

-- Valuation columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(12,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS trade_in_value DECIMAL(12,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS private_party_value DECIMAL(12,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS valuation_confidence TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_valuation_date TIMESTAMPTZ;

-- Add check constraint for condition
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_condition_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_condition_check 
  CHECK (condition IN ('excellent', 'good', 'fair', 'poor'));

-- Create index for faster valuation lookups
CREATE INDEX IF NOT EXISTS idx_vehicles_valuation_date ON vehicles(last_valuation_date);

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'vehicles' 
AND column_name IN ('interest_rate', 'deposit', 'start_date', 'condition', 
                    'estimated_value', 'trade_in_value', 'private_party_value',
                    'valuation_confidence', 'last_valuation_date');
