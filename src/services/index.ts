/**
 * Services Index
 * 
 * Central export point for all services
 */

// Prediction Engine - Core forecasting logic
export {
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
} from './predictionEngine';

export type {
  VehicleInput,
  MarketListing,
  PredictionOutput,
  FutureValue,
  MileageAlert,
  EquityProjection,
  MarketInsights,
} from './predictionEngine';

// Market Listings Service - Real-world data fetching
export {
  getMarketListings,
  getMarketStats,
  getComparableListings,
  getRegionalPriceVariations,
  recordPriceSnapshot,
} from './marketListingsService';

export type {
  ListingsSearchParams,
  ListingsResponse,
  MarketStats,
  PriceHistory,
} from './marketListingsService';

// Advanced Valuation Service - Main entry point
export {
  getAdvancedValuation,
  getQuickValuation,
  getDepreciationForecast,
  getBatchValuations,
  compareVehicles,
} from './advancedValuationService';

export type {
  ValuationRequest,
  ValuationResponse,
  FuturePrediction,
  Alert,
  EquityInfo,
  ComparableListing,
} from './advancedValuationService';

// Subscription Service - Plan management
export {
  getUserSubscription,
  createDefaultSubscription,
  upgradeToPro,
  cancelSubscription,
  downgradeToFree, // Alias for cancelSubscription
  getPlanLimits,
  canAddVehicle,
  getSubscriptionWithUsage,
  setVehicleRefreshTier,
} from './subscriptionService';

// Refresh Scheduler Service - Hybrid refresh strategy
export {
  checkManualRefreshEligibility,
  getVehicleRefreshStatus,
  getUserRefreshSummary,
  performManualRefresh,
  performScheduledRefreshes,
  getActiveMarketShifts,
  triggerMarketShiftRefresh,
  initializeVehicleTracking,
  removeVehicleTracking,
} from './refreshSchedulerService';

// Legacy services (still available)
export { getVehicleValuation, getQuickEstimate } from './valuationService';
export { getMakes, getModels, getTrims, getYears } from './vehicleDataService';
