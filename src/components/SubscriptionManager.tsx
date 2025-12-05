/**
 * Subscription Manager Component
 * 
 * Full subscription management UI with:
 * - Current plan display
 * - Upgrade to Pro option (for Free users) - Opens Stripe Checkout
 * - Cancel subscription option (for Pro users - returns to Free)
 * - Plan comparison
 * - Stripe Customer Portal for billing management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import stripeService, { STRIPE_PRICES } from '../services/stripeService';
import { supabase } from '../lib/supabaseClient';

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionManagerProps {
  onClose?: () => void;
  showAsModal?: boolean;
  visible?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubscriptionManager({ onClose, showAsModal = false, visible = true }: SubscriptionManagerProps) {
  const {
    subscription,
    usage,
    isPro,
    isFree,
    isDemoMode,
    toggleDemoPlan,
    upgrade,
    downgrade,
    refresh,
  } = useSubscriptionContext();
  
  const { user } = useAuth() as any;
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Get current auth token for API calls
   */
  const getAuthToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  /**
   * Handle upgrade to Pro - Opens Stripe Checkout
   */
  const handleUpgrade = async () => {
    // In demo mode, just toggle the plan
    if (isDemoMode) {
      toggleDemoPlan();
      return;
    }

    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      Alert.alert(
        'Coming Soon',
        'Payment processing is being set up. Please try again later.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'Please sign in to upgrade.');
      return;
    }

    setActionLoading(true);
    try {
      // Get auth token
      const authToken = await getAuthToken();
      if (!authToken) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        return;
      }

      // Create Stripe Checkout session
      const { url } = await stripeService.createCheckoutSession({
        priceId: STRIPE_PRICES.PRO_MONTHLY,
      }, authToken);

      // Open Stripe Checkout
      if (url) {
        if (Platform.OS === 'web') {
          window.location.href = url;
        } else {
          await Linking.openURL(url);
        }
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      Alert.alert('Error', error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Open Stripe Customer Portal for billing management
   */
  const handleManageBilling = async () => {
    if (isDemoMode || !user?.id) return;

    setActionLoading(true);
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        return;
      }

      const { url } = await stripeService.createCustomerPortalSession(authToken);
      
      if (url) {
        if (Platform.OS === 'web') {
          window.location.href = url;
        } else {
          await Linking.openURL(url);
        }
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      Alert.alert('Error', 'Failed to open billing portal. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle subscription cancellation
   */
  const handleCancelSubscription = () => {
    if (isDemoMode) {
      // In demo mode, just toggle to free
      toggleDemoPlan();
      return;
    }

    Alert.alert(
      'Cancel Subscription?',
      'You will lose access to:\n\n• Unlimited vehicles (limited to 1)\n• Daily updates\n• Priority refresh queue\n• Market shift alerts\n\nYour Pro benefits will continue until the end of your current billing period.',
      [
        { text: 'Keep Pro', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const authToken = await getAuthToken();
              if (!authToken) {
                Alert.alert('Error', 'Session expired. Please sign in again.');
                return;
              }

              // Cancel via Stripe API
              await stripeService.cancelSubscription(authToken);
              // Also update local state
              const success = await downgrade();
              if (success) {
                Alert.alert(
                  'Subscription Cancelled',
                  'Your Pro benefits will remain active until the end of your billing period. After that, you\'ll be on the Free plan.'
                );
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel. Please try again.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Manage Subscription</Text>
        {isDemoMode && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>🎮 Demo Mode</Text>
          </View>
        )}
      </View>

      {/* Current Plan Card - Different design for Pro vs Free */}
      {isPro ? (
        // PRO PLAN - Premium Gold Card
        <View style={styles.proCardContainer}>
          <LinearGradient
            colors={['#FFD700', '#FFA500', '#FF8C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.proCard}
          >
            <View style={styles.proCardHeader}>
              <Text style={styles.proCardTitle}>⭐ Pro Member</Text>
              <Text style={styles.proCardPrice}>$4.99/mo</Text>
            </View>

            <View style={styles.proBenefitsGrid}>
              <View style={styles.proBenefitItem}>
                <Text style={styles.proBenefitValue}>{usage?.vehiclesUsed || 0}</Text>
                <Text style={styles.proBenefitLabel}>Vehicles</Text>
              </View>
              <View style={styles.proBenefitItem}>
                <Text style={styles.proBenefitValue}>∞</Text>
                <Text style={styles.proBenefitLabel}>Limit</Text>
              </View>
              <View style={styles.proBenefitItem}>
                <Text style={styles.proBenefitValue}>Daily</Text>
                <Text style={styles.proBenefitLabel}>Updates</Text>
              </View>
              <View style={styles.proBenefitItem}>
                <Text style={styles.proBenefitValue}>1/day</Text>
                <Text style={styles.proBenefitLabel}>Refresh</Text>
              </View>
            </View>

            <View style={styles.proFeaturesRow}>
              <Text style={styles.proFeatureTag}>✓ Priority Queue</Text>
              <Text style={styles.proFeatureTag}>✓ Market Alerts</Text>
              <Text style={styles.proFeatureTag}>✓ Export Data</Text>
            </View>
          </LinearGradient>

          {/* Billing Info & Manage Button */}
          {!isDemoMode && (
            <View style={styles.proBillingInfo}>
              {subscription?.billingCycleEnd && (
                <Text style={styles.proBillingText}>
                  {subscription?.cancelAtPeriodEnd 
                    ? `Pro access until: ${new Date(subscription.billingCycleEnd).toLocaleDateString()}`
                    : `Next billing: ${new Date(subscription.billingCycleEnd).toLocaleDateString()}`
                  }
                </Text>
              )}
              <TouchableOpacity
                style={styles.manageBillingButton}
                onPress={handleManageBilling}
                disabled={actionLoading}
              >
                <Text style={styles.manageBillingText}>Manage Billing</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        // FREE PLAN - Basic Card
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <Text style={styles.currentPlanLabel}>Current Plan</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Free</Text>
            </View>
          </View>

          <Text style={styles.currentPlanPrice}>
            $0<Text style={styles.currentPlanPeriod}>/month</Text>
          </Text>

          {/* Usage Summary */}
          <View style={styles.usageSummary}>
            <View style={styles.usageItem}>
              <Text style={styles.usageValue}>
                {usage?.vehiclesUsed || 0}
                <Text style={styles.usageLimit}>
                  /{subscription?.maxVehicles || 1}
                </Text>
              </Text>
              <Text style={styles.usageLabel}>Vehicles</Text>
            </View>

            <View style={styles.usageDivider} />

            <View style={styles.usageItem}>
              <Text style={styles.usageValue}>Weekly</Text>
              <Text style={styles.usageLabel}>Updates</Text>
            </View>

            <View style={styles.usageDivider} />

            <View style={styles.usageItem}>
              <Text style={styles.usageValue}>1/week</Text>
              <Text style={styles.usageLabel}>Refresh</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {isFree ? (
          // Free user - show upgrade option
          <>
            <TouchableOpacity
              style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
              onPress={handleUpgrade}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>⭐ Upgrade to Pro</Text>
                  <Text style={styles.primaryButtonSubtext}>$4.99/month</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.upgradeHint}>
              Unlock unlimited vehicles, daily updates, and more
            </Text>
          </>
        ) : (
          // Pro user - show cancel option
          <>
            <View style={styles.proStatusContainer}>
              <Text style={styles.proStatusText}>✓ You're on the Pro plan</Text>
              <Text style={styles.proStatusSubtext}>
                Enjoying unlimited vehicles and daily updates
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, actionLoading && styles.buttonDisabled]}
              onPress={handleCancelSubscription}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#dc3545" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.cancelHint}>
              You'll keep Pro benefits until the end of your billing period
            </Text>
          </>
        )}
      </View>

      {/* Plan Comparison */}
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonTitle}>Plan Comparison</Text>

        <View style={styles.comparisonTable}>
          {/* Header Row */}
          <View style={styles.comparisonRow}>
            <Text style={[styles.comparisonCell, styles.comparisonFeature]}>Feature</Text>
            <Text style={[styles.comparisonCell, styles.comparisonPlan]}>Free</Text>
            <Text style={[styles.comparisonCell, styles.comparisonPlan, styles.comparisonPlanPro]}>Pro</Text>
          </View>

          {/* Feature Rows */}
          <ComparisonRow feature="Vehicles" free="1" pro="Unlimited" />
          <ComparisonRow feature="Auto Updates" free="Weekly" pro="Daily (10 cars)" />
          <ComparisonRow feature="Manual Refresh" free="1/week" pro="1/day" />
          <ComparisonRow feature="Priority Queue" free="✗" pro="✓" />
          <ComparisonRow feature="Market Alerts" free="Basic" pro="Advanced" />
          <ComparisonRow feature="Export Data" free="✗" pro="✓" />
        </View>
      </View>

      {/* Demo Mode Toggle */}
      {isDemoMode && (
        <View style={styles.demoToggleContainer}>
          <Text style={styles.demoToggleLabel}>Preview different plans:</Text>
          <View style={styles.demoToggleButtons}>
            <TouchableOpacity
              style={[styles.demoToggleButton, !isPro && styles.demoToggleButtonActive]}
              onPress={() => isPro && toggleDemoPlan()}
            >
              <Text style={[styles.demoToggleButtonText, !isPro && styles.demoToggleButtonTextActive]}>
                Free
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoToggleButton, isPro && styles.demoToggleButtonActive]}
              onPress={() => !isPro && toggleDemoPlan()}
            >
              <Text style={[styles.demoToggleButtonText, isPro && styles.demoToggleButtonTextActive]}>
                ⭐ Pro
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Close Button (if modal) */}
      {showAsModal && onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  if (showAsModal) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        {content}
      </Modal>
    );
  }

  return content;
}

// ============================================================================
// COMPARISON ROW COMPONENT
// ============================================================================

function ComparisonRow({ feature, free, pro }: { feature: string; free: string; pro: string }) {
  return (
    <View style={styles.comparisonRow}>
      <Text style={[styles.comparisonCell, styles.comparisonFeature]}>{feature}</Text>
      <Text style={[styles.comparisonCell, styles.comparisonValue]}>{free}</Text>
      <Text style={[styles.comparisonCell, styles.comparisonValue, styles.comparisonValuePro]}>{pro}</Text>
    </View>
  );
}

// ============================================================================
// UPGRADE MODAL - Standalone upgrade prompt
// ============================================================================

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

export function UpgradeModal({ visible, onClose, feature }: UpgradeModalProps) {
  const { upgrade, isDemoMode, toggleDemoPlan } = useSubscriptionContext();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (isDemoMode) {
      toggleDemoPlan();
      onClose();
      return;
    }

    setLoading(true);
    try {
      const success = await upgrade();
      if (success) {
        Alert.alert('Welcome to Pro!', 'You now have access to all Pro features.');
        onClose();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upgrade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.upgradeModalContent}>
          <Text style={styles.upgradeModalIcon}>⭐</Text>
          <Text style={styles.upgradeModalTitle}>Upgrade to Pro</Text>
          
          {feature && (
            <Text style={styles.upgradeModalFeature}>
              "{feature}" is a Pro feature
            </Text>
          )}

          <View style={styles.upgradeModalFeatures}>
            <Text style={styles.upgradeModalFeatureItem}>✓ Unlimited vehicles</Text>
            <Text style={styles.upgradeModalFeatureItem}>✓ Daily updates for 10 cars</Text>
            <Text style={styles.upgradeModalFeatureItem}>✓ 1 manual refresh per day</Text>
            <Text style={styles.upgradeModalFeatureItem}>✓ Priority refresh queue</Text>
            <Text style={styles.upgradeModalFeatureItem}>✓ Market shift alerts</Text>
          </View>

          <Text style={styles.upgradeModalPrice}>$4.99/month</Text>

          <TouchableOpacity
            style={[styles.upgradeModalButton, loading && styles.buttonDisabled]}
            onPress={handleUpgrade}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.upgradeModalButtonText}>
                {isDemoMode ? 'Preview Pro' : 'Upgrade Now'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.upgradeModalCancel} onPress={onClose}>
            <Text style={styles.upgradeModalCancelText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
  },
  demoBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  demoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },

  // Pro Card - Premium Gold Design
  proCardContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  proCard: {
    padding: 24,
  },
  proCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  proCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  proCardPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  proBenefitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  proBenefitItem: {
    alignItems: 'center',
    flex: 1,
  },
  proBenefitValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  proBenefitLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  proFeaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  proFeatureTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  proBillingInfo: {
    backgroundColor: '#fff',
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  proBillingText: {
    fontSize: 13,
    color: '#6c757d',
  },
  manageBillingButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  manageBillingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },

  // Free Plan Card
  currentPlanCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentPlanLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  planBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  planBadgePro: {
    backgroundColor: '#ffd700',
  },
  planBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  planBadgeTextPro: {
    color: '#000',
  },
  currentPlanPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
  },
  currentPlanPeriod: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6c757d',
  },
  usageSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  usageItem: {
    alignItems: 'center',
  },
  usageValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  usageLimit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6c757d',
  },
  usageLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  usageDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
  },
  billingInfo: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  billingText: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
  },

  // Action Buttons
  actionsContainer: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  primaryButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  upgradeHint: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
  proStatusContainer: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  proStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },
  proStatusSubtext: {
    fontSize: 13,
    color: '#155724',
  },
  cancelButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  cancelButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelHint: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },

  // Comparison Table
  comparisonContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  comparisonTable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  comparisonRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  comparisonCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  comparisonFeature: {
    flex: 2,
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  comparisonPlan: {
    flex: 1,
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '600',
  },
  comparisonPlanPro: {
    color: '#000',
    backgroundColor: '#fff9e6',
  },
  comparisonValue: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
  },
  comparisonValuePro: {
    backgroundColor: '#fff9e6',
    fontWeight: '500',
  },

  // Demo Toggle
  demoToggleContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  demoToggleLabel: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
    textAlign: 'center',
  },
  demoToggleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  demoToggleButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  demoToggleButtonActive: {
    backgroundColor: '#ffd700',
    borderColor: '#ffd700',
  },
  demoToggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  demoToggleButtonTextActive: {
    color: '#000',
  },

  // Close Button
  closeButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },

  // Upgrade Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  upgradeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  upgradeModalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  upgradeModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  upgradeModalFeature: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    textAlign: 'center',
  },
  upgradeModalFeatures: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  upgradeModalFeatureItem: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  upgradeModalPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
  },
  upgradeModalButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeModalCancel: {
    paddingVertical: 8,
  },
  upgradeModalCancelText: {
    color: '#6c757d',
    fontSize: 14,
  },
});

export default SubscriptionManager;
