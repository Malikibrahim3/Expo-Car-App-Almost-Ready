/**
 * Advanced Valuation Service
 * 
 * This is the main entry point for vehicle valuations.
 * It orchestrates the prediction engine and market listings service
 * to provide comprehensive, accurate valuations.
 * 
 * Features:
 * - Blended theoretical + real-world valuations
 * - Future value predictions (3, 6, 12, 24 months)
 * - Optimal sell window calculation
 * - Mileage cliff alerts
 * - Equity projections
 * - Market insights
 */

import {
  generatePrediction,
  VehicleInput,
  PredictionOutput,
  detectVehicleSegment,
  MILEAGE_CLIFFS,
} from './predictionEngine';

import {
  getMarketListings,
  getMarketStats,
  getComparableListings,
  MarketStats,
} from './marketListingsService';

import { getVehicleValuation } from './valuationService';
import { supabase } from '../lib/supabaseClient';

// ============================================================================
// TYPES
// ============================================================================

export interface ValuationRequest {
  // Required
  make: string;
  model: string;
  year: number;
  mileage: number;
  
  // Optional - improves accuracy
  trim?: string;
  vin?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  zipCode?: string;
  fuelType?: 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'plugin_hybrid';
  drivetrain?: string;
  color?: string;
  
  // Usage estimates
  annualMileage?: number;
  
  // Finance data (for equity calculations)
  loanBalance?: number;
  monthlyPayment?: number;
  interestRate?: number;
  remainingPayments?: number;
  
  // Options
  includeListings?: boolean;
  includeHistory?: boolean;
}

export interface ValuationResponse {
  // Current Values
  currentValue: {
    estimated: number;
    tradeIn: number;
    privateParty: number;
    instant: number;
    confidence: 'high' | 'medium' | 'low';
    priceRange: { low: number; high: number };
  };
  
  // Future Predictions
  predictions: {
    months3: FuturePrediction;
    months6: FuturePrediction;
    months12: FuturePrediction;
    months24: FuturePrediction;
  };
  
  // Optimal Timing
  optimalSellWindow: {
    startDate: string;
    endDate: string;
    peakDate: string;
    peakValue: number;
    savingsVsWaiting: number;
    recommendation: string;
  };
  
  // Alerts
  alerts: Alert[];
  
  // Equity (if finance data provided)
  equity?: EquityInfo;
  
  // Market Context
  marketContext: {
    similarListings: number;
    avgDaysOnMarket: number;
    demandLevel: 'high' | 'medium' | 'low';
    priceCompetitiveness: 'underpriced' | 'fair' | 'overpriced';
    seasonalImpact: string | null;
    modelLifecycleImpact: string | null;
    regionalFactor: number;
  };
  
  // Comparable Listings (if requested)
  comparables?: ComparableListing[];
  
  // Metadata
  metadata: {
    valuationDate: string;
    dataFreshness: 'fresh' | 'cached';
    listingsUsed: number;
    blendRatio: { listings: number; model: number };
    segment: string;
  };
}

export interface FuturePrediction {
  value: number;
  range: { low: number; high: number };
  change: number;
  changePercent: number;
  projectedMileage: number;
  factors: string[];
}

export interface Alert {
  type: 'mileage_cliff' | 'equity_warning' | 'model_refresh' | 'seasonal' | 'market_trend';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  actionable: boolean;
  suggestedAction?: string;
}

export interface EquityInfo {
  currentEquity: number;
  status: 'positive' | 'negative' | 'breakeven';
  monthlyDepreciation: number;
  monthlyPrincipalReduction: number;
  equityTurnsPositiveIn?: number;
  isAtRisk: boolean;
  recommendation: string;
}

export interface ComparableListing {
  price: number;
  mileage: number;
  daysOnMarket: number;
  distance: number;
  trim?: string;
  dealerType: 'dealer' | 'private';
  priceVsEstimate: number; // percentage difference
}

// ============================================================================
// MAIN VALUATION FUNCTION
// ============================================================================

/**
 * Get comprehensive vehicle valuation
 * This is the main function to call for valuations
 */
