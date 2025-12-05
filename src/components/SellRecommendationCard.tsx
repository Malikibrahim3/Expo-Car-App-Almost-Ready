/**
 * SellRecommendationCard
 * 
 * Displays actionable sell recommendations with:
 * - Clear status headline
 * - Confidence intervals
 * - Edge case warnings
 * - Optimal window visualization
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Info,
  AlertCircle,
} from 'lucide-react-native';
import { 
  SellRecommendation, 
  EdgeWarning,
  getConfidenceBadge,
} from '../utils/sellRecommendation';
import { Spacing, Radius, Typography } from '../constants/LinearDesign';

interface Props {
  recommendation: SellRecommendation;
  colors: any;
  onAction?: () => void;
}

export default function SellRecommendationCard({ 
  recommendation, 
  colors, 
  onAction,
}: Props) {
  const { status, headline, subtext, actionLabel, confidenceLevel, warnings, statusColor, statusBgColor, timingExplanation } = recommendation;
  
  // Use colors from recommendation for consistency
  const statusConfig = getStatusConfig(status, colors, statusColor, statusBgColor);
  const confidenceBadge = getConfidenceBadge(confidenceLevel);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Main Recommendation */}
      <View style={styles.mainSection}>
        <View style={[styles.statusIcon, { backgroundColor: statusConfig.bgColor }]}>
          {statusConfig.icon}
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.headline, { color: statusConfig.color }]}>
            {headline}
          </Text>
          <Text style={[styles.subtext, { color: colors.textSecondary }]}>
            {subtext}
          </Text>
        </View>
      </View>
      
      {/* Confidence indicator - simple, non-redundant */}
      <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>
            Estimate Confidence
          </Text>
          <View style={[styles.confidenceBadge, { backgroundColor: confidenceBadge.bgColor }]}>
            <Text style={[styles.confidenceText, { color: confidenceBadge.color }]}>
              {confidenceBadge.label}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Timing Explanation - Why optimal ≠ peak */}
      {timingExplanation && (
        <View style={[styles.explanationSection, { borderTopColor: colors.border, backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
          <Text style={[styles.explanationTitle, { color: '#3B82F6' }]}>
            💡 Why This Timing?
          </Text>
          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
            {timingExplanation}
          </Text>
        </View>
      )}
      
      {/* Edge Warnings */}
      {warnings.length > 0 && (
        <View style={[styles.warningsSection, { borderTopColor: colors.border }]}>
          {warnings.slice(0, 2).map((warning, idx) => (
            <WarningItem key={idx} warning={warning} colors={colors} />
          ))}
          {warnings.length > 2 && (
            <Text style={[styles.moreWarnings, { color: colors.textTertiary }]}>
              +{warnings.length - 2} more considerations
            </Text>
          )}
        </View>
      )}
      
      {/* Action Button */}
      {onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: statusConfig.buttonBg },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.actionText, { color: statusConfig.buttonText }]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ============================================================================
// WARNING ITEM COMPONENT
// ============================================================================

function WarningItem({ warning, colors }: { warning: EdgeWarning; colors: any }) {
  const severityConfig = getSeverityConfig(warning.severity, colors);
  
  return (
    <View style={[styles.warningItem, { backgroundColor: severityConfig.bgColor }]}>
      <View style={styles.warningIcon}>
        <Text style={styles.warningEmoji}>{warning.icon}</Text>
      </View>
      <View style={styles.warningContent}>
        <Text style={[styles.warningTitle, { color: severityConfig.color }]}>
          {warning.title}
        </Text>
        <Text style={[styles.warningMessage, { color: colors.textSecondary }]} numberOfLines={2}>
          {warning.message}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusConfig(status: SellRecommendation['status'], colors: any, statusColor?: string, statusBgColor?: string) {
  // Use provided colors if available for consistency
  const color = statusColor || colors.text;
  const bgColor = statusBgColor || colors.surfaceHover;
  
  switch (status) {
    case 'optimal_now':
      return {
        icon: <CheckCircle size={24} color={color} />,
        color,
        bgColor,
        buttonBg: color,
        buttonText: '#FFFFFF',
      };
    case 'good_to_sell':
      return {
        icon: <TrendingUp size={24} color={color} />,
        color,
        bgColor,
        buttonBg: color,
        buttonText: '#000000',
      };
    case 'optimal_passed':
      return {
        icon: <TrendingUp size={24} color={color} />,
        color,
        bgColor,
        buttonBg: color,
        buttonText: '#000000',
      };
    case 'approaching_optimal':
      return {
        icon: <Clock size={24} color={color} />,
        color,
        bgColor,
        buttonBg: color,
        buttonText: '#FFFFFF',
      };
    case 'wait':
      return {
        icon: <Clock size={24} color={color} />,
        color,
        bgColor,
        buttonBg: colors.surface,
        buttonText: colors.text,
      };
    case 'too_early':
      return {
        icon: <AlertCircle size={24} color={color} />,
        color,
        bgColor,
        buttonBg: colors.surface,
        buttonText: colors.text,
      };
    default:
      return {
        icon: <Info size={24} color={colors.textSecondary} />,
        color: colors.textSecondary,
        bgColor: colors.surfaceHover,
        buttonBg: colors.surface,
        buttonText: colors.text,
      };
  }
}

function getSeverityConfig(severity: EdgeWarning['severity'], colors: any) {
  switch (severity) {
    case 'critical':
      return {
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.08)',
      };
    case 'warning':
      return {
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.08)',
      };
    case 'info':
    default:
      return {
        color: colors.textSecondary,
        bgColor: colors.surfaceHover,
      };
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mainSection: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    ...Typography.headline,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtext: {
    ...Typography.footnote,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    ...Typography.caption2,
    marginBottom: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  confidenceText: {
    ...Typography.caption2,
    fontWeight: '600',
  },
  explanationSection: {
    borderTopWidth: 1,
    padding: Spacing.sm,
  },
  explanationTitle: {
    ...Typography.footnote,
    fontWeight: '600',
    marginBottom: 4,
  },
  explanationText: {
    ...Typography.caption,
    lineHeight: 18,
  },
  warningsSection: {
    borderTopWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  warningItem: {
    flexDirection: 'row',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  warningIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningEmoji: {
    fontSize: 18,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    ...Typography.footnote,
    fontWeight: '600',
    marginBottom: 2,
  },
  warningMessage: {
    ...Typography.caption,
    lineHeight: 16,
  },
  moreWarnings: {
    ...Typography.caption,
    textAlign: 'center',
    paddingTop: 4,
  },
  actionButton: {
    margin: Spacing.md,
    marginTop: 0,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  actionText: {
    ...Typography.callout,
    fontWeight: '600',
  },
});
