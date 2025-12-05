/**
 * Advanced Vehicle Prediction Engine
 * 
 * Professional-grade forecasting system that combines:
 * - Theoretical depreciation models (polynomial regression)
 * - Real-world market listings data
 * - Mileage cliff adjustments
 * - Seasonality scoring
 * - Model lifecycle tracking
 * - Finance-integrated forecasts
 * 
 * This is the core "brain" of the valuation system.
 */

import { VehicleCategory } from '../types/vehicle';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface VehicleInput {
  // Identity
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  engine?: string;
  drivetrain?: string;
  fuelType?: 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'plugin_hybrid';
  
  // Usage & Condition
  currentMileage: number;
  annualMileageEstimate?: number;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  accidentHistory?: boolean;
  numberOfOwners?: number;
  serviceHistory?: 'full' | 'partial' | 'none';
  
  // Location
  zipCode?: string;
  region?: 'northeast' | 'southeast' | 'midwest' | 'southwest' | 'west' | 'pacific';
  
  // Finance (optional)
  loanBalance?: number;
  interestRate?: number;
  monthlyPayment?: number;
  remainingPayments?: number;
}

export interface MarketListing {
  price: number;
  mileage: number;
  daysOnMarket: number;
  dealerType: 'dealer' | 'private' | 'auction';
  distance: number; // miles from user
  condition?: string;
  trim?: string;
  year: number;
  source: string;
}

export interface PredictionOutput {
  // Current Value
  currentValue: {
    estimated: number;
    tradeIn: number;
    privateParty: number;
    instant: number;
    confidence: 'high' | 'medium' | 'low';
    priceRange: { low: number; high: number };
  };
  
  // Future Predictions
  futureValues: {
    months3: FutureValue;
    months6: FutureValue;
    months12: FutureValue;
    months24: FutureValue;
  };
  
  // Optimal Sell Window
  optimalSellWindow: {
    startDate: Date;
    endDate: Date;
    peakDate: Date;
    peakValue: number;
    savingsVsWaiting12Months: number;
    recommendation: string;
  };
  
  // Mileage Alerts
  mileageAlerts: MileageAlert[];
  
  // Equity Projection (if finance data provided)
  equityProjection?: EquityProjection;
  
  // Market Insights
  marketInsights: MarketInsights;
  
  // Data Sources
  dataSources: {
    listingsCount: number;
    listingsWeight: number;
    modelWeight: number;
    lastUpdated: Date;
  };
}

export interface FutureValue {
  estimated: number;
  range: { low: number; high: number };
  changeFromCurrent: number;
  changePercent: number;
  projectedMileage: number;
  factors: string[];
}

export interface MileageAlert {
  threshold: number;
  monthsUntil: number;
  expectedValueDrop: number;
  dropPercent: number;
  message: string;
}

export interface EquityProjection {
  currentEquity: number;
  equityTurnsPositiveIn?: number; // months
  monthlyDepreciation: number;
  monthlyPrincipalReduction: number;
  isNegativeEquityRisk: boolean;
  negativeEquityMonths?: number;
  recommendation: string;
}

export interface MarketInsights {
  similarListingsCount: number;
  averageDaysOnMarket: number;
  priceCompetitiveness: 'underpriced' | 'fair' | 'overpriced';
  demandLevel: 'high' | 'medium' | 'low';
  inventoryTrend: 'increasing' | 'stable' | 'decreasing';
  seasonalAdjustment: number;
  seasonalMessage?: string;
  modelLifecycleImpact?: string;
  regionalDemand: number; // multiplier
}

// ============================================================================
// DEPRECIATION CONSTANTS
// ============================================================================

/**
 * Mileage Cliff Thresholds
 * Cars lose value in "steps" at these mileage points
 */
export const MILEAGE_CLIFFS = [
  { threshold: 30000, dropPercent: 0.05, label: 'Warranty territory' },
  { threshold: 40000, dropPercent: 0.03, label: 'Extended warranty limit' },
  { threshold: 50000, dropPercent: 0.04, label: 'Major service interval' },
  { threshold: 60000, dropPercent: 0.04, label: '60k service' },
  { threshold: 75000, dropPercent: 0.05, label: 'High mileage threshold' },
  { threshold: 90000, dropPercent: 0.04, label: 'Approaching 100k' },
  { threshold: 100000, dropPercent: 0.08, label: '100k milestone - significant drop' },
  { threshold: 125000, dropPercent: 0.05, label: 'Very high mileage' },
  { threshold: 150000, dropPercent: 0.06, label: 'End-of-life fleet value' },
];

/**
 * Age-based depreciation curves by segment
 * Most models follow this shape (varies by segment)
 */
export const AGE_DEPRECIATION: Record<string, number[]> = {
  // Year 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10+
  economy: [1.0, 0.80, 0.72, 0.65, 0.59, 0.54, 0.50, 0.47, 0.44, 0.42, 0.40],
  mainstream: [1.0, 0.82, 0.74, 0.67, 0.61, 0.56, 0.52, 0.49, 0.46, 0.44, 0.42],
  premium: [1.0, 0.78, 0.68, 0.60, 0.53, 0.47, 0.43, 0.40, 0.37, 0.35, 0.33],
  luxury: [1.0, 0.75, 0.63, 0.54, 0.47, 0.41, 0.37, 0.34, 0.31, 0.29, 0.27],
  truck: [1.0, 0.88, 0.82, 0.76, 0.71, 0.67, 0.63, 0.60, 0.57, 0.55, 0.53],
  suv: [1.0, 0.85, 0.78, 0.72, 0.66, 0.61, 0.57, 0.54, 0.51, 0.49, 0.47],
  sports: [1.0, 0.83, 0.75, 0.68, 0.62, 0.57, 0.53, 0.50, 0.47, 0.45, 0.43],
  ev: [1.0, 0.70, 0.58, 0.49, 0.42, 0.37, 0.33, 0.30, 0.28, 0.26, 0.25],
  exotic: [1.0, 0.92, 0.88, 0.85, 0.83, 0.82, 0.81, 0.80, 0.80, 0.80, 0.80],
};

