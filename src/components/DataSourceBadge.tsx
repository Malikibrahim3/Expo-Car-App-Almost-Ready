/**
 * DataSourceBadge - Shows where vehicle data comes from
 * Builds credibility by attributing data sources
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Shield, Clock, CheckCircle } from 'lucide-react-native';
import { useThemeMode } from '@/src/context/ThemeContext';
import { Typography, Radius, Spacing } from '@/src/constants/LinearDesign';
import { IOSText as Text } from './ios';

interface DataSourceBadgeProps {
  source?: 'market' | 'kbb' | 'edmunds' | 'nada';
  lastUpdated?: Date | string;
  variant?: 'inline' | 'card';
  showVerified?: boolean;
}

const SOURCES = {
  market: { name: 'Market Data', icon: '📊' },
  kbb: { name: 'Kelley Blue Book', icon: '📘' },
  edmunds: { name: 'Edmunds', icon: '🚗' },
  nada: { name: 'NADA Guides', icon: '📋' },
};

function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function DataSourceBadge({ 
  source = 'market', 
  lastUpdated, 
  variant = 'inline',
  showVerified = true 
}: DataSourceBadgeProps) {
  const { colors } = useThemeMode();
  const sourceInfo = SOURCES[source];
  const timeAgo = lastUpdated ? getTimeAgo(lastUpdated) : null;

  if (variant === 'card') {
    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardRow}>
          <Shield size={14} color={colors.positive} />
          <Text style={[styles.cardSource, { color: colors.text }]}>
            {sourceInfo.icon} Powered by {sourceInfo.name}
          </Text>
        </View>
        {timeAgo && (
          <View style={styles.cardRow}>
            <Clock size={12} color={colors.textTertiary} />
            <Text style={[styles.cardTime, { color: colors.textTertiary }]}>
              Updated {timeAgo}
            </Text>
          </View>
        )}
        {showVerified && (
          <View style={styles.cardRow}>
            <CheckCircle size={12} color={colors.positive} />
            <Text style={[styles.cardVerified, { color: colors.positive }]}>
              Verified data source
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Inline variant
  return (
    <View style={styles.inlineContainer}>
      <View style={[styles.inlineBadge, { backgroundColor: colors.brandSubtle }]}>
        <Text style={[styles.inlineText, { color: colors.textSecondary }]}>
          {sourceInfo.icon} {sourceInfo.name}
        </Text>
      </View>
      {timeAgo && (
        <View style={styles.inlineTime}>
          <Clock size={10} color={colors.textTertiary} />
          <Text style={[styles.inlineTimeText, { color: colors.textTertiary }]}>
            {timeAgo}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Card variant
  cardContainer: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSource: {
    ...Typography.subheadline,
    fontWeight: '500',
  },
  cardTime: {
    ...Typography.caption,
  },
  cardVerified: {
    ...Typography.caption,
    fontWeight: '500',
  },

  // Inline variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  inlineText: {
    fontSize: 11,
    fontWeight: '500',
  },
  inlineTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineTimeText: {
    fontSize: 11,
  },
});

export default DataSourceBadge;
