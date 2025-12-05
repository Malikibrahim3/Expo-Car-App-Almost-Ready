/**
 * Subscription Banner Component
 * 
 * Displays current plan status, usage limits, and upgrade prompts.
 * Shows refresh availability and market shift alerts.
 * Integrates with demo mode for Free/Pro preview.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { usePlanComparison } from '../hooks/useSubscription';
import { PlanType } from '../types/subscription';

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionBannerProps {
  onUpgradePress?: () => void;
  compact?: boolean;
  showDemoToggle?: boolean;
}

interface RefreshButtonProps {
  vehicleId: string;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

// ============================================================================
// SUBSCRIPTION BANNER
// ============================================================================

export function SubscriptionBanner({ onUpgradePress, compact = false, showDemoToggle = true }: SubscriptionBannerProps) {
  const {
    subscription,
    usage,
    refreshSummary,
    marketShifts,
    loading,
    isPro,
    isFree,
    isDemoMode,
    demoPlanType,
    toggleDemoPlan,
  } = useSubscriptionContext();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (!subscription) {
    return null;
  }

  if (compact) {
    return (
      <View style={[styles.container, styles.compact]}>
        {isDemoMode && (
          <Text style={styles.demoIndicator}>🎮</Text>
        )}
        <View style={styles.planBadge}>
          <Text style={[styles.planText, isPro && styles.proPlanText]}>
            {isPro ? '⭐ PRO' : 'FREE'}
          </Text>
        </View>
        {isDemoMode ? (
          <TouchableOpacity onPress={toggleDemoPlan} style={styles.toggleButtonSmall}>
            <Text style={styles.toggleButtonText}>Switch</Text>
          </TouchableOpacity>
        ) : isFree && (
          <TouchableOpacity onPress={onUpgradePress} style={styles.upgradeButtonSmall}>
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Demo Mode Toggle */}
      {isDemoMode && showDemoToggle && (
        <View style={styles.demoToggleContainer}>
          <View style={styles.demoHeader}>
            <Text style={styles.demoLabel}>🎮 Demo Mode</Text>
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Testing</Text>
            </View>
          </View>
          <View style={styles.demoToggleRow}>
            <Text style={[styles.demoPlanLabel, !isPro && styles.activeDemoPlanLabel]}>Free</Text>
            <Switch
              value={isPro}
              onValueChange={toggleDemoPlan}
              trackColor={{ false: '#e9ecef', true: '#ffd700' }}
              thumbColor="#fff"
              ios_backgroundColor="#e9ecef"
            />
            <Text style={[styles.demoPlanLabel, isPro && styles.activeDemoPlanLabel]}>⭐ Pro</Text>
          </View>
        </View>
      )}

      {/* Plan Header */}
      <View style={styles.header}>
        <View style={[styles.planBadge, isPro && styles.proBadge]}>
          <Text style={[styles.planText, isPro && styles.proPlanText]}>
            {isPro ? '⭐ Pro Plan' : 'Free Plan'}
          </Text>
        </View>
        {!isDemoMode && isFree && onUpgradePress && (
          <TouchableOpacity onPress={onUpgradePress} style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Usage Stats */}
      {usage && (
        <View style={styles.usageContainer}>
          <UsageStat
            label="Vehicles"
            used={usage.vehiclesUsed}
            total={subscription.maxVehicles === -1 ? '∞' : subscription.maxVehicles}
            warning={subscription.maxVehicles !== -1 && usage.vehiclesUsed >= subscription.maxVehicles}
          />
          {isPro && (
            <UsageStat
              label="Daily Updates"
              used={usage.dailyRefreshSlotsUsed}
              total={subscription.dailyRefreshVehicles}
            />
          )}
        </View>
      )}

      {/* Refresh Summary */}
      {refreshSummary && (
        <View style={styles.refreshContainer}>
          <Text style={styles.refreshLabel}>
            {refreshSummary.manualRefreshesAvailable > 0
              ? '✓ Manual refresh available'
              : `Next refresh: ${formatTimeUntil(refreshSummary.manualRefreshResetAt)}`}
          </Text>
          {refreshSummary.vehiclesDueForRefresh > 0 && (
            <Text style={styles.dueText}>
              {refreshSummary.vehiclesDueForRefresh} vehicle(s) due for update
            </Text>
          )}
        </View>
      )}

      {/* Market Shift Alerts */}
      {marketShifts.length > 0 && (
        <View style={styles.alertContainer}>
          <Text style={styles.alertTitle}>📊 Market Shifts Detected</Text>
          {marketShifts.slice(0, 2).map((shift, index) => (
            <Text key={index} style={styles.alertText}>
              {shift.make} {shift.model}: {shift.shiftDirection === 'up' ? '↑' : '↓'} {shift.shiftPercent.toFixed(1)}%
            </Text>
          ))}
        </View>
      )}

      {/* Free Plan Limitations */}
      {isFree && (
        <View style={styles.limitationsContainer}>
          <Text style={styles.limitationsTitle}>Upgrade to Pro for:</Text>
          <Text style={styles.limitationItem}>• Unlimited vehicles</Text>
          <Text style={styles.limitationItem}>• Daily updates (up to 10 cars)</Text>
          <Text style={styles.limitationItem}>• 1 manual refresh per day</Text>
          <Text style={styles.limitationItem}>• Priority refresh queue</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// USAGE STAT COMPONENT
// ============================================================================

interface UsageStatProps {
  label: string;
  used: number;
  total: number | string;
  warning?: boolean;
}

function UsageStat({ label, used, total, warning }: UsageStatProps) {
  return (
    <View style={styles.usageStat}>
      <Text style={styles.usageLabel}>{label}</Text>
      <Text style={[styles.usageValue, warning && styles.usageWarning]}>
        {used} / {total}
      </Text>
    </View>
  );
}

// ============================================================================
// REFRESH BUTTON COMPONENT
// ============================================================================

export function RefreshButton({ vehicleId, onRefresh, disabled }: RefreshButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const { checkRefreshEligibility } = useSubscriptionContext();
  const [eligibility, setEligibility] = React.useState<{ canRefresh: boolean; reason?: string } | null>(null);

  React.useEffect(() => {
    checkRefreshEligibility(vehicleId).then(setEligibility);
  }, [vehicleId, checkRefreshEligibility]);

  const handlePress = async () => {
    if (!eligibility?.canRefresh || loading || disabled) return;
    
    setLoading(true);
    try {
      await onRefresh();
      // Re-check eligibility after refresh
      const newEligibility = await checkRefreshEligibility(vehicleId);
      setEligibility(newEligibility);
    } finally {
      setLoading(false);
    }
  };

  const canRefresh = eligibility?.canRefresh && !disabled && !loading;

  return (
    <TouchableOpacity
      style={[styles.refreshButton, !canRefresh && styles.refreshButtonDisabled]}
      onPress={handlePress}
      disabled={!canRefresh}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.refreshButtonText}>
          {eligibility?.canRefresh ? '🔄 Refresh Value' : eligibility?.reason || 'Refresh unavailable'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// PLAN COMPARISON COMPONENT
// ============================================================================

interface PlanComparisonProps {
  onSelectPlan?: (plan: PlanType) => void;
  currentPlan?: PlanType;
}

export function PlanComparison({ onSelectPlan, currentPlan }: PlanComparisonProps) {
  const { free, pro, getFeatureDiff } = usePlanComparison();
  const upgradedFeatures = getFeatureDiff();

  return (
    <View style={styles.comparisonContainer}>
      {/* Free Plan */}
      <View style={[styles.planCard, currentPlan === 'free' && styles.currentPlanCard]}>
        <Text style={styles.planCardTitle}>Free</Text>
        <Text style={styles.planCardPrice}>$0/month</Text>
        <View style={styles.featureList}>
          {free.features.filter(f => f.included).map((feature, index) => (
            <Text key={index} style={styles.featureItem}>
              ✓ {feature.name}{feature.limit ? ` (${feature.limit})` : ''}
            </Text>
          ))}
        </View>
        {currentPlan !== 'free' && onSelectPlan && (
          <TouchableOpacity
            style={styles.selectPlanButton}
            onPress={() => onSelectPlan('free')}
          >
            <Text style={styles.selectPlanButtonText}>Downgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pro Plan */}
      <View style={[styles.planCard, styles.proPlanCard, currentPlan === 'pro' && styles.currentPlanCard]}>
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>RECOMMENDED</Text>
        </View>
        <Text style={styles.planCardTitle}>Pro</Text>
        <Text style={styles.planCardPrice}>$4.99/month</Text>
        <View style={styles.featureList}>
          {pro.features.filter(f => f.included).map((feature, index) => (
            <Text key={index} style={styles.featureItem}>
              ✓ {feature.name}{feature.limit ? ` (${feature.limit})` : ''}
            </Text>
          ))}
        </View>
        {currentPlan !== 'pro' && onSelectPlan && (
          <TouchableOpacity
            style={[styles.selectPlanButton, styles.proSelectButton]}
            onPress={() => onSelectPlan('pro')}
          >
            <Text style={[styles.selectPlanButtonText, styles.proSelectButtonText]}>
              Upgrade to Pro
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeUntil(date?: Date): string {
  if (!date) return 'soon';
  
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return 'now';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m`;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  demoIndicator: {
    fontSize: 14,
    marginRight: 4,
  },
  toggleButtonSmall: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  demoToggleContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  demoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  demoBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
  },
  demoToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  demoPlanLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    minWidth: 45,
  },
  activeDemoPlanLabel: {
    color: '#212529',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  proBadge: {
    backgroundColor: '#ffd700',
  },
  planText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  proPlanText: {
    color: '#000',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeButtonSmall: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  usageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  usageStat: {
    alignItems: 'center',
  },
  usageLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  usageWarning: {
    color: '#dc3545',
  },
  refreshContainer: {
    backgroundColor: '#e7f5ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  refreshLabel: {
    fontSize: 14,
    color: '#1971c2',
    fontWeight: '500',
  },
  dueText: {
    fontSize: 12,
    color: '#1971c2',
    marginTop: 4,
  },
  alertContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: '#856404',
  },
  limitationsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 12,
  },
  limitationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  limitationItem: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    backgroundColor: '#adb5bd',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  proPlanCard: {
    borderColor: '#ffd700',
  },
  currentPlanCard: {
    borderColor: '#007AFF',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  planCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  planCardPrice: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  featureList: {
    marginBottom: 16,
  },
  featureItem: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 6,
  },
  selectPlanButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  proSelectButton: {
    backgroundColor: '#007AFF',
  },
  selectPlanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  proSelectButtonText: {
    color: '#fff',
  },
});

export default SubscriptionBanner;
