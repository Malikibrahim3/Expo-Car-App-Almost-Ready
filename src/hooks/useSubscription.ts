/**
 * useSubscription Hook
 * 
 * React hook for managing subscription state and refresh operations.
 * Wraps the SubscriptionContext for backward compatibility.
 */

import { useCallback } from 'react';
import { useSubscriptionContext, FeatureKey } from '../context/SubscriptionContext';
import {
  PlanLimits,
  RefreshResponse,
  PLAN_DEFINITIONS,
} from '../types/subscription';

// Re-export the context hook as the main hook
export { useSubscriptionContext as useSubscription };

// Re-export FeatureKey type
export type { FeatureKey };

/**
 * Hook for plan comparison/upgrade prompts
 */
export function usePlanComparison() {
  return {
    free: PLAN_DEFINITIONS.free,
    pro: PLAN_DEFINITIONS.pro,
    
    getFeatureDiff: () => {
      const freeFeatures = PLAN_DEFINITIONS.free.features;
      const proFeatures = PLAN_DEFINITIONS.pro.features;
      
      return proFeatures.filter(pf => {
        const freeVersion = freeFeatures.find(ff => ff.name === pf.name);
        return !freeVersion || !freeVersion.included || freeVersion.limit !== pf.limit;
      });
    },
  };
}

/**
 * Hook for feature gating
 */
export function useFeatureGate(feature: FeatureKey) {
  const { canUseFeature, getFeatureLimit, isPro, isFree, isDemoMode, toggleDemoPlan, upgrade } = useSubscriptionContext();
  
  return {
    hasAccess: canUseFeature(feature),
    limit: getFeatureLimit(feature),
    isPro,
    isFree,
    isDemoMode,
    toggleDemoPlan,
    upgrade,
  };
}

/**
 * Hook for vehicle limits
 */
export function useVehicleLimits() {
  const { 
    usage, 
    subscription, 
    canAddMoreVehicles, 
    checkCanAddVehicle,
    isPro,
    isDemoMode,
  } = useSubscriptionContext();
  
  return {
    vehiclesUsed: usage?.vehiclesUsed || 0,
    vehiclesRemaining: usage?.vehiclesRemaining || 0,
    maxVehicles: subscription?.maxVehicles || 2,
    isUnlimited: subscription?.maxVehicles === -1,
    canAddMore: canAddMoreVehicles,
    checkCanAdd: checkCanAddVehicle,
    isPro,
    isDemoMode,
  };
}

/**
 * Hook for refresh limits
 */
export function useRefreshLimits() {
  const {
    refreshSummary,
    subscription,
    checkRefreshEligibility,
    isPro,
    isDemoMode,
  } = useSubscriptionContext();
  
  return {
    manualRefreshesAvailable: refreshSummary?.manualRefreshesAvailable || 0,
    manualRefreshResetAt: refreshSummary?.manualRefreshResetAt,
    refreshInterval: subscription?.manualRefreshIntervalDays || 7,
    dailyRefreshSlots: subscription?.dailyRefreshVehicles || 0,
    checkEligibility: checkRefreshEligibility,
    isPro,
    isDemoMode,
  };
}

/**
 * Hook for market shift alerts
 */
export function useMarketShifts() {
  const { marketShifts, isPro, canUseFeature } = useSubscriptionContext();
  
  return {
    shifts: marketShifts,
    hasAccess: canUseFeature('market_shift_alerts'),
    count: marketShifts.length,
    isPro,
  };
}

/**
 * Hook for demo mode controls
 */
export function useDemoMode() {
  const { 
    isDemoMode, 
    demoPlanType, 
    setDemoPlanType, 
    toggleDemoPlan,
    isPro,
    isFree,
  } = useSubscriptionContext();
  
  return {
    isDemoMode,
    demoPlanType,
    setDemoPlanType,
    toggleDemoPlan,
    isPro,
    isFree,
  };
}

export default useSubscriptionContext;