/**
 * Seasonality multipliers by vehicle type and month
 * 1.0 = baseline, >1.0 = higher demand, <1.0 = lower demand
 */
export const SEASONALITY: Record<string, number[]> = {
  // Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
  truck: [0.95, 0.97, 1.05, 1.08, 1.10, 1.08, 1.05, 1.02, 0.98, 0.95, 0.92, 0.90],
  suv_awd: [1.08, 1.05, 1.00, 0.95, 0.92, 0.90, 0.90, 0.92, 0.95, 1.00, 1.05, 1.10],
  convertible: [0.85, 0.88, 0.95, 1.05, 1.12, 1.15, 1.15, 1.10, 1.00, 0.92, 0.85, 0.82],
  ev: [1.02, 1.00, 1.05, 1.08, 1.05, 1.02, 1.00, 0.98, 1.00, 1.02, 1.00, 1.05], // Tax credit timing
  default: [0.98, 0.98, 1.02, 1.03, 1.04, 1.03, 1.02, 1.00, 0.99, 0.98, 0.97, 0.96],
};

/**
 * Condition multipliers
 */
export const CONDITION_MULTIPLIERS = {
  excellent: 1.08,
  good: 1.00,
  fair: 0.90,
  poor: 0.75,
};

/**
 * Tiered pricing by value bracket
 */
export const VALUE_TIERS = {
  exotic: { min: 150000, tradeIn: 0.92, instant: 0.88, private: 1.03 },
  luxury: { min: 75000, tradeIn: 0.90, instant: 0.85, private: 1.05 },
  premium: { min: 40000, tradeIn: 0.88, instant: 0.84, private: 1.06 },
  standard: { min: 0, tradeIn: 0.85, instant: 0.82, private: 1.08 },
};

// ============================================================================
// VEHICLE SEGMENT DETECTION
// ============================================================================

const SEGMENT_KEYWORDS: Record<string, string[]> = {
  truck: ['f-150', 'f150', 'silverado', 'ram', 'tundra', 'tacoma', 'colorado', 'ranger', 'frontier', 'titan', 'gladiator', 'ridgeline'],
  suv: ['explorer', 'tahoe', 'suburban', 'expedition', 'highlander', '4runner', 'pilot', 'pathfinder', 'armada', 'sequoia', 'telluride', 'palisade', 'grand cherokee', 'wrangler'],
  luxury: ['mercedes', 'bmw', 'audi', 'lexus', 'infiniti', 'acura', 'genesis', 'lincoln', 'cadillac', 'volvo', 'jaguar', 'land rover', 'range rover', 'porsche'],
  ev: ['tesla', 'model 3', 'model y', 'model s', 'model x', 'bolt', 'leaf', 'ioniq', 'ev6', 'id.4', 'mach-e', 'mustang mach-e', 'rivian', 'lucid', 'polestar', 'taycan', 'e-tron', 'bz4x', 'ariya'],
  exotic: ['ferrari', 'lamborghini', 'mclaren', 'bentley', 'rolls-royce', 'aston martin', 'bugatti', 'maserati', 'lotus'],
  sports: ['mustang', 'camaro', 'corvette', 'challenger', 'charger', '911', 'cayman', 'boxster', 'supra', 'z', '370z', 'brz', 'gr86', 'miata', 'mx-5', 'wrx', 'sti', 'type r', 'gti', 'golf r'],
  convertible: ['convertible', 'roadster', 'spyder', 'cabriolet', 'drop top'],
};

export function detectVehicleSegment(make: string, model: string, fuelType?: string): string {
  const searchStr = `${make} ${model}`.toLowerCase();
  
  // Check fuel type first for EVs
  if (fuelType === 'electric') return 'ev';
  
  // Check keywords
  for (const [segment, keywords] of Object.entries(SEGMENT_KEYWORDS)) {
    if (keywords.some(kw => searchStr.includes(kw))) {
      return segment;
    }
  }
  
  // Default based on make
  const luxuryMakes = ['mercedes-benz', 'bmw', 'audi', 'lexus', 'porsche', 'jaguar', 'land rover'];
  if (luxuryMakes.some(m => make.toLowerCase().includes(m))) {
    return 'luxury';
  }
  
  return 'mainstream';
}

// ============================================================================
// CORE PREDICTION FUNCTIONS
// ============================================================================

/**
 * Calculate base depreciation using polynomial curve
 */
export function calculateBaseDepreciation(
  originalMSRP: number,
  vehicleAge: number,
  segment: string
): number {
  const curve = AGE_DEPRECIATION[segment] || AGE_DEPRECIATION.mainstream;
  const yearIndex = Math.min(vehicleAge, curve.length - 1);
  
  // Interpolate between years for smoother curve
  if (vehicleAge < curve.length - 1) {
    const lowerValue = curve[Math.floor(yearIndex)];
    const upperValue = curve[Math.ceil(yearIndex)];
    const fraction = yearIndex - Math.floor(yearIndex);
    return originalMSRP * (lowerValue + (upperValue - lowerValue) * fraction);
  }
  
  // For very old vehicles, continue depreciation at slower rate
  const lastRate = curve[curve.length - 1];
  const extraYears = vehicleAge - (curve.length - 1);
  const additionalDepreciation = Math.pow(0.97, extraYears); // 3% per year after 10
  
  return originalMSRP * lastRate * additionalDepreciation;
}