export async function getAdvancedValuation(request: ValuationRequest): Promise<ValuationResponse> {
  console.log(`🚗 Starting advanced valuation for ${request.year} ${request.make} ${request.model}`);
  
  // Step 1: Fetch market listings
  const listingsResponse = await getMarketListings({
    make: request.make,
    model: request.model,
    year: request.year,
    trim: request.trim,
    zipCode: request.zipCode,
    radius: 150,
    maxResults: 50,
  });
  
  // Step 2: Build vehicle input for prediction engine
  const vehicleInput: VehicleInput = {
    year: request.year,
    make: request.make,
    model: request.model,
    trim: request.trim,
    currentMileage: request.mileage,
    condition: request.condition || 'good',
    fuelType: request.fuelType,
    drivetrain: request.drivetrain,
    zipCode: request.zipCode,
    annualMileageEstimate: request.annualMileage || 12000,
    loanBalance: request.loanBalance,
    monthlyPayment: request.monthlyPayment,
    interestRate: request.interestRate,
    vin: request.vin,
  };
  
  // Detect region from zip code
  if (request.zipCode) {
    vehicleInput.region = detectRegionFromZip(request.zipCode);
  }
  
  // Step 3: Get base valuation from existing service (for MSRP estimate)
  let baseMSRP: number | undefined;
  try {
    const baseValuation = await getVehicleValuation({
      make: request.make,
      model: request.model,
      year: request.year,
      trim: request.trim,
      mileage: request.mileage,
      condition: request.condition || 'good',
      color: request.color,
    });
    // Use the estimated value to back-calculate approximate MSRP
    const segment = detectVehicleSegment(request.make, request.model, request.fuelType);
    baseMSRP = estimateMSRPFromCurrentValue(baseValuation.estimatedValue, request.year, segment);
  } catch (error) {
    console.log('Base valuation unavailable, using estimates');
  }
  
  // Step 4: Generate prediction
  const prediction = await generatePrediction(
    vehicleInput,
    listingsResponse.listings,
    baseMSRP
  );
  
  // Step 5: Build alerts
  const alerts = buildAlerts(prediction, request);
  
  // Step 6: Build response
  const response: ValuationResponse = {
    currentValue: prediction.currentValue,
    
    predictions: {
      months3: formatFuturePrediction(prediction.futureValues.months3),
      months6: formatFuturePrediction(prediction.futureValues.months6),
      months12: formatFuturePrediction(prediction.futureValues.months12),
      months24: formatFuturePrediction(prediction.futureValues.months24),
    },
    
    optimalSellWindow: {
      startDate: prediction.optimalSellWindow.startDate.toISOString(),
      endDate: prediction.optimalSellWindow.endDate.toISOString(),
      peakDate: prediction.optimalSellWindow.peakDate.toISOString(),
      peakValue: prediction.optimalSellWindow.peakValue,
      savingsVsWaiting: prediction.optimalSellWindow.savingsVsWaiting12Months,
      recommendation: prediction.optimalSellWindow.recommendation,
    },
    
    alerts,
    
    marketContext: {
      similarListings: prediction.marketInsights.similarListingsCount,
      avgDaysOnMarket: prediction.marketInsights.averageDaysOnMarket,
      demandLevel: prediction.marketInsights.demandLevel,
      priceCompetitiveness: prediction.marketInsights.priceCompetitiveness,
      seasonalImpact: prediction.marketInsights.seasonalMessage || null,
      modelLifecycleImpact: prediction.marketInsights.modelLifecycleImpact || null,
      regionalFactor: prediction.marketInsights.regionalDemand,
    },
    
    metadata: {
      valuationDate: new Date().toISOString(),
      dataFreshness: listingsResponse.fromCache ? 'cached' : 'fresh',
      listingsUsed: listingsResponse.listings.length,
      blendRatio: {
        listings: prediction.dataSources.listingsWeight,
        model: prediction.dataSources.modelWeight,
      },
      segment: detectVehicleSegment(request.make, request.model, request.fuelType),
    },
  };
  
  // Add equity info if finance data provided
  if (prediction.equityProjection) {
    response.equity = {
      currentEquity: prediction.equityProjection.currentEquity,
      status: prediction.equityProjection.currentEquity > 200 ? 'positive' :
              prediction.equityProjection.currentEquity < -200 ? 'negative' : 'breakeven',
      monthlyDepreciation: prediction.equityProjection.monthlyDepreciation,
      monthlyPrincipalReduction: prediction.equityProjection.monthlyPrincipalReduction,
      equityTurnsPositiveIn: prediction.equityProjection.equityTurnsPositiveIn,
      isAtRisk: prediction.equityProjection.isNegativeEquityRisk,
      recommendation: prediction.equityProjection.recommendation,
    };
  }
  
  // Add comparables if requested
  if (request.includeListings && listingsResponse.listings.length > 0) {
    response.comparables = listingsResponse.listings.slice(0, 10).map(listing => ({
      price: listing.price,
      mileage: listing.mileage,
      daysOnMarket: listing.daysOnMarket,
      distance: listing.distance,
      trim: listing.trim,
      dealerType: listing.dealerType === 'private' ? 'private' : 'dealer',
      priceVsEstimate: Math.round(((listing.price - prediction.currentValue.estimated) / prediction.currentValue.estimated) * 100),
    }));
  }
  
  // Log valuation for analytics
  await logValuation(request, response);
  
  return response;
}

