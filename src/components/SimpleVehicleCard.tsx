/**
 * SimpleVehicleCard - iOS-style vehicle card
 * Shows Net Sale Position (what you'd walk away with after clearing finance)
 * Clean layout with clear hierarchy
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight, Zap, TrendingUp, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Shadows, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useSubscriptionContext } from '@/src/context/SubscriptionContext';
import { VehicleImage } from './VehicleImage';

interface SimpleVehicleCardProps {
  id: string;
  name: string;
  nickname?: string | null;
  make: string;
  model: string;
  year: number;
  trim?: string;
  exteriorColor?: string;
  equity: number;
  estimatedValue?: number | null;
  tradeInValue?: number | null;
  privatePartyValue?: number | null;
  monthsToPositive?: number;
  hasDailyRefresh?: boolean;
  loanAmount?: number;
  payoffAmount?: number;
  financeType?: string;
  optimalSellMonth?: string | null;
  optimalSellEquity?: number | null;
  monthsUntilOptimal?: number | null;
  onPress: () => void;
}

export default function SimpleVehicleCard({
  id,
  name,
  nickname,
  make,
  model,
  year,
  equity,
  estimatedValue,
  hasDailyRefresh,
  loanAmount,
  payoffAmount,
  financeType,
  optimalSellMonth,
  optimalSellEquity,
  monthsUntilOptimal,
  onPress,
}: SimpleVehicleCardProps) {
  const { colors } = useThemeMode();
  const { isPro } = useSubscriptionContext();
  const isPositive = equity >= 0;

  const showDailyBadge = isPro && hasDailyRefresh !== false;

  // Loan payoff progress
  const hasLoan = financeType && financeType !== 'Cash' && loanAmount && loanAmount > 0;
  const paidOff = hasLoan ? Math.max(0, (loanAmount || 0) - (payoffAmount || 0)) : 0;
  const payoffProgress = hasLoan ? Math.min(1, paidOff / (loanAmount || 1)) : 0;

  // Smart recommendation based on optimal sell window:
  // - Shows when net sale position is maximized
  // - Positive = good to sell, Negative = wait for better position
  // Format currency without decimals
  const fmt = (n: number) => Math.round(n).toLocaleString();

  const getRecommendation = () => {
    const hasOptimalData = monthsUntilOptimal !== null && monthsUntilOptimal !== undefined;
    
    if (isPositive) {
      // Optimal time is now or passed
      if (!hasOptimalData || monthsUntilOptimal <= 0) {
        // Only show "Optimal" if position is > $2,000
        if (equity >= 2000) {
          return { text: `Optimal — sell now (+$${fmt(equity)})`, color: '#FFB800', bgColor: 'rgba(255, 184, 0, 0.15)', icon: 'up' };
        }
        // Otherwise just "Good to sell"
        return { text: `Good to sell (+$${fmt(equity)})`, color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.15)', icon: 'up' };
      } else {
        // Could save more by waiting
        const extra = optimalSellEquity && optimalSellEquity > equity 
          ? ` (save +$${fmt(optimalSellEquity - equity)} more)`
          : '';
        return { 
          text: `Good now • Best: ${optimalSellMonth || `${monthsUntilOptimal}mo`}${extra}`,
          color: colors.positive,
          icon: 'up'
        };
      }
    } else {
      // Better to wait for optimal timing
      if (hasOptimalData && monthsUntilOptimal > 0) {
        return { 
          text: `Wait — optimal: ${optimalSellMonth || `${monthsUntilOptimal}mo`}`,
          color: colors.warning,
          bgColor: colors.warningBg,
          icon: 'wait'
        };
      }
      // Show how much they'd owe
      if (equity < -5000) {
        return { text: `Too early — you'd owe $${fmt(Math.abs(equity))}`, color: colors.negative, bgColor: colors.negativeBg, icon: 'wait' };
      }
      return { text: `Wait — you'd owe $${fmt(Math.abs(equity))}`, color: colors.warning, bgColor: colors.warningBg, icon: 'wait' };
    }
  };

  const recommendation = getRecommendation();

  return (
    <Pressable
      onPress={() => { haptic.light(); onPress(); }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        isPro && styles.proCard,
        Shadows.sm,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
      accessibilityLabel={`${name}, net sale position ${isPositive ? 'positive' : 'negative'} ${fmt(Math.abs(equity))} dollars`}
      accessibilityRole="button"
    >
      {/* Pro Daily Refresh Badge */}
      {showDailyBadge && (
        <View style={styles.dailyBadgeContainer}>
          <LinearGradient colors={['#FFD700', '#FFA500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dailyBadge}>
            <Zap size={10} color="#fff" fill="#fff" />
            <Text style={styles.dailyBadgeText}>Daily</Text>
          </LinearGradient>
        </View>
      )}

      {/* Main Row: Image + Info + Equity */}
      <View style={styles.mainRow}>
        <VehicleImage make={make} model={model} year={year} size="medium" />
        
        <View style={styles.infoSection}>
          {/* Vehicle Name - Larger */}
          {nickname ? (
            <>
              <Text style={[styles.nickname, { color: colors.text }]} numberOfLines={1}>{nickname}</Text>
              <Text style={[styles.subname, { color: colors.textSecondary }]} numberOfLines={1}>{name}</Text>
            </>
          ) : (
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          )}
          
          {/* Car Value */}
          {estimatedValue && estimatedValue > 0 && (
            <Text style={[styles.valueText, { color: colors.textSecondary }]}>
              Worth ${fmt(estimatedValue)}
            </Text>
          )}
        </View>

        {/* Net Sale Position Display - Right side */}
        <View style={styles.equitySection}>
          <Text style={[styles.equityValue, { color: isPositive ? colors.positive : colors.negative }]}>
            {isPositive ? '+' : '−'}${fmt(Math.abs(equity))}
          </Text>
          <Text style={[styles.equityLabel, { color: colors.textTertiary }]}>
            {isPositive ? "you'd walk away" : "you'd owe"}
          </Text>
        </View>

        <ChevronRight size={20} color={colors.textQuaternary} />
      </View>

      {/* Recommendation Banner */}
      <View style={[styles.recommendationRow, { backgroundColor: recommendation.bgColor || (isPositive ? colors.positiveBg : colors.warningBg) }]}>
        {recommendation.icon === 'up' ? (
          <TrendingUp size={16} color={recommendation.color} />
        ) : (
          <Clock size={16} color={recommendation.color} />
        )}
        <Text style={[styles.recommendationText, { color: recommendation.color }]}>
          {recommendation.text}
        </Text>
      </View>

      {/* Loan Payoff Progress Bar - Full Width at Bottom */}
      {hasLoan && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Loan payoff</Text>
            <Text style={[styles.progressPercent, { color: payoffProgress >= 1 ? colors.positive : colors.brand }]}>
              {Math.round(payoffProgress * 100)}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${payoffProgress * 100}%`,
                  backgroundColor: payoffProgress >= 1 ? colors.positive : colors.brand,
                }
              ]} 
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    position: 'relative',
  },
  proCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  dailyBadgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dailyBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoSection: {
    flex: 1,
  },
  nickname: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  subname: {
    fontSize: 14,
    letterSpacing: -0.08,
    marginTop: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.08,
    marginTop: 4,
  },
  equitySection: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  equityValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0,
  },
  equityLabel: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0,
  },
  // Recommendation banner
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.08,
    flex: 1,
  },
  // Progress bar at bottom
  progressSection: {
    marginTop: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.08,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.08,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