/**
 * Apply mileage cliff adjustments
 */
export function applyMileageCliffs(
  baseValue: number,
  currentMileage: number,
  expectedMileageForAge: number
): { adjustedValue: number; cliffsApplied: string[] } {
  let adjustedValue = baseValue;
  const cliffsApplied: string[] = [];
  
  // Calculate mileage deviation from expected
  const mileageDeviation = currentMileage - expectedMileageForAge;
  
  // Apply per-mile adjustment for deviation
  // $0.08-0.15 per mile depending on vehicle value
  const perMileRate = baseValue > 50000 ? 0.15 : baseValue > 25000 ? 0.12 : 0.08;
  adjustedValue -= mileageDeviation * perMileRate;
  
  // Apply cliff penalties
  for (const cliff of MILEAGE_CLIFFS) {
    if (currentMileage >= cliff.threshold) {
      const penalty = baseValue * cliff.dropPercent;
      adjustedValue -= penalty;
      cliffsApplied.push(cliff.label);
    }
  }
  
  return { adjustedValue: Math.max(adjustedValue, baseValue * 0.3), cliffsApplied };
}

/**
 * Get next mileage cliff alert
 */
export function getNextMileageCliff(
  currentMileage: number,
  annualMileage: number,
  currentValue: number
): MileageAlert | null {
  const monthlyMileage = annualMileage / 12;
  
  for (const cliff of MILEAGE_CLIFFS) {
    if (currentMileage < cliff.threshold) {
      const milesUntil = cliff.threshold - currentMileage;
      const monthsUntil = milesUntil / monthlyMileage;
      const expectedDrop = currentValue * cliff.dropPercent;
      
      return {
        threshold: cliff.threshold,
        monthsUntil: Math.round(monthsUntil * 10) / 10,
        expectedValueDrop: Math.round(expectedDrop),
        dropPercent: cliff.dropPercent * 100,
        message: `You will hit ${cliff.threshold.toLocaleString()} miles in ${monthsUntil.toFixed(1)} months → expected value drop: $${expectedDrop.toLocaleString()}`,
      };
    }
  }
  
  return null;
}

/**
 * Apply seasonality adjustment
 */
export function applySeasonality(
  value: number,
  segment: string,
  month: number
): { adjustedValue: number; multiplier: number; message?: string } {
  let seasonalKey = 'default';
  
  if (segment === 'truck') seasonalKey = 'truck';
  else if (segment === 'suv' || segment.includes('awd')) seasonalKey = 'suv_awd';
  else if (segment === 'convertible' || segment === 'sports') seasonalKey = 'convertible';
  else if (segment === 'ev') seasonalKey = 'ev';
  
  const seasonalCurve = SEASONALITY[seasonalKey] || SEASONALITY.default;
  const multiplier = seasonalCurve[month];
  const adjustedValue = value * multiplier;
  
  let message: string | undefined;
  if (multiplier > 1.03) {
    message = `Expected seasonal lift: +$${Math.round(adjustedValue - value).toLocaleString()} this month`;
  } else if (multiplier < 0.97) {
    message = `Seasonal dip: -$${Math.round(value - adjustedValue).toLocaleString()} this month`;
  }
  
  return { adjustedValue, multiplier, message };
}

/**
 * Get pricing tier based on value
 */
export function getPricingTier(value: number) {
  if (value >= VALUE_TIERS.exotic.min) return VALUE_TIERS.exotic;
  if (value >= VALUE_TIERS.luxury.min) return VALUE_TIERS.luxury;
  if (value >= VALUE_TIERS.premium.min) return VALUE_TIERS.premium;
  return VALUE_TIERS.standard;
}

/**
 * Calculate confidence based on data quality
 */
export function calculateConfidence(
  listingsCount: number,
  listingsAge: number, // days since last update
  hasExactTrimMatch: boolean
): 'high' | 'medium' | 'low' {
  let score = 0;
  
  if (listingsCount >= 20) score += 3;
  else if (listingsCount >= 10) score += 2;
  else if (listingsCount >= 5) score += 1;
  
  if (listingsAge <= 7) score += 2;
  else if (listingsAge <= 14) score += 1;
  
  if (hasExactTrimMatch) score += 2;
  
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}


// ============================================================================
// LISTINGS INTEGRATION & BLENDING
// ============================================================================

/**
 * Calculate blend weights based on vehicle type and data availability
 * 
 * Urban Areas (more listings): 70% listings, 30% model
 * Rural Areas (few listings): 60% model, 40% listings
 * Hot cars (Toyota, Honda, trucks): 80% listings-driven
 * Low-volume cars (Lotus, Maserati): 80% model-driven
 * EVs: 90% listings-driven (volatile market)
 */