/**
 * Quick valuation without full market analysis
 * Faster but less accurate
 */
export async function getQuickValuation(
  make: string,
  model: string,
  year: number,
  mileage: number,
  condition: 'excellent' | 'good' | 'fair' | 'poor' = 'good'
): Promise<{
  estimated: number;
  tradeIn: number;
  privateParty: number;
  confidence: 'high' | 'medium' | 'low';
}> {
  try {
    const valuation = await getVehicleValuation({
      make,
      model,
      year,
      mileage,
      condition,
    });
    
    return {
      estimated: valuation.estimatedValue,
      tradeIn: valuation.tradeInValue,
      privateParty: valuation.privatePartyValue,
      confidence: valuation.confidence as 'high' | 'medium' | 'low',
    };
  } catch (error) {
    // Fallback to basic depreciation
    const segment = detectVehicleSegment(make, model);
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    // Basic depreciation estimate
    const baseMSRP = 35000;
    const depreciation = Math.pow(0.85, Math.min(age, 1)) * Math.pow(0.90, Math.max(0, age - 1));
    const mileageAdjustment = 1 - ((mileage - (age * 12000)) * 0.00001);
    const conditionMultiplier = { excellent: 1.08, good: 1.0, fair: 0.90, poor: 0.75 }[condition];
    
    const estimated = Math.round(baseMSRP * depreciation * mileageAdjustment * conditionMultiplier);
    
    return {
      estimated,
      tradeIn: Math.round(estimated * 0.85),
      privateParty: Math.round(estimated * 1.08),
      confidence: 'low',
    };
  }
}

/**
 * Get depreciation forecast for a vehicle
 */
export async function getDepreciationForecast(
  make: string,
  model: string,
  year: number,
  currentMileage: number,
  annualMileage: number = 12000
): Promise<{
  monthly: { month: number; value: number; mileage: number }[];
  totalDepreciation12Months: number;
  depreciationRate: number;
  mileageCliffs: { threshold: number; monthsUntil: number; impact: number }[];
}> {
  const segment = detectVehicleSegment(make, model);
  
  // Get current value
  const { estimated: currentValue } = await getQuickValuation(make, model, year, currentMileage);
  
  // Generate monthly projections
  const monthly: { month: number; value: number; mileage: number }[] = [];
  const monthlyMileage = annualMileage / 12;
  
  // Monthly depreciation rates by segment
  const monthlyRates: Record<string, number> = {
    economy: 0.008, mainstream: 0.009, premium: 0.011, luxury: 0.013,
    truck: 0.006, suv: 0.008, sports: 0.010, ev: 0.015, exotic: 0.004,
  };
  const monthlyRate = monthlyRates[segment] || 0.009;
  
  let projectedValue = currentValue;
  let projectedMileage = currentMileage;
  
  for (let month = 0; month <= 24; month++) {
    monthly.push({
      month,
      value: Math.round(projectedValue),
      mileage: Math.round(projectedMileage),
    });
    
    // Apply depreciation
    projectedValue *= (1 - monthlyRate);
    projectedMileage += monthlyMileage;
    
    // Check for mileage cliffs
    for (const cliff of MILEAGE_CLIFFS) {
      if (projectedMileage >= cliff.threshold && projectedMileage - monthlyMileage < cliff.threshold) {
        projectedValue *= (1 - cliff.dropPercent);
      }
    }
  }
  
  // Calculate upcoming mileage cliffs
  const mileageCliffs = MILEAGE_CLIFFS
    .filter(cliff => currentMileage < cliff.threshold)
    .map(cliff => ({
      threshold: cliff.threshold,
      monthsUntil: Math.round((cliff.threshold - currentMileage) / monthlyMileage),
      impact: Math.round(currentValue * cliff.dropPercent),
    }))
    .slice(0, 3);
  
  const value12Months = monthly[12]?.value || currentValue * 0.9;
  
  return {
    monthly,
    totalDepreciation12Months: currentValue - value12Months,
    depreciationRate: monthlyRate * 12 * 100, // Annual percentage
    mileageCliffs,
  };
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect region from ZIP code
 */
function detectRegionFromZip(zipCode: string): 'northeast' | 'southeast' | 'midwest' | 'southwest' | 'west' | 'pacific' {
  const zip = parseInt(zipCode.substring(0, 3));
  
  // Northeast: 010-149 (New England, NY, NJ, PA)
  if (zip >= 10 && zip <= 149) return 'northeast';
  
  // Southeast: 200-399 (DC, VA, NC, SC, GA, FL, AL, MS, TN, KY)
  if (zip >= 200 && zip <= 399) return 'southeast';
  
  // Midwest: 400-599 (OH, IN, MI, IL, WI, MN, IA, MO, ND, SD, NE, KS)
  if (zip >= 400 && zip <= 599) return 'midwest';
  
  // Southwest: 700-799, 850-865 (TX, OK, AR, LA, AZ, NM)
  if ((zip >= 700 && zip <= 799) || (zip >= 850 && zip <= 865)) return 'southwest';
  
  // Pacific: 900-999 (CA, OR, WA, AK, HI)
  if (zip >= 900 && zip <= 999) return 'pacific';
  
  // West: 800-849, 866-899 (CO, WY, MT, ID, UT, NV)
  if ((zip >= 800 && zip <= 849) || (zip >= 866 && zip <= 899)) return 'west';
  
  return 'west'; // Default
}

/**
 * Estimate MSRP from current value
 */
function estimateMSRPFromCurrentValue(currentValue: number, year: number, segment: string): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  
  // Reverse the depreciation to estimate original MSRP
  const depreciationCurves: Record<string, number[]> = {
    economy: [1.0, 0.80, 0.72, 0.65, 0.59, 0.54, 0.50],
    mainstream: [1.0, 0.82, 0.74, 0.67, 0.61, 0.56, 0.52],
    premium: [1.0, 0.78, 0.68, 0.60, 0.53, 0.47, 0.43],
    luxury: [1.0, 0.75, 0.63, 0.54, 0.47, 0.41, 0.37],
    truck: [1.0, 0.88, 0.82, 0.76, 0.71, 0.67, 0.63],
    suv: [1.0, 0.85, 0.78, 0.72, 0.66, 0.61, 0.57],
    ev: [1.0, 0.70, 0.58, 0.49, 0.42, 0.37, 0.33],
    exotic: [1.0, 0.92, 0.88, 0.85, 0.83, 0.82, 0.81],
  };
  
  const curve = depreciationCurves[segment] || depreciationCurves.mainstream;
  const depreciationFactor = curve[Math.min(age, curve.length - 1)];
  
  return Math.round(currentValue / depreciationFactor);
}

