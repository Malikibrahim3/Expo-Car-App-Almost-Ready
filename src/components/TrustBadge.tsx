/**
 * TrustBadge - Security and trust indicators
 * For auth screens and sensitive data areas
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Shield, Lock, Eye, CheckCircle, Clock } from 'lucide-react-native';
import { useThemeMode } from '@/src/context/ThemeContext';
import { Typography, Radius, Spacing } from '@/src/constants/LinearDesign';
import { IOSText as Text } from './ios';

// ============================================
// DATA SOURCE BADGE
// ============================================
interface DataSourceBadgeProps {
  source?: 'market' | 'kbb' | 'edmunds' | 'nada';
}

const SOURCES = {
  market: { name: 'Market Data', icon: '📊' },
  kbb: { name: 'Kelley Blue Book', icon: '📘' },
  edmunds: { name: 'Edmunds', icon: '🚗' },
  nada: { name: 'NADA Guides', icon: '📋' },
};

export function DataSourceBadge({ source = 'kbb' }: DataSourceBadgeProps) {
  const { colors } = useThemeMode();
  const sourceInfo = SOURCES[source];

  return (
    <View style={[styles.sourceBadge, { backgroundColor: colors.positiveBg }]}>
      <Shield size={12} color={colors.positive} />
      <Text style={[styles.sourceText, { color: colors.positive }]}>
        {sourceInfo.icon} {sourceInfo.name}
      </Text>
    </View>
  );
}

// ============================================
// LAST UPDATED
// ============================================
interface LastUpdatedProps {
  timestamp: Date;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function LastUpdated({ timestamp }: LastUpdatedProps) {
  const { colors } = useThemeMode();
  
  return (
    <View style={styles.lastUpdated}>
      <Clock size={12} color={colors.textTertiary} />
      <Text style={[styles.lastUpdatedText, { color: colors.textTertiary }]}>
        Updated {getTimeAgo(timestamp)}
      </Text>
    </View>
  );
}

// ============================================
// TRUST FOOTER
// ============================================
export function TrustFooter() {
  const { colors } = useThemeMode();
  
  return (
    <View style={styles.trustFooter}>
      <Shield size={14} color={colors.positive} />
      <Text style={[styles.trustFooterText, { color: colors.textTertiary }]}>
        Your data is encrypted and secure
      </Text>
    </View>
  );
}

// ============================================
// SECURITY BADGE (for auth screens)
// ============================================
interface SecurityBadgeProps {
  type?: 'security' | 'privacy' | 'encrypted' | 'verified';
}

const SECURITY_BADGES = {
  security: { label: 'Bank-level security', icon: Shield },
  privacy: { label: 'Your data stays private', icon: Eye },
  encrypted: { label: '256-bit encryption', icon: Lock },
  verified: { label: 'Trusted by 2,400+ users', icon: CheckCircle },
};

export function SecurityBadge({ type = 'encrypted' }: SecurityBadgeProps) {
  const { colors } = useThemeMode();
  const badge = SECURITY_BADGES[type];
  const Icon = badge.icon;

  return (
    <View style={[styles.securityBadge, { backgroundColor: colors.positiveBg }]}>
      <Icon size={14} color={colors.positive} />
      <Text style={[styles.securityText, { color: colors.positive }]}>{badge.label}</Text>
    </View>
  );
}

interface TrustBadgeProps {
  type?: 'security' | 'privacy' | 'encrypted' | 'verified';
  variant?: 'minimal' | 'full';
}

const BADGES = {
  security: {
    icon: Shield,
    label: 'Secure',
    description: 'Bank-level security',
  },
  privacy: {
    icon: Eye,
    label: 'Private',
    description: 'Your data stays yours',
  },
  encrypted: {
    icon: Lock,
    label: 'Encrypted',
    description: '256-bit encryption',
  },
  verified: {
    icon: CheckCircle,
    label: 'Verified',
    description: 'Trusted by 2,400+ users',
  },
};

export function TrustBadge({ type = 'security', variant = 'minimal' }: TrustBadgeProps) {
  const { colors } = useThemeMode();
  const badge = BADGES[type];
  const Icon = badge.icon;

  if (variant === 'full') {
    return (
      <View style={[styles.fullContainer, { backgroundColor: colors.positiveBg, borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
        <Icon size={16} color={colors.positive} />
        <View>
          <Text style={[styles.fullLabel, { color: colors.positive }]}>{badge.label}</Text>
          <Text style={[styles.fullDescription, { color: colors.textSecondary }]}>{badge.description}</Text>
        </View>
      </View>
    );
  }

  // Minimal variant
  return (
    <View style={styles.minimalContainer}>
      <Icon size={12} color={colors.positive} />
      <Text style={[styles.minimalText, { color: colors.textTertiary }]}>{badge.description}</Text>
    </View>
  );
}

export function TrustBadgeRow() {
  const { colors } = useThemeMode();
  
  return (
    <View style={styles.row}>
      <View style={styles.rowItem}>
        <Shield size={14} color={colors.positive} />
        <Text style={[styles.rowText, { color: colors.textTertiary }]}>Secure</Text>
      </View>
      <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
      <View style={styles.rowItem}>
        <Lock size={14} color={colors.positive} />
        <Text style={[styles.rowText, { color: colors.textTertiary }]}>Encrypted</Text>
      </View>
      <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
      <View style={styles.rowItem}>
        <Eye size={14} color={colors.positive} />
        <Text style={[styles.rowText, { color: colors.textTertiary }]}>Private</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Data source badge
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Last updated
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastUpdatedText: {
    fontSize: 12,
  },

  // Trust footer
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  trustFooterText: {
    fontSize: 12,
  },

  // Full variant
  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  fullLabel: {
    ...Typography.subheadline,
    fontWeight: '600',
  },
  fullDescription: {
    ...Typography.caption,
  },

  // Minimal variant
  minimalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  minimalText: {
    fontSize: 12,
  },

  // Row variant
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowDivider: {
    width: 1,
    height: 12,
  },
  rowText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Security badge
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  securityText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default TrustBadge;