export function calculateBlendWeights(
  segment: string,
  listingsCount: number,
  isUrban: boolean = true
): { listingsWeight: number; modelWeight: number } {
  // Base weights
  let listingsWeight = isUrban ? 0.70 : 0.40;
  let modelWeight = isUrban ? 0.30 : 0.60;
  
  // Adjust for segment
  if (segment === 'ev') {
    listingsWeight = 0.90;
    modelWeight = 0.10;
  } else if (segment === 'exotic' || segment === 'luxury') {
    // Low-volume, use more model
    listingsWeight = 0.30;
    modelWeight = 0.70;
  } else if (segment === 'truck' || segment === 'mainstream') {
    // High-volume, use more listings
    listingsWeight = 0.80;
    modelWeight = 0.20;
  }
  
  // Adjust for data availability
  if (listingsCount < 5) {
    listingsWeight = Math.min(listingsWeight, 0.30);
    modelWeight = 1 - listingsWeight;
  } else if (listingsCount >= 30) {
    listingsWeight = Math.max(listingsWeight, 0.75);
    modelWeight = 1 - listingsWeight;
  }
  
  return { listingsWeight, modelWeight };
}

/**
 * Process and clean market listings
 */
export function processListings(listings: MarketListing[]): {
  averagePrice: number;
  medianPrice: number;
  priceRange: { low: number; high: number };
  averageDaysOnMarket: number;
  mileageAdjustedAverage: number;
  pricePerMile: number;
  marketMomentum: number; // positive = prices rising, negative = falling
} {
  if (!listings || listings.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      priceRange: { low: 0, high: 0 },
      averageDaysOnMarket: 0,
      mileageAdjustedAverage: 0,
      pricePerMile: 0,
      marketMomentum: 0,
    };
  }
  
  // Filter outliers (remove top/bottom 10%)
  const sortedByPrice = [...listings].sort((a, b) => a.price - b.price);
  const trimCount = Math.floor(listings.length * 0.1);
  const trimmedListings = sortedByPrice.slice(trimCount, -trimCount || undefined);
  
  const prices = trimmedListings.map(l => l.price);
  const mileages = trimmedListings.map(l => l.mileage);
  const daysOnMarket = trimmedListings.map(l => l.daysOnMarket);
  
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const averageMileage = mileages.reduce((a, b) => a + b, 0) / mileages.length;
  const averageDaysOnMarket = daysOnMarket.reduce((a, b) => a + b, 0) / daysOnMarket.length;
  
  // Calculate price per mile for mileage adjustments
  const pricePerMile = calculatePricePerMile(trimmedListings);
  
  // Calculate market momentum from days on market
  // Lower DOM = higher demand = positive momentum
  const avgDOM = averageDaysOnMarket;
  let marketMomentum = 0;
  if (avgDOM < 20) marketMomentum = 0.02; // Prices likely rising
  else if (avgDOM < 35) marketMomentum = 0.01;
  else if (avgDOM > 60) marketMomentum = -0.02; // Prices likely falling
  else if (avgDOM > 45) marketMomentum = -0.01;
  
  return {
    averagePrice: Math.round(averagePrice),
    medianPrice: Math.round(medianPrice),
    priceRange: {
      low: Math.round(prices[0]),
      high: Math.round(prices[prices.length - 1]),
    },
    averageDaysOnMarket: Math.round(averageDaysOnMarket),
    mileageAdjustedAverage: Math.round(averagePrice),
    pricePerMile,
    marketMomentum,
  };
}

/**
 * Calculate price per mile from listings
 */
