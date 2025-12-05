/**
 * Upgrade Prompt Component
 * 
 * Simple, non-overwhelming CTAs shown when users hit plan limits.
 * Designed to be helpful, not pushy.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, X, Zap, Car, RefreshCw, Bell } from 'lucide-react-native';
import { useThemeMode } from '../context/ThemeContext';
import { haptic, Radius, Spacing } from '../constants/LinearDesign';

// ============================================================================
// INLINE UPGRADE BANNER - Shows in context when limit is hit
// ============================================================================

interface UpgradeBannerProps {
  feature: 'vehicles' | 'refresh' | 'daily_updates' | 'alerts';
  onUpgrade?: () => void;
  compact?: boolean;
}

export function UpgradeBanner({ feature, onUpgrade, compact = false }: UpgradeBannerProps) {
  const router = useRouter();
  const { colors } = useThemeMode();

  const featureConfig = {
    vehicles: {
      icon: Car,
      title: 'Want more vehicles?',
      subtitle: 'Upgrade to Pro for unlimited cars',
    },
    refresh: {
      icon: RefreshCw,
      title: 'Need more refreshes?',
      subtitle: 'Pro members get daily refreshes',
    },
    daily_updates: {
      icon: Zap,
      title: 'Want daily updates?',
      subtitle: 'Pro gets daily value tracking',
    },
    alerts: {
      icon: Bell,
      title: 'Want market alerts?',
      subtitle: 'Pro members get instant alerts',
    },
  };

  const config = featureConfig[feature];
  const Icon = config.icon;

  const handlePress = () => {
    haptic.light();
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/(app)/subscription');
    }
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactBanner,
          { backgroundColor: 'rgba(255, 215, 0, 0.1)', borderColor: 'rgba(255, 215, 0, 0.3)' },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Star size={14} color="#B8860B" fill="#B8860B" />
        <Text style={styles.compactText}>{config.subtitle}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: colors.surface, borderColor: 'rgba(255, 215, 0, 0.3)' },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
        <Icon size={20} color="#B8860B" />
      </View>
      <View style={styles.bannerContent}>
        <Text style={[styles.bannerTitle, { color: colors.text }]}>{config.title}</Text>
        <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>{config.subtitle}</Text>
      </View>
      <View style={styles.upgradeChip}>
        <Star size={12} color="#fff" fill="#fff" />
        <Text style={styles.upgradeChipText}>Pro</Text>
      </View>
    </Pressable>
  );
}

// ============================================================================
// UPGRADE MODAL - Shows when user tries to do something they can't
// ============================================================================

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature: 'vehicles' | 'refresh' | 'daily_updates' | 'alerts';
}

export function UpgradeModal({ visible, onClose, feature }: UpgradeModalProps) {
  const router = useRouter();
  const { colors } = useThemeMode();

  const featureConfig = {
    vehicles: {
      icon: Car,
      title: 'Vehicle Limit Reached',
      description: 'Free plan includes 1 vehicle. Upgrade to Pro for unlimited vehicles.',
      benefit: 'Track all your cars in one place',
    },
    refresh: {
      icon: RefreshCw,
      title: 'Refresh Limit Reached',
      description: 'Free plan allows 1 refresh per week. Pro members can refresh daily.',
      benefit: 'Always have the latest values',
    },
    daily_updates: {
      icon: Zap,
      title: 'Daily Updates',
      description: 'Free plan updates weekly. Pro gets daily value updates.',
      benefit: 'Never miss a market change',
    },
    alerts: {
      icon: Bell,
      title: 'Market Alerts',
      description: 'Market shift alerts are a Pro feature.',
      benefit: 'Get notified when prices change',
    },
  };

  const config = featureConfig[feature];
  const Icon = config.icon;

  const handleUpgrade = () => {
    haptic.medium();
    onClose();
    router.push('/(app)/subscription');
  };

  const handleMaybeLater = () => {
    haptic.light();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Close button */}
          <Pressable onPress={onClose} style={styles.modalClose}>
            <X size={20} color={colors.textTertiary} />
          </Pressable>

          {/* Icon */}
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.modalIcon}
          >
            <Icon size={28} color="#fff" />
          </LinearGradient>

          {/* Content */}
          <Text style={[styles.modalTitle, { color: colors.text }]}>{config.title}</Text>
          <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
            {config.description}
          </Text>

          {/* Benefit highlight */}
          <View style={[styles.benefitRow, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
            <Star size={16} color="#B8860B" fill="#B8860B" />
            <Text style={styles.benefitText}>{config.benefit}</Text>
          </View>

          {/* Actions */}
          <Pressable onPress={handleUpgrade} style={styles.upgradeButton}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.upgradeButtonGradient}
            >
              <Star size={18} color="#000" fill="#000" />
              <Text style={styles.upgradeButtonText}>Upgrade to Pro — $4.99/mo</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleMaybeLater} style={styles.laterButton}>
            <Text style={[styles.laterButtonText, { color: colors.textTertiary }]}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// HOOK - Easy way to show upgrade prompts
// ============================================================================

import { useState, useCallback } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';

export function useUpgradePrompt() {
  const { isPro, canAddMoreVehicles, checkRefreshEligibility } = useSubscriptionContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalFeature, setModalFeature] = useState<'vehicles' | 'refresh' | 'daily_updates' | 'alerts'>('vehicles');

  const showUpgradeModal = useCallback((feature: typeof modalFeature) => {
    if (!isPro) {
      setModalFeature(feature);
      setModalVisible(true);
      return true; // Blocked
    }
    return false; // Not blocked
  }, [isPro]);

  const checkVehicleLimit = useCallback(() => {
    if (!canAddMoreVehicles && !isPro) {
      showUpgradeModal('vehicles');
      return false; // Can't add
    }
    return true; // Can add
  }, [canAddMoreVehicles, isPro, showUpgradeModal]);

  const checkRefreshLimit = useCallback(async (vehicleId: string) => {
    const eligibility = await checkRefreshEligibility(vehicleId);
    if (!eligibility.canRefresh && !isPro) {
      showUpgradeModal('refresh');
      return false;
    }
    return eligibility.canRefresh;
  }, [isPro, checkRefreshEligibility, showUpgradeModal]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  return {
    isPro,
    modalVisible,
    modalFeature,
    showUpgradeModal,
    checkVehicleLimit,
    checkRefreshLimit,
    closeModal,
    UpgradeModalComponent: () => (
      <UpgradeModal
        visible={modalVisible}
        onClose={closeModal}
        feature={modalFeature}
      />
    ),
  };
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Compact banner
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#B8860B',
  },

  // Full banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 13,
  },
  upgradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  upgradeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B8860B',
  },
  upgradeButton: {
    width: '100%',
    marginBottom: 12,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.sm,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  laterButton: {
    paddingVertical: 10,
  },
  laterButtonText: {
    fontSize: 15,
  },
});

export default UpgradeBanner;
