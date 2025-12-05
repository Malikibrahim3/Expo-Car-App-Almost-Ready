/**
 * Hybrid Valuation System
 * 
 * Combines real market data (MarketCheck API) with formula-based projections
 * to provide accurate current values AND future predictions.
 * 
 * ARCHITECTURE:
 * 1. CURRENT VALUE: Use cached MarketCheck data (ground truth)
 * 2. FUTURE PROJECTIONS: Use formula-based depreciation from current value
 * 3. FALLBACK: Use pure formula if no market data available
 * 
 * This ensures:
 * - Current equity is based on REAL market data
 * - Future projections are grounded in reality, not assumptions
 * - API requests are minimized (use cache)
 */

import { VehicleCategory } from '../types/vehicle';

// Calibrated depreciation rates (for projections only)
// These are applied to the CURRENT market value, not MSRP
const MONTHLY_DEPRECIATION: Record<VehicleCategory, number> = {
  economy: 0.004,   // ~5% per year
  premium: 0.006,   // ~7% per year  
  ev: 0.005,        // ~6% per year
  exotic: 0.003,    // ~3.5% per year
};

// Mileage impact on future value
const MILEAGE_DEPRECIATION_PER_MILE = 0.00003; // ~$0.03 per mile for average car

export interface MarketDataPoint {
  value: number;
  tradeInValue: number;
  privatePartyValue: number;
  confidence: 'high' | 'medium' | 'low' | 'estimate';
  source: 'marketcheck' | 'cache' | 'formula';
  fetchedAt: Date;
}

export interface HybridValuationInput {
  // Current market data (from MarketCheck/cache)
  currentMarketValue?: number;
  currentTradeInValue?: number;
  currentPrivatePartyValue?: number;
  valueConfidence?: 'high' | 'medium' | 'low' | 'estimate';
  valueFetchedAt?: Date;
  
  // Vehicle info (for formula fallback)
  msrp: number;
  category: VehicleCategory;
  currentMileage: number;
  monthsOwned: number;
  expectedAnnualMileage: number;
}

/**
 * Calculate current value using hybrid approach
 * 
 * Priority:
 * 1. Fresh MarketCheck data (< 7 days old) → use directly
 * 2. Stale MarketCheck data (7-30 days) → adjust for time passed
 * 3. No market data → use formula from MSRP
 */
export function getCurrentValue(input: HybridValuationInput): MarketDataPoint {
  const {
    currentMarketValue,
    currentTradeInValue,
    currentPrivatePartyValue,
    valueConfidence,
    valueFetchedAt,
    msrp,
    category,
    currentMileage,
    monthsOwned,
    expectedAnnualMileage,
  } = input;

  // Check if we have market data
  if (currentMarketValue && currentMarketValue > 0) {
    const dataAge = valueFetchedAt 
      ? (Date.now() - new Date(valueFetchedAt).getTime()) / (1000 * 60 * 60 * 24)
      : 30;
    
    // Fresh data (< 7 days) - use directly
    if (dataAge < 7) {
      return {
        value: currentMarketValue,
        tradeInValue: currentTradeInValue || currentMarketValue * 0.88,
        privatePartyValue: currentPrivatePartyValue || currentMarketValue * 1.05,
        confidence: valueConfidence || 'high',
        source: 'marketcheck',
        fetchedAt: valueFetchedAt || new Date(),
      };
    }
    
    // Stale data (7-30 days) - adjust for depreciation since fetch
    if (dataAge < 30) {
      const monthsSinceFetch = dataAge / 30;
      const depreciationRate = MONTHLY_DEPRECIATION[category];
      const adjustedValue = currentMarketValue * Math.pow(1 - depreciationRate, monthsSinceFetch);
      
      return {
        value: Math.round(adjustedValue),
        tradeInValue: Math.round(adjustedValue * 0.88),
        privatePartyValue: Math.round(adjustedValue * 1.05),
        confidence: 'medium',
        source: 'cache',
        fetchedAt: valueFetchedAt || new Date(),
      };
    }
  }
  
  // No market data or too old - use formula
  return calculateFormulaValue(msrp, category, monthsOwned, currentMileage, expectedAnnualMileage);
}

/**
 * Project future value at a given month
 * 
 * Uses current market value as anchor, then applies depreciation formula
 * This grounds projections in reality rather than pure assumptions
 */
export function projectFutureValue(
  currentValue: MarketDataPoint,
  category: VehicleCategory,
  monthsFromNow: number,
  additionalMiles: number
): MarketDataPoint {
  const depreciationRate = MONTHLY_DEPRECIATION[category];
  
  // Apply monthly depreciation
  let projectedValue = currentValue.value * Math.pow(1 - depreciationRate, monthsFromNow);
  
  // Apply mileage depreciation
  projectedValue -= additionalMiles * MILEAGE_DEPRECIATION_PER_MILE * currentValue.value / 30000;
  
  // Apply mileage cliff penalties
  // (These would need current mileage + additional miles to check thresholds)
  
  // Floor at 15% of current value
  projectedValue = Math.max(currentValue.value * 0.15, projectedValue);
  
  return {
    value: Math.round(projectedValue),
    tradeInValue: Math.round(projectedValue * 0.88),
    privatePartyValue: Math.round(projectedValue * 1.05),
    confidence: monthsFromNow <= 12 ? 'medium' : 'low',
    source: 'formula',
    fetchedAt: new Date(),
  };
}