function calculatePricePerMile(listings: MarketListing[]): number {
  if (listings.length < 2) return 0.10; // Default
  
  // Simple linear regression to find price/mile relationship
  const n = listings.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (const listing of listings) {
    sumX += listing.mileage;
    sumY += listing.price;
    sumXY += listing.mileage * listing.price;
    sumX2 += listing.mileage * listing.mileage;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Slope is negative (higher mileage = lower price), return absolute value
  return Math.abs(slope) || 0.10;
}

/**
 * Blend theoretical model with real listings
 */
export function blendValuation(
  theoreticalValue: number,
  listingsData: ReturnType<typeof processListings>,
  weights: { listingsWeight: number; modelWeight: number },
  targetMileage: number
): number {
  if (listingsData.averagePrice === 0) {
    return theoreticalValue;
  }
  
  // Adjust listings average for mileage difference
  const avgListingMileage = listingsData.mileageAdjustedAverage;
  const mileageDiff = targetMileage - avgListingMileage;
  const mileageAdjustedListingPrice = listingsData.averagePrice - (mileageDiff * listingsData.pricePerMile);
  
  // Blend
  const blendedValue = (mileageAdjustedListingPrice * weights.listingsWeight) + 
                       (theoreticalValue * weights.modelWeight);
  
  return Math.round(blendedValue);
}

// ============================================================================
// FUTURE VALUE PREDICTION
// ============================================================================

/**
 * Project future value at a specific month
 */
export function projectFutureValue(
  currentValue: number,
  currentMileage: number,
  annualMileage: number,
  segment: string,
  monthsAhead: number,
  marketMomentum: number = 0
): FutureValue {
  const monthlyMileage = annualMileage / 12;
  const projectedMileage = currentMileage + (monthlyMileage * monthsAhead);
  
  // Monthly depreciation rate based on segment
  const monthlyDepreciationRates: Record<string, number> = {
    economy: 0.008,
    mainstream: 0.009,
    premium: 0.011,
    luxury: 0.013,
    truck: 0.006,
    suv: 0.008,
    sports: 0.010,
    ev: 0.015,
    exotic: 0.004,
  };
  
  const monthlyRate = monthlyDepreciationRates[segment] || 0.009;
  
  // Base depreciation
  let projectedValue = currentValue * Math.pow(1 - monthlyRate, monthsAhead);
  
  // Apply market momentum
  projectedValue *= Math.pow(1 + marketMomentum, monthsAhead);
  
  // Check for mileage cliffs in projection period
  const factors: string[] = [];
  for (const cliff of MILEAGE_CLIFFS) {
    if (currentMileage < cliff.threshold && projectedMileage >= cliff.threshold) {
      projectedValue *= (1 - cliff.dropPercent);
      factors.push(`Crosses ${cliff.threshold.toLocaleString()} mile threshold`);
    }
  }
  
  // Apply seasonality for target month
  const targetMonth = (new Date().getMonth() + monthsAhead) % 12;
  const { multiplier } = applySeasonality(projectedValue, segment, targetMonth);
  projectedValue *= multiplier;
  
  if (multiplier > 1.02) factors.push('Seasonal demand increase');
  if (multiplier < 0.98) factors.push('Seasonal demand decrease');
  
  const changeFromCurrent = projectedValue - currentValue;
  const changePercent = (changeFromCurrent / currentValue) * 100;
  
  return {
    estimated: Math.round(projectedValue),
    range: {
      low: Math.round(projectedValue * 0.92),
      high: Math.round(projectedValue * 1.08),
    },
    changeFromCurrent: Math.round(changeFromCurrent),
    changePercent: Math.round(changePercent * 10) / 10,
    projectedMileage: Math.round(projectedMileage),
    factors,
  };
}

/**
 * Find optimal sell window
 */
export function findOptimalSellWindow(
  currentValue: number,
  currentMileage: number,
  annualMileage: number,
  segment: string,
  marketMomentum: number = 0,
  loanBalance?: number,
  monthlyPayment?: number
): PredictionOutput['optimalSellWindow'] {
  const projections: { month: number; value: number; equity?: number }[] = [];
  
  // Project 24 months ahead
  for (let month = 0; month <= 24; month++) {
    const future = projectFutureValue(currentValue, currentMileage, annualMileage, segment, month, marketMomentum);
    
    let equity: number | undefined;
    if (loanBalance !== undefined && monthlyPayment !== undefined) {
      // Rough loan balance projection (simplified)
      const projectedBalance = Math.max(0, loanBalance - (monthlyPayment * 0.7 * month)); // ~70% goes to principal
      equity = future.estimated - projectedBalance;
    }
    
    projections.push({ month, value: future.estimated, equity });
  }
  
  // Find peak value (considering equity if available)
  let peakMonth = 0;
  let peakValue = projections[0].value;
  let peakMetric = loanBalance ? projections[0].equity! : projections[0].value;
  
  for (let i = 1; i < projections.length; i++) {
    const metric = loanBalance ? projections[i].equity! : projections[i].value;
    if (metric > peakMetric) {
      peakMetric = metric;
      peakMonth = i;
      peakValue = projections[i].value;
    }
  }
  
  // Find window where value is within 5% of peak
  let startMonth = peakMonth;
  let endMonth = peakMonth;
  
  for (let i = peakMonth - 1; i >= 0; i--) {
    if (projections[i].value >= peakValue * 0.95) {
      startMonth = i;
    } else break;
  }
  
  for (let i = peakMonth + 1; i < projections.length; i++) {
    if (projections[i].value >= peakValue * 0.95) {
      endMonth = i;
    } else break;
  }
  
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() + startMonth);
  
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + endMonth);
  
  const peakDate = new Date(now);
  peakDate.setMonth(peakDate.getMonth() + peakMonth);
  
  const value12Months = projections[12]?.value || currentValue * 0.85;
  const savingsVsWaiting12Months = peakValue - value12Months;
  
  let recommendation: string;
  if (peakMonth <= 1) {
    recommendation = 'Sell now for maximum value';
  } else if (peakMonth <= 3) {
    recommendation = `Optimal sale window: next ${peakMonth} months`;
  } else if (peakMonth <= 6) {
    recommendation = `Best to sell within ${startMonth}-${endMonth} months`;
  } else {
    recommendation = `Consider holding - value peaks in ${peakMonth} months`;
  }
  
  return {
    startDate,
    endDate,
    peakDate,
    peakValue,
    savingsVsWaiting12Months: Math.round(savingsVsWaiting12Months),
    recommendation,
  };
}

// ============================================================================
// EQUITY PROJECTION
// ============================================================================

/**
 * Calculate equity projection with finance data
 */
