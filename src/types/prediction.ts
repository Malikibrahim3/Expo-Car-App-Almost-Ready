/**
 * Prediction Engine Types
 * 
 * Type definitions for the advanced vehicle prediction system
 */

// ============================================================================
// VEHICLE INPUT TYPES
// ============================================================================

export interface VehicleIdentity {
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  engine?: string;
  drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD';
  fuelType?: FuelType;
  bodyType?: BodyType;
  packages?: string[];
}

export type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'plugin_hybrid';
export type BodyType = 'sedan' | 'coupe' | 'hatchback' | 'suv' | 'crossover' | 'truck' | 'van' | 'wagon' | 'convertible';
export type VehicleSegment = 'economy' | 'mainstream' | 'premium' | 'luxury' | 'truck' | 'suv' | 'sports' | 'ev' | 'exotic';
export type Condition = 'excellent' | 'good' | 'fair' | 'poor';
export type Region = 'northeast' | 'southeast' | 'midwest' | 'southwest' | 'west' | 'pacific';

export interface VehicleUsage {
  currentMileage: number;
  annualMileageEstimate?: number;
  serviceHistory?: 'full' | 'partial' | 'none';
  numberOfOwners?: number;
  accidentHistory?: boolean;
  condition?: Condition;
}

export interface VehicleLocation {
  zipCode?: string;
  region?: Region;
  isUrban?: boolean;
}

export interface VehicleFinance {
  loanBalance?: number;
  interestRate?: number;
  monthlyPayment?: number;
  remainingPayments?: number;
  financeType?: 'loan' | 'lease' | 'pcp' | 'hp' | 'cash';
  balloonPayment?: number;
}

// ============================================================================
// PREDICTION OUTPUT TYPES
// ============================================================================

export interface CurrentValuation {
  estimated: number;
  tradeIn: number;
  privateParty: number;
  instant: number;
  confidence: 'high' | 'medium' | 'low';
  priceRange: PriceRange;
}

export interface PriceRange {
  low: number;
  high: number;
  median?: number;
}

export interface FutureValuePrediction {
  estimated: number;
  range: PriceRange;
  changeFromCurrent: number;
  changePercent: number;
  projectedMileage: number;
  factors: string[];
  date: Date;
}

export interface OptimalSellWindow {
  startDate: Date;
  endDate: Date;
  peakDate: Date;
  peakValue: number;
  savingsVsWaiting12Months: number;
  recommendation: string;
  isCurrentlyOptimal: boolean;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertType = 'mileage_cliff' | 'equity_warning' | 'model_refresh' | 'seasonal' | 'market_trend' | 'price_drop';
export type AlertSeverity = 'info' | 'warning' | 'urgent';

export interface PredictionAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionable: boolean;
  suggestedAction?: string;
  expiresAt?: Date;
}

export interface MileageCliffAlert extends PredictionAlert {
  type: 'mileage_cliff';
  threshold: number;
  monthsUntil: number;
  expectedValueDrop: number;
  dropPercent: number;
}

// ============================================================================
// EQUITY TYPES
// ============================================================================

export type EquityStatus = 'positive' | 'negative' | 'breakeven';

export interface EquityProjection {
  currentEquity: number;
  status: EquityStatus;
  monthlyDepreciation: number;
  monthlyPrincipalReduction: number;
  equityTurnsPositiveIn?: number;
  negativeEquityMonths?: number;
  isAtRisk: boolean;
  recommendation: string;
  projections: EquityDataPoint[];
}

export interface EquityDataPoint {
  month: number;
  vehicleValue: number;
  loanBalance: number;
  equity: number;
}

// ============================================================================
// MARKET INSIGHT TYPES
// ============================================================================

export type DemandLevel = 'high' | 'medium' | 'low';
export type PriceCompetitiveness = 'underpriced' | 'fair' | 'overpriced';
export type InventoryTrend = 'increasing' | 'stable' | 'decreasing';
export type MarketTrend = 'rising' | 'stable' | 'falling';

export interface MarketInsights {
  similarListingsCount: number;
  averageDaysOnMarket: number;
  demandLevel: DemandLevel;
  priceCompetitiveness: PriceCompetitiveness;
  inventoryTrend: InventoryTrend;
  marketTrend: MarketTrend;
  seasonalAdjustment: number;
  seasonalMessage?: string;
  modelLifecycleImpact?: string;
  regionalDemand: number;
  supplyScore: number; // 0-100, higher = more supply
  demandScore: number; // 0-100, higher = more demand
}

// ============================================================================
// LISTING TYPES
// ============================================================================

export interface MarketListing {
  id?: string;
  price: number;
  mileage: number;
  daysOnMarket: number;
  dealerType: 'dealer' | 'private' | 'auction';
  distance: number;
  condition?: string;
  trim?: string;
  year: number;
  source: string;
  url?: string;
  photos?: string[];
  features?: string[];
}

export interface ComparableListing extends MarketListing {
  priceVsEstimate: number;
  mileageVsTarget: number;
  matchScore: number; // 0-100
}

// ============================================================================
// DEPRECIATION TYPES
// ============================================================================

export interface DepreciationCurve {
  segment: VehicleSegment;
  yearlyRates: number[];
  monthlyRate: number;
  driveOffRate: number;
}

export interface MileageCliff {
  threshold: number;
  dropPercent: number;
  label: string;
  description?: string;
}

export interface SeasonalityFactor {
  month: number;
  multiplier: number;
  description?: string;
}

// ============================================================================
// MODEL LIFECYCLE TYPES
// ============================================================================

export interface ModelRefreshCycle {
  make: string;
  model: string;
  lastRefreshYear: number;
  cycleYears: number;
  nextExpectedYear?: number;
  refreshType: 'full' | 'facelift' | 'minor';
  impactPercent: number;
}

// ============================================================================
// FULL PREDICTION RESPONSE
// ============================================================================

export interface PredictionResponse {
  currentValue: CurrentValuation;
  
  futureValues: {
    months3: FutureValuePrediction;
    months6: FutureValuePrediction;
    months12: FutureValuePrediction;
    months24: FutureValuePrediction;
  };
  
  optimalSellWindow: OptimalSellWindow;
  alerts: PredictionAlert[];
  equityProjection?: EquityProjection;
  marketInsights: MarketInsights;
  comparables?: ComparableListing[];
  
  metadata: {
    valuationDate: Date;
    dataFreshness: 'fresh' | 'cached';
    listingsUsed: number;
    blendRatio: { listings: number; model: number };
    segment: VehicleSegment;
    confidence: 'high' | 'medium' | 'low';
  };
}

// ============================================================================
// CHART DATA TYPES
// ============================================================================

export interface DepreciationChartData {
  labels: string[];
  values: number[];
  mileages: number[];
  cliffs: { month: number; label: string }[];
}

export interface EquityChartData {
  labels: string[];
  vehicleValues: number[];
  loanBalances: number[];
  equityValues: number[];
  breakEvenMonth?: number;
}

export interface SeasonalityChartData {
  months: string[];
  multipliers: number[];
  currentMonth: number;
}
