/**
 * Demo Plan Toggle Component
 * 
 * Allows switching between Free and Pro plans in demo mode.
 * Only visible when user is in demo mode.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform } from 'react-native';
import { useSubscriptionContext } from '../context/SubscriptionContext';

interface DemoPlanToggleProps {
  style?: object;
  showLabel?: boolean;
  compact?: boolean;
}

export function DemoPlanToggle({ style, showLabel = true, compact = false }: DemoPlanToggleProps) {
  const { isDemoMode, demoPlanType, toggleDemoPlan, isPro } = useSubscriptionContext();

  // Only show in demo mode
  if (!isDemoMode) return null;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <TouchableOpacity 
          style={[styles.compactToggle, isPro && styles.compactTogglePro]}
          onPress={toggleDemoPlan}
        >
          <Text style={[styles.compactText, isPro && styles.compactTextPro]}>
            {isPro ? '⭐ PRO' : 'FREE'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.demoLabel}>🎮 Demo Mode</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Testing</Text>
        </View>
      </View>
      
      <View style={styles.toggleRow}>
        <Text style={[styles.planLabel, !isPro && styles.activePlanLabel]}>Free</Text>
        
        <Switch
          value={isPro}
          onValueChange={toggleDemoPlan}
          trackColor={{ false: '#e9ecef', true: '#ffd700' }}
          thumbColor={isPro ? '#fff' : '#fff'}
          ios_backgroundColor="#e9ecef"
        />
        
        <Text style={[styles.planLabel, isPro && styles.activePlanLabel]}>
          ⭐ Pro
        </Text>
      </View>

      {showLabel && (
        <Text style={styles.hint}>
          Toggle to preview {isPro ? 'Free' : 'Pro'} plan features
        </Text>
      )}
    </View>
  );
}

/**
 * Demo Mode Banner - Shows at top of screen in demo mode
 */
export function DemoModeBanner() {
  const { isDemoMode, demoPlanType, toggleDemoPlan, isPro } = useSubscriptionContext();

  if (!isDemoMode) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <Text style={styles.bannerIcon}>🎮</Text>
        <View>
          <Text style={styles.bannerTitle}>Demo Mode</Text>
          <Text style={styles.bannerSubtitle}>
            Viewing as {isPro ? 'Pro' : 'Free'} user
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.bannerToggle, isPro && styles.bannerTogglePro]}
        onPress={toggleDemoPlan}
      >
        <Text style={[styles.bannerToggleText, isPro && styles.bannerToggleTextPro]}>
          Switch to {isPro ? 'Free' : 'Pro'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Feature Gate Component - Shows upgrade prompt for Pro features
 */
interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { canUseFeature, isPro, isDemoMode, toggleDemoPlan } = useSubscriptionContext();
  
  const hasAccess = canUseFeature(feature as any);
  
  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={styles.gateContainer}>
      <View style={styles.gateContent}>
        <Text style={styles.gateIcon}>🔒</Text>
        <Text style={styles.gateTitle}>Pro Feature</Text>
        <Text style={styles.gateDescription}>
          Upgrade to Pro to unlock this feature
        </Text>
        
        {isDemoMode ? (
          <TouchableOpacity style={styles.gateButton} onPress={toggleDemoPlan}>
            <Text style={styles.gateButtonText}>Preview as Pro</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.gateButton}>
            <Text style={styles.gateButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Upgrade Prompt - Inline prompt to upgrade
 */
interface UpgradePromptProps {
  feature?: string;
  message?: string;
  compact?: boolean;
  onUpgradePress?: () => void;
}

export function UpgradePrompt({ feature, message, compact = false, onUpgradePress }: UpgradePromptProps) {
  const { isPro, isDemoMode, toggleDemoPlan, upgrade } = useSubscriptionContext();

  if (isPro) return null;

  const defaultMessage = feature 
    ? `Upgrade to Pro to unlock ${feature}`
    : 'Upgrade to Pro for unlimited access';

  const handlePress = () => {
    if (onUpgradePress) {
      onUpgradePress();
    } else if (isDemoMode) {
      toggleDemoPlan();
    } else {
      upgrade();
    }
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactPrompt} onPress={handlePress}>
        <Text style={styles.compactPromptText}>
          ⭐ {isDemoMode ? 'Preview Pro' : 'Upgrade'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.promptContainer}>
      <View style={styles.promptContent}>
        <Text style={styles.promptIcon}>⭐</Text>
        <Text style={styles.promptMessage}>{message || defaultMessage}</Text>
      </View>
      <TouchableOpacity style={styles.promptButton} onPress={handlePress}>
        <Text style={styles.promptButtonText}>
          {isDemoMode ? 'Preview Pro' : 'Upgrade'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Subscription Action Button - Shows upgrade or manage based on current plan
 */
interface SubscriptionActionButtonProps {
  onPress: () => void;
  style?: object;
}

export function SubscriptionActionButton({ onPress, style }: SubscriptionActionButtonProps) {
  const { isPro, isFree, isDemoMode } = useSubscriptionContext();

  return (
    <TouchableOpacity style={[styles.actionButton, isPro && styles.actionButtonPro, style]} onPress={onPress}>
      <Text style={[styles.actionButtonText, isPro && styles.actionButtonTextPro]}>
        {isPro ? 'Manage Plan' : '⭐ Upgrade to Pro'}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Plan Badge - Shows current plan
 */
export function PlanBadge({ style }: { style?: object }) {
  const { isPro, isFree, isDemoMode } = useSubscriptionContext();

  return (
    <View style={[styles.planBadge, isPro && styles.planBadgePro, style]}>
      {isDemoMode && <Text style={styles.planBadgeDemo}>🎮 </Text>}
      <Text style={[styles.planBadgeText, isPro && styles.planBadgeTextPro]}>
        {isPro ? '⭐ Pro' : 'Free'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main toggle
  container: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  demoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
  },
  badge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  planLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    minWidth: 50,
  },
  activePlanLabel: {
    color: '#212529',
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    marginTop: 8,
  },

  // Compact toggle
  compactContainer: {
    alignItems: 'center',
  },
  compactToggle: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  compactTogglePro: {
    backgroundColor: '#ffd700',
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  compactTextPro: {
    color: '#000',
  },

  // Banner
  banner: {
    backgroundColor: '#fff3cd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerIcon: {
    fontSize: 20,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#856404',
  },
  bannerToggle: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  bannerTogglePro: {
    backgroundColor: '#ffd700',
    borderColor: '#ffd700',
  },
  bannerToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
  bannerToggleTextPro: {
    color: '#000',
  },

  // Feature gate
  gateContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  gateContent: {
    alignItems: 'center',
  },
  gateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  gateDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 16,
  },
  gateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  gateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Upgrade prompt
  promptContainer: {
    backgroundColor: '#e7f5ff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  promptIcon: {
    fontSize: 16,
  },
  promptMessage: {
    fontSize: 13,
    color: '#1971c2',
    flex: 1,
  },
  promptButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  promptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  compactPrompt: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactPromptText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Plan badge
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgePro: {
    backgroundColor: '#ffd700',
  },
  planBadgeDemo: {
    fontSize: 12,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  planBadgeTextPro: {
    color: '#000',
  },

  // Action button
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionButtonPro: {
    backgroundColor: '#e9ecef',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextPro: {
    color: '#495057',
  },
});

export default DemoPlanToggle;