export function calculateEquityProjection(
  currentValue: number,
  loanBalance: number,
  monthlyPayment: number,
  interestRate: number,
  segment: string,
  annualMileage: number
): EquityProjection {
  const currentEquity = currentValue - loanBalance;
  
  // Monthly depreciation
  const monthlyDepreciationRates: Record<string, number> = {
    economy: 0.008, mainstream: 0.009, premium: 0.011, luxury: 0.013,
    truck: 0.006, suv: 0.008, sports: 0.010, ev: 0.015, exotic: 0.004,
  };
  const monthlyDepRate = monthlyDepreciationRates[segment] || 0.009;
  const monthlyDepreciation = currentValue * monthlyDepRate;
  
  // Monthly principal reduction (simplified amortization)
  const monthlyInterest = (loanBalance * (interestRate / 100)) / 12;
  const monthlyPrincipalReduction = monthlyPayment - monthlyInterest;
  
  // Check if depreciation outpaces principal reduction
  const isNegativeEquityRisk = monthlyDepreciation > monthlyPrincipalReduction;
  
  // Find when equity turns positive (if currently negative)
  let equityTurnsPositiveIn: number | undefined;
  let negativeEquityMonths: number | undefined;
  
  if (currentEquity < 0) {
    // Project forward to find break-even
    let projectedValue = currentValue;
    let projectedBalance = loanBalance;
    
    for (let month = 1; month <= 60; month++) {
      projectedValue *= (1 - monthlyDepRate);
      projectedBalance = Math.max(0, projectedBalance - monthlyPrincipalReduction);
      
      if (projectedValue >= projectedBalance) {
        equityTurnsPositiveIn = month;
        break;
      }
    }
  } else if (isNegativeEquityRisk) {
    // Find when equity turns negative
    let projectedValue = currentValue;
    let projectedBalance = loanBalance;
    
    for (let month = 1; month <= 60; month++) {
      projectedValue *= (1 - monthlyDepRate);
      projectedBalance = Math.max(0, projectedBalance - monthlyPrincipalReduction);
      
      if (projectedValue < projectedBalance) {
        negativeEquityMonths = month;
        break;
      }
    }
  }
  
  // Generate recommendation
  let recommendation: string;
  if (currentEquity >= 0 && !isNegativeEquityRisk) {
    recommendation = 'You have positive equity. Good position to sell or trade.';
  } else if (currentEquity >= 0 && isNegativeEquityRisk) {
    recommendation = `Warning: Depreciation ($${Math.round(monthlyDepreciation)}/mo) exceeds principal reduction ($${Math.round(monthlyPrincipalReduction)}/mo). Consider selling within ${negativeEquityMonths || 6} months.`;
  } else if (equityTurnsPositiveIn && equityTurnsPositiveIn <= 6) {
    recommendation = `Equity turns positive in ${equityTurnsPositiveIn} months. Consider waiting.`;
  } else if (equityTurnsPositiveIn) {
    recommendation = `Equity turns positive in ${equityTurnsPositiveIn} months. You may need to bring cash to close if selling now.`;
  } else {
    recommendation = 'Significant negative equity. Consider refinancing or accelerating payments.';
  }
  
  return {
    currentEquity: Math.round(currentEquity),
    equityTurnsPositiveIn,
    monthlyDepreciation: Math.round(monthlyDepreciation),
    monthlyPrincipalReduction: Math.round(monthlyPrincipalReduction),
    isNegativeEquityRisk,
    negativeEquityMonths,
    recommendation,
  };
}


// ============================================================================
// MODEL LIFECYCLE TRACKING
// ============================================================================

/**
 * Known model refresh cycles
 * When a new generation releases, old model values drop 4-12%
 */
export const MODEL_REFRESH_CYCLES: Record<string, { lastRefresh: number; cycleYears: number; nextExpected?: number }> = {
  // Toyota
  'toyota_camry': { lastRefresh: 2024, cycleYears: 5 },
  'toyota_rav4': { lastRefresh: 2024, cycleYears: 5, nextExpected: 2029 },
  'toyota_corolla': { lastRefresh: 2019, cycleYears: 6, nextExpected: 2025 },
  'toyota_highlander': { lastRefresh: 2020, cycleYears: 5, nextExpected: 2025 },
  'toyota_4runner': { lastRefresh: 2024, cycleYears: 10 },
  'toyota_tacoma': { lastRefresh: 2024, cycleYears: 8 },
  'toyota_tundra': { lastRefresh: 2022, cycleYears: 7 },
  
  // Honda
  'honda_civic': { lastRefresh: 2022, cycleYears: 5, nextExpected: 2027 },
  'honda_accord': { lastRefresh: 2023, cycleYears: 5, nextExpected: 2028 },
  'honda_cr-v': { lastRefresh: 2023, cycleYears: 5, nextExpected: 2028 },
  'honda_pilot': { lastRefresh: 2023, cycleYears: 5, nextExpected: 2028 },
  
  // Ford
  'ford_f-150': { lastRefresh: 2021, cycleYears: 6, nextExpected: 2027 },
  'ford_mustang': { lastRefresh: 2024, cycleYears: 6 },
  'ford_bronco': { lastRefresh: 2021, cycleYears: 7 },
  'ford_explorer': { lastRefresh: 2020, cycleYears: 6, nextExpected: 2026 },
  
  // Chevrolet
  'chevrolet_silverado': { lastRefresh: 2019, cycleYears: 6, nextExpected: 2025 },
  'chevrolet_tahoe': { lastRefresh: 2021, cycleYears: 6, nextExpected: 2027 },
  'chevrolet_corvette': { lastRefresh: 2020, cycleYears: 8 },
  
  // BMW
  'bmw_3 series': { lastRefresh: 2019, cycleYears: 7, nextExpected: 2026 },
  'bmw_5 series': { lastRefresh: 2024, cycleYears: 7 },
  'bmw_x3': { lastRefresh: 2024, cycleYears: 7 },
  'bmw_x5': { lastRefresh: 2019, cycleYears: 7, nextExpected: 2026 },
  
  // Mercedes
  'mercedes-benz_c-class': { lastRefresh: 2022, cycleYears: 7, nextExpected: 2029 },
  'mercedes-benz_e-class': { lastRefresh: 2024, cycleYears: 7 },
  'mercedes-benz_gle': { lastRefresh: 2020, cycleYears: 7, nextExpected: 2027 },
  
  // Tesla (frequent updates)
  'tesla_model 3': { lastRefresh: 2024, cycleYears: 4 },
  'tesla_model y': { lastRefresh: 2024, cycleYears: 4 },
  'tesla_model s': { lastRefresh: 2021, cycleYears: 4, nextExpected: 2025 },
  
  // Jeep
  'jeep_wrangler': { lastRefresh: 2018, cycleYears: 10, nextExpected: 2028 },
  'jeep_grand cherokee': { lastRefresh: 2022, cycleYears: 6, nextExpected: 2028 },
};

