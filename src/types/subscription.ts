/**
 * Subscription & Refresh Management Types
 * 
 * Implements the hybrid refresh strategy:
 * - Free: Weekly auto-updates, 1 manual refresh per 7 days, 1 car only
 * - Pro: Daily updates for up to 10 cars, weekly for rest, 1 manual refresh per day, unlimited cars
 */

// ============================================================================
// PLAN TYPES
// ============================================================================

export type PlanType = 'free' | 'pro';
export type RefreshTier = 'daily' | 'weekly';
export type RefreshType = 'auto_weekly' | 'auto_daily' | 'manual' | 'market_shift';

// ============================================================================
// SUBSCRIPTION
// ============================================================================

export interface UserSubscription {
  id: string;
  userId: string;
  planType: PlanType;
  
  // Plan limits
  maxVehicles: number; // -1 for unlimited (Pro)
  dailyRefreshVehicles: number; // Pro: 10, Free: 0
  manualRefreshIntervalDays: number; // Pro: 1, Free: 7
  
  // Stripe billing integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingCycleStart?: Date;
  billingCycleEnd?: Date;
  cancelAtPeriodEnd?: boolean; // True if user canceled but still has access until period ends
  
  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimits {
  maxVehicles: number;
  dailyRefreshVehicles: number;
  manualRefreshIntervalDays: number;
  features: PlanFeature[];
}

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number | string;
}

// ============================================================================
// PLAN DEFINITIONS
// ============================================================================

export const PLAN_DEFINITIONS: Record<PlanType, PlanLimits> = {
  free: {
    maxVehicles: 1,
    dailyRefreshVehicles: 0,
    manualRefreshIntervalDays: 7,
    features: [
      { name: 'Automatic weekly updates', included: true },
      { name: 'Manual refresh', included: true, limit: '1 per week' },
      { name: 'Basic equity alerts', included: true },
      { name: 'Track vehicles', included: true, limit: '1 car' },
      { name: 'Daily updates', included: false },
      { name: 'Priority refresh queue', included: false },
      { name: 'Market shift alerts', included: false },
    ],
  },
  pro: {
    maxVehicles: -1, // Unlimited
    dailyRefreshVehicles: 10,
    manualRefreshIntervalDays: 1,
    features: [
      { name: 'Unlimited vehicles', included: true },
      { name: 'Daily updates', included: true, limit: 'Up to 10 cars' },
      { name: 'Weekly updates', included: true, limit: 'All additional cars' },
      { name: 'Manual refresh', included: true, limit: '1 per day (any car)' },
      { name: 'Priority refresh queue', included: true },
      { name: 'Advanced equity alerts', included: true },
      { name: 'Market shift alerts', included: true },
      { name: 'Export data', included: true },
    ],
  },
};

// ============================================================================
// REFRESH TRACKING
// ============================================================================

export interface VehicleRefreshTracking {
  id: string;
  vehicleId: string;
  userId: string;
  
  // Refresh schedule
  refreshTier: RefreshTier;
  priorityQueue: boolean;
  
  // Timestamps
  lastAutoRefresh?: Date;
  lastManualRefresh?: Date;
  nextScheduledRefresh?: Date;
  
  // Value tracking for market shift detection
  lastValue?: number;
  previousValue?: number;
  valueChangePercent?: number;
  
  // Manual refresh limits
  manualRefreshesUsed: number;
  manualRefreshResetAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshHistory {
  id: string;
  vehicleId: string;
  userId: string;
  
  refreshType: RefreshType;
  triggerReason?: string;
  
  valueBefore?: number;
  valueAfter?: number;
  changeAmount?: number;
  changePercent?: number;
  
  apiCallsUsed: number;
  createdAt: Date;
}

// ============================================================================
// MARKET SHIFT ALERTS
// ============================================================================

export interface MarketShiftAlert {
  id: string;
  
  // Vehicle identification
  make?: string;
  model?: string;
  yearStart?: number;
  yearEnd?: number;
  segment?: string;
  
  // Shift details
  shiftPercent: number;
  shiftDirection: 'up' | 'down';
  detectedAt: Date;
  
  // Status
  isActive: boolean;
  affectedVehiclesCount: number;
  refreshesTriggered: number;
  
  source?: string;
  notes?: string;
  
  createdAt: Date;
  expiresAt: Date;
}

// ============================================================================
// REFRESH STATUS & ELIGIBILITY
// ============================================================================

export interface RefreshEligibility {
  canRefresh: boolean;
  reason?: string;
  nextAvailableAt?: Date;
  hoursUntilAvailable?: number;
}

export interface RefreshStatus {
  vehicleId: string;
  
  // Current state
  lastRefreshAt?: Date;
  lastRefreshType?: RefreshType;
  nextScheduledAt?: Date;
  
  // Eligibility
  manualRefreshEligibility: RefreshEligibility;
  
  // Value changes
  currentValue?: number;
  valueAtLastRefresh?: number;
  changePercent?: number;
  
  // Market shift
  hasActiveMarketShift: boolean;
  marketShiftDetails?: MarketShiftAlert;
}

export interface UserRefreshSummary {
  planType: PlanType;
  
  // Vehicle counts
  totalVehicles: number;
  dailyRefreshVehicles: number;
  weeklyRefreshVehicles: number;
  
  // Refresh status
  vehiclesDueForRefresh: number;
  lastGlobalRefresh?: Date;
  
  // Manual refresh
  manualRefreshesAvailable: number;
  manualRefreshResetAt?: Date;
  
  // Market shifts
  activeMarketShifts: number;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface SubscriptionResponse {
  subscription: UserSubscription;
  limits: PlanLimits;
  usage: {
    vehiclesUsed: number;
    vehiclesRemaining: number;
    dailyRefreshSlotsUsed: number;
    dailyRefreshSlotsRemaining: number;
  };
}

export interface RefreshResponse {
  success: boolean;
  refreshType: RefreshType;
  vehicleId: string;
  
  valueBefore?: number;
  valueAfter?: number;
  changePercent?: number;
  
  nextRefreshAvailable?: Date;
  message?: string;
}

// ============================================================================
// MARKET SHIFT THRESHOLDS
// ============================================================================

export const MARKET_SHIFT_THRESHOLDS = {
  // Minimum percent change to trigger a market shift alert
  minShiftPercent: 1.5, // ±1.5%
  
  // Maximum percent change before it's considered an anomaly
  maxShiftPercent: 10, // ±10%
  
  // How long a market shift alert stays active
  alertDurationDays: 7,
  
  // Minimum sample size to detect a shift
  minSampleSize: 10,
};