/**
 * Format future prediction for response
 */
function formatFuturePrediction(prediction: any): FuturePrediction {
  return {
    value: prediction.estimated,
    range: prediction.range,
    change: prediction.changeFromCurrent,
    changePercent: prediction.changePercent,
    projectedMileage: prediction.projectedMileage,
    factors: prediction.factors,
  };
}

/**
 * Build alerts from prediction data
 */
function buildAlerts(prediction: PredictionOutput, request: ValuationRequest): Alert[] {
  const alerts: Alert[] = [];
  
  // Mileage cliff alerts
  for (const mileageAlert of prediction.mileageAlerts) {
    if (mileageAlert.monthsUntil <= 6) {
      alerts.push({
        type: 'mileage_cliff',
        severity: mileageAlert.monthsUntil <= 2 ? 'urgent' : 'warning',
        title: `Approaching ${mileageAlert.threshold.toLocaleString()} miles`,
        message: mileageAlert.message,
        actionable: true,
        suggestedAction: mileageAlert.monthsUntil <= 2 
          ? 'Consider selling before crossing this threshold'
          : 'Plan your sale timing around this milestone',
      });
    }
  }
  
  // Equity warnings
  if (prediction.equityProjection) {
    if (prediction.equityProjection.isNegativeEquityRisk) {
      alerts.push({
        type: 'equity_warning',
        severity: 'warning',
        title: 'Negative Equity Risk',
        message: `Your depreciation ($${prediction.equityProjection.monthlyDepreciation}/mo) exceeds principal reduction ($${prediction.equityProjection.monthlyPrincipalReduction}/mo)`,
        actionable: true,
        suggestedAction: 'Consider selling soon or making extra payments',
      });
    }
    
    if (prediction.equityProjection.currentEquity < -2000) {
      alerts.push({
        type: 'equity_warning',
        severity: 'urgent',
        title: 'Significant Negative Equity',
        message: `You're currently $${Math.abs(prediction.equityProjection.currentEquity).toLocaleString()} underwater`,
        actionable: true,
        suggestedAction: prediction.equityProjection.equityTurnsPositiveIn 
          ? `Wait ${prediction.equityProjection.equityTurnsPositiveIn} months for equity to turn positive`
          : 'Consider refinancing or gap insurance',
      });
    }
  }
  
  // Model refresh alerts
  if (prediction.marketInsights.modelLifecycleImpact) {
    alerts.push({
      type: 'model_refresh',
      severity: 'info',
      title: 'Model Refresh Coming',
      message: prediction.marketInsights.modelLifecycleImpact,
      actionable: true,
      suggestedAction: 'Consider selling before the new model announcement',
    });
  }
  
  // Seasonal alerts
  if (prediction.marketInsights.seasonalMessage) {
    const isPositive = prediction.marketInsights.seasonalAdjustment > 1;
    alerts.push({
      type: 'seasonal',
      severity: 'info',
      title: isPositive ? 'Seasonal Demand Increase' : 'Seasonal Demand Decrease',
      message: prediction.marketInsights.seasonalMessage,
      actionable: isPositive,
      suggestedAction: isPositive ? 'Good time to sell - demand is higher' : undefined,
    });
  }
  
  // Market trend alerts
  if (prediction.marketInsights.demandLevel === 'high' && prediction.marketInsights.similarListingsCount < 10) {
    alerts.push({
      type: 'market_trend',
      severity: 'info',
      title: 'Low Inventory, High Demand',
      message: `Only ${prediction.marketInsights.similarListingsCount} similar vehicles available nearby`,
      actionable: true,
      suggestedAction: 'You can price at the higher end of the range',
    });
  }
  
  return alerts;
}