/**
 * Check for upcoming model refresh impact
 */
export function checkModelRefreshImpact(
  make: string,
  model: string,
  currentYear: number = new Date().getFullYear()
): { hasUpcomingRefresh: boolean; monthsUntil?: number; expectedImpact?: number; message?: string } {
  const key = `${make.toLowerCase()}_${model.toLowerCase()}`;
  const cycle = MODEL_REFRESH_CYCLES[key];
  
  if (!cycle) {
    return { hasUpcomingRefresh: false };
  }
  
  const nextRefresh = cycle.nextExpected || (cycle.lastRefresh + cycle.cycleYears);
  
  if (nextRefresh <= currentYear) {
    return { hasUpcomingRefresh: false };
  }
  
  const monthsUntil = (nextRefresh - currentYear) * 12;
  
  if (monthsUntil <= 18) {
    // Upcoming refresh within 18 months
    const expectedImpact = monthsUntil <= 6 ? 0.10 : monthsUntil <= 12 ? 0.07 : 0.04;
    
    return {
      hasUpcomingRefresh: true,
      monthsUntil,
      expectedImpact,
      message: `New ${nextRefresh} ${make} ${model} expected → your value may drop ~${Math.round(expectedImpact * 100)}% when announced`,
    };
  }
  
  return { hasUpcomingRefresh: false };
}

// ============================================================================
// REGIONAL ADJUSTMENTS
// ============================================================================

/**
 * Regional demand multipliers
 */
export const REGIONAL_ADJUSTMENTS: Record<string, Record<string, number>> = {
  // Trucks more valuable in rural/construction areas
  truck: {
    northeast: 0.95,
    southeast: 1.02,
    midwest: 1.05,
    southwest: 1.08,
    west: 1.00,
    pacific: 0.95,
  },
  // AWD SUVs more valuable in snow states
  suv_awd: {
    northeast: 1.08,
    southeast: 0.95,
    midwest: 1.10,
    southwest: 0.92,
    west: 1.02,
    pacific: 0.98,
  },
  // EVs more valuable in CA, less in rural areas
  ev: {
    northeast: 1.02,
    southeast: 0.92,
    midwest: 0.88,
    southwest: 0.95,
    west: 1.05,
    pacific: 1.12,
  },
  // Convertibles more valuable in warm climates
  convertible: {
    northeast: 0.90,
    southeast: 1.05,
    midwest: 0.88,
    southwest: 1.08,
    west: 1.10,
    pacific: 1.12,
  },
  default: {
    northeast: 1.00,
    southeast: 1.00,
    midwest: 0.98,
    southwest: 1.00,
    west: 1.02,
    pacific: 1.02,
  },
};

/**
 * Get regional adjustment
 */
export function getRegionalAdjustment(
  segment: string,
  region: string
): number {
  const segmentAdjustments = REGIONAL_ADJUSTMENTS[segment] || REGIONAL_ADJUSTMENTS.default;
  return segmentAdjustments[region] || 1.0;
}

// ============================================================================
// MAIN PREDICTION FUNCTION
// ============================================================================

/**
 * Generate complete vehicle prediction
 * This is the main entry point for the prediction engine
 */