/**
 * Formula-based value calculation (fallback)
 * Only used when no market data is available
 */
function calculateFormulaValue(
  msrp: number,
  category: VehicleCategory,
  monthsOwned: number,
  currentMileage: number,
  expectedAnnualMileage: number
): MarketDataPoint {
  // Drive-off depreciation
  const driveOffRates: Record<VehicleCategory, number> = {
    economy: 0.09,
    premium: 0.12,
    ev: 0.10,
    exotic: 0.05,
  };
  
  let value = msrp * (1 - driveOffRates[category]);
  
  // Monthly depreciation
  const yearlyRates: Record<VehicleCategory, Record<number, number>> = {
    economy: { 1: 0.05, 2: 0.06, 3: 0.05, 4: 0.04, 5: 0.04, 6: 0.03 },
    premium: { 1: 0.08, 2: 0.08, 3: 0.07, 4: 0.06, 5: 0.05, 6: 0.04 },
    ev: { 1: 0.06, 2: 0.06, 3: 0.05, 4: 0.04, 5: 0.03, 6: 0.03 },
    exotic: { 1: 0.04, 2: 0.04, 3: 0.03, 4: 0.03, 5: 0.02, 6: 0.02 },
  };
  
  for (let m = 0; m < monthsOwned; m++) {
    const year = Math.floor(m / 12) + 1;
    const yearRate = yearlyRates[category][Math.min(year, 6)] || yearlyRates[category][6];
    value *= (1 - yearRate / 12);
  }
  
  // Warranty expiry penalty
  if (monthsOwned >= 36) value *= 0.95;
  
  // Mileage cliffs
  if (currentMileage >= 100000) value *= 0.90;
  else if (currentMileage >= 60000) value *= 0.94;
  else if (currentMileage >= 30000) value *= 0.97;
  
  // Mileage adjustment
  const expectedMileage = (expectedAnnualMileage / 12) * monthsOwned;
  const mileageDiff = currentMileage - expectedMileage;
  const mileageAdj = 1 - (mileageDiff / 5000) * 0.02;
  value *= Math.max(0.7, Math.min(1.3, mileageAdj));
  
  // Floor
  value = Math.max(msrp * 0.15, value);
  
  return {
    value: Math.round(value),
    tradeInValue: Math.round(value * 0.88),
    privatePartyValue: Math.round(value * 1.05),
    confidence: 'estimate',
    source: 'formula',
    fetchedAt: new Date(),
  };
}

/**
 * Generate full projection timeline using hybrid approach
 * 
 * - Month 0 to current: Use market data if available
 * - Current to future: Project from market data anchor
 */
export function generateHybridProjections(
  input: HybridValuationInput,
  termMonths: number
): { month: number; value: MarketDataPoint }[] {
  const projections: { month: number; value: MarketDataPoint }[] = [];
  
  // Get current value (anchored to market data if available)
  const currentValue = getCurrentValue(input);
  const monthlyMileage = input.expectedAnnualMileage / 12;
  
  // Generate projections
  for (let month = 0; month <= termMonths + 6; month++) {
    if (month <= input.monthsOwned) {
      // Past/current: use current value (we don't have historical market data)
      // In a more sophisticated system, you'd query historical cached values
      projections.push({
        month,
        value: month === input.monthsOwned ? currentValue : {
          ...currentValue,
          confidence: 'estimate',
        },
      });
    } else {
      // Future: project from current value
      const monthsFromNow = month - input.monthsOwned;
      const additionalMiles = monthlyMileage * monthsFromNow;
      const projected = projectFutureValue(currentValue, input.category, monthsFromNow, additionalMiles);
      projections.push({ month, value: projected });
    }
  }
  
  return projections;
}

/**
 * Check if market data refresh is needed
 */
export function needsMarketDataRefresh(valueFetchedAt?: Date): boolean {
  if (!valueFetchedAt) return true;
  
  const dataAge = (Date.now() - new Date(valueFetchedAt).getTime()) / (1000 * 60 * 60 * 24);
  return dataAge > 7; // Refresh if older than 7 days
}

/**
 * Get confidence level description for UI
 */
export function getConfidenceDescription(confidence: MarketDataPoint['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'Based on current market data';
    case 'medium':
      return 'Based on recent market data';
    case 'low':
      return 'Projected estimate';
    case 'estimate':
      return 'Estimated (no market data)';
  }
}