/**
 * Log valuation for analytics
 */
async function logValuation(request: ValuationRequest, response: ValuationResponse): Promise<void> {
  try {
    await supabase
      .from('valuation_log')
      .insert({
        make: request.make,
        model: request.model,
        year: request.year,
        mileage: request.mileage,
        trim: request.trim,
        zip_code: request.zipCode,
        estimated_value: response.currentValue.estimated,
        trade_in_value: response.currentValue.tradeIn,
        confidence: response.currentValue.confidence,
        listings_used: response.metadata.listingsUsed,
        segment: response.metadata.segment,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    // Silent fail - logging shouldn't break valuation
    console.error('Error logging valuation:', error);
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get valuations for multiple vehicles
 */
export async function getBatchValuations(
  vehicles: ValuationRequest[]
): Promise<Map<string, ValuationResponse>> {
  const results = new Map<string, ValuationResponse>();
  
  // Process in parallel with concurrency limit
  const batchSize = 3;
  for (let i = 0; i < vehicles.length; i += batchSize) {
    const batch = vehicles.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (vehicle) => {
        const key = `${vehicle.year}_${vehicle.make}_${vehicle.model}_${vehicle.mileage}`;
        try {
          const valuation = await getAdvancedValuation(vehicle);
          return { key, valuation };
        } catch (error) {
          console.error(`Error valuating ${key}:`, error);
          return { key, valuation: null };
        }
      })
    );
    
    for (const { key, valuation } of batchResults) {
      if (valuation) {
        results.set(key, valuation);
      }
    }
  }
  
  return results;
}

/**
 * Compare two vehicles
 */
export async function compareVehicles(
  vehicle1: ValuationRequest,
  vehicle2: ValuationRequest
): Promise<{
  vehicle1: ValuationResponse;
  vehicle2: ValuationResponse;
  comparison: {
    valueDifference: number;
    depreciationComparison: string;
    betterHold: 'vehicle1' | 'vehicle2';
    recommendation: string;
  };
}> {
  const [val1, val2] = await Promise.all([
    getAdvancedValuation(vehicle1),
    getAdvancedValuation(vehicle2),
  ]);
  
  const dep1 = val1.currentValue.estimated - val1.predictions.months12.value;
  const dep2 = val2.currentValue.estimated - val2.predictions.months12.value;
  
  const depRate1 = (dep1 / val1.currentValue.estimated) * 100;
  const depRate2 = (dep2 / val2.currentValue.estimated) * 100;
  
  return {
    vehicle1: val1,
    vehicle2: val2,
    comparison: {
      valueDifference: val1.currentValue.estimated - val2.currentValue.estimated,
      depreciationComparison: `${vehicle1.make} ${vehicle1.model}: ${depRate1.toFixed(1)}%/yr vs ${vehicle2.make} ${vehicle2.model}: ${depRate2.toFixed(1)}%/yr`,
      betterHold: depRate1 < depRate2 ? 'vehicle1' : 'vehicle2',
      recommendation: depRate1 < depRate2 
        ? `The ${vehicle1.make} ${vehicle1.model} holds value better`
        : `The ${vehicle2.make} ${vehicle2.model} holds value better`,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getAdvancedValuation,
  getQuickValuation,
  getDepreciationForecast,
  getBatchValuations,
  compareVehicles,
};