export async function generatePrediction(
  vehicle: VehicleInput,
  listings: MarketListing[] = [],
  estimatedMSRP?: number
): Promise<PredictionOutput> {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const vehicleAge = currentYear - vehicle.year;
  
  // Detect segment
  const segment = detectVehicleSegment(vehicle.make, vehicle.model, vehicle.fuelType);
  
  // Get annual mileage estimate
  const annualMileage = vehicle.annualMileageEstimate || 12000;
  const expectedMileageForAge = vehicleAge * annualMileage;
  
  // Estimate MSRP if not provided
  const msrp = estimatedMSRP || estimateMSRP(vehicle.make, vehicle.model, vehicle.year, segment);
  
  // Calculate theoretical value
  let theoreticalValue = calculateBaseDepreciation(msrp, vehicleAge, segment);
  
  // Apply mileage cliffs
  const { adjustedValue: mileageAdjustedValue, cliffsApplied } = applyMileageCliffs(
    theoreticalValue,
    vehicle.currentMileage,
    expectedMileageForAge
  );
  theoreticalValue = mileageAdjustedValue;
  
  // Apply condition
  const conditionMultiplier = CONDITION_MULTIPLIERS[vehicle.condition || 'good'];
  theoreticalValue *= conditionMultiplier;
  
  // Apply regional adjustment
  const regionalMultiplier = getRegionalAdjustment(segment, vehicle.region || 'west');
  theoreticalValue *= regionalMultiplier;
  
  // Process listings
  const listingsData = processListings(listings);
  
  // Calculate blend weights
  const weights = calculateBlendWeights(segment, listings.length, true);
  
  // Blend theoretical with listings
  const blendedValue = blendValuation(
    theoreticalValue,
    listingsData,
    weights,
    vehicle.currentMileage
  );
  
  // Apply seasonality
  const { adjustedValue: seasonalValue, multiplier: seasonalMultiplier, message: seasonalMessage } = 
    applySeasonality(blendedValue, segment, currentMonth);
  
  // Get pricing tier
  const pricingTier = getPricingTier(seasonalValue);
  
  // Calculate confidence
  const confidence = calculateConfidence(
    listings.length,
    0, // Assume fresh data
    listings.some(l => l.trim === vehicle.trim)
  );
  
  // Current value output
  const currentValue = {
    estimated: Math.round(seasonalValue),
    tradeIn: Math.round(seasonalValue * pricingTier.tradeIn),
    privateParty: Math.round(seasonalValue * pricingTier.private),
    instant: Math.round(seasonalValue * pricingTier.instant),
    confidence,
    priceRange: {
      low: Math.round(seasonalValue * 0.90),
      high: Math.round(seasonalValue * 1.10),
    },
  };
  
  // Future value predictions
  const futureValues = {
    months3: projectFutureValue(currentValue.estimated, vehicle.currentMileage, annualMileage, segment, 3, listingsData.marketMomentum),
    months6: projectFutureValue(currentValue.estimated, vehicle.currentMileage, annualMileage, segment, 6, listingsData.marketMomentum),
    months12: projectFutureValue(currentValue.estimated, vehicle.currentMileage, annualMileage, segment, 12, listingsData.marketMomentum),
    months24: projectFutureValue(currentValue.estimated, vehicle.currentMileage, annualMileage, segment, 24, listingsData.marketMomentum),
  };
  
  // Optimal sell window
  const optimalSellWindow = findOptimalSellWindow(
    currentValue.estimated,
    vehicle.currentMileage,
    annualMileage,
    segment,
    listingsData.marketMomentum,
    vehicle.loanBalance,
    vehicle.monthlyPayment
  );
  
  // Mileage alerts
  const mileageAlerts: MileageAlert[] = [];
  const nextCliff = getNextMileageCliff(vehicle.currentMileage, annualMileage, currentValue.estimated);
  if (nextCliff) {
    mileageAlerts.push(nextCliff);
  }
  
  // Equity projection (if finance data provided)
  let equityProjection: EquityProjection | undefined;
  if (vehicle.loanBalance !== undefined && vehicle.monthlyPayment !== undefined && vehicle.interestRate !== undefined) {
    equityProjection = calculateEquityProjection(
      currentValue.estimated,
      vehicle.loanBalance,
      vehicle.monthlyPayment,
      vehicle.interestRate,
      segment,
      annualMileage
    );
  }
  
  // Market insights
  const modelRefresh = checkModelRefreshImpact(vehicle.make, vehicle.model);
  
  const marketInsights: MarketInsights = {
    similarListingsCount: listings.length,
    averageDaysOnMarket: listingsData.averageDaysOnMarket,
    priceCompetitiveness: determinePriceCompetitiveness(currentValue.estimated, listingsData),
    demandLevel: determineDemandLevel(listingsData.averageDaysOnMarket, listings.length),
    inventoryTrend: listingsData.marketMomentum > 0 ? 'decreasing' : listingsData.marketMomentum < 0 ? 'increasing' : 'stable',
    seasonalAdjustment: seasonalMultiplier,
    seasonalMessage,
    modelLifecycleImpact: modelRefresh.message,
    regionalDemand: regionalMultiplier,
  };
  
  return {
    currentValue,
    futureValues,
    optimalSellWindow,
    mileageAlerts,
    equityProjection,
    marketInsights,
    dataSources: {
      listingsCount: listings.length,
      listingsWeight: weights.listingsWeight,
      modelWeight: weights.modelWeight,
      lastUpdated: new Date(),
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Estimate MSRP based on make/model/year
 */
function estimateMSRP(make: string, model: string, year: number, segment: string): number {
  // Base MSRP estimates by segment
  const baseMSRP: Record<string, number> = {
    economy: 25000,
    mainstream: 32000,
    premium: 45000,
    luxury: 65000,
    truck: 48000,
    suv: 42000,
    sports: 45000,
    ev: 48000,
    exotic: 200000,
  };
  
  // Adjust for year (newer = higher MSRP due to inflation)
  const currentYear = new Date().getFullYear();
  const yearsOld = currentYear - year;
  const inflationAdjustment = Math.pow(1.03, yearsOld); // ~3% annual inflation
  
  const base = baseMSRP[segment] || 35000;
  return Math.round(base / inflationAdjustment);
}

/**
 * Determine price competitiveness
 */
function determinePriceCompetitiveness(
  estimatedValue: number,
  listingsData: ReturnType<typeof processListings>
): 'underpriced' | 'fair' | 'overpriced' {
  if (listingsData.averagePrice === 0) return 'fair';
  
  const ratio = estimatedValue / listingsData.averagePrice;
  
  if (ratio < 0.95) return 'underpriced';
  if (ratio > 1.05) return 'overpriced';
  return 'fair';
}

/**
 * Determine demand level
 */
function determineDemandLevel(
  avgDaysOnMarket: number,
  listingsCount: number
): 'high' | 'medium' | 'low' {
  if (avgDaysOnMarket < 25 || listingsCount < 5) return 'high';
  if (avgDaysOnMarket > 50 || listingsCount > 50) return 'low';
  return 'medium';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generatePrediction,
  detectVehicleSegment,
  calculateBaseDepreciation,
  applyMileageCliffs,
  getNextMileageCliff,
  applySeasonality,
  calculateBlendWeights,
  processListings,
  blendValuation,
  projectFutureValue,
  findOptimalSellWindow,
  calculateEquityProjection,
  checkModelRefreshImpact,
  getRegionalAdjustment,
  MILEAGE_CLIFFS,
  AGE_DEPRECIATION,
  SEASONALITY,
  MODEL_REFRESH_CYCLES,
};
