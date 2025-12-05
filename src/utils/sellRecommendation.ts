/**
 * Sell Recommendation Engine
 * 
 * Provides clear, actionable recommendations with:
 * - Confidence intervals for sell timing
 * - Edge case warnings (high mileage, balloon loans, market volatility)
 * - User-friendly status messages
 * - Explanation of why optimal ≠ peak equity
 */

import { MonthlyProjection, VehicleCategory } from '../types/vehicle';

// ============================================================================
// TYPES
// ============================================================================

export interface SellRecommendation {
  status: 'optimal_now' | 'good_to_sell' | 'wait' | 'too_early' | 'approaching_optimal' | 'optimal_passed';
  headline: string;
  subtext: string;
  actionLabel: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  optimalWindow: {
    startMonth: number;
    endMonth: number;
    peakMonth: number;
  };
  equityRange: {
    low: number;
    expected: number;
    high: number;
  };
  // True profit/loss = equity - deposit (what you actually gain/lose)
  trueProfitRange: {
    low: number;
    expected: number;
    high: number;
  };
  currentEquity: number;
  currentTrueProfit: number; // equity - deposit
  depositPaid: number;
  warnings: EdgeWarning[];
  // Helper for UI consistency
  statusColor: string;
  statusBgColor: string;
  statusIcon: 'trending_up' | 'clock' | 'check' | 'alert';
  // Explanation for why optimal timing matters
  timingExplanation: string | null;
}

export interface EdgeWarning {
  type: 'high_mileage' | 'balloon_due' | 'warranty_expiring' | 'market_volatile' | 'deep_underwater' | 'end_of_term' | 'optimal_vs_peak';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  icon: string;
}

export interface VehicleFinanceData {
  purchasePrice: number;
  currentValue: number;
  payoffAmount: number;
  monthsElapsed: number;
  termMonths: number;
  monthlyPayment: number;
  balloonPayment: number;
  ownershipType: 'loan' | 'lease' | 'balloon' | 'cash';
  mileage: number;
  annualMileage: number;
  category: VehicleCategory;
  depositPaid: number; // Upfront deposit/down payment
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MILEAGE_THRESHOLDS = {
  high: 15000,
  extreme: 25000,
};

const WARRANTY_MONTHS = 36;
const MILEAGE_CLIFFS = [30000, 60000, 100000];

// ============================================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================================

export function generateSellRecommendation(
  vehicle: VehicleFinanceData,
  projections: MonthlyProjection[]
): SellRecommendation {
  const currentEquity = vehicle.currentValue - vehicle.payoffAmount;
  const depositPaid = vehicle.depositPaid || 0;
  const currentTrueProfit = currentEquity - depositPaid; // What you actually gain/lose
  
  // Find optimal window from projections
  const optimalProjection = projections.find(p => p.isOptimalMonth);
  const optimalMonth = optimalProjection ? projections.indexOf(optimalProjection) : findPeakEquityMonth(projections);
  const peakEquityMonth = findPeakEquityMonth(projections);
  
  // Calculate confidence interval (±2-3 months based on volatility)
  const volatility = calculateVolatility(projections);
  const windowSize = volatility === 'high' ? 4 : volatility === 'medium' ? 3 : 2;
  
  const optimalWindow = {
    startMonth: Math.max(0, optimalMonth - windowSize),
    endMonth: Math.min(projections.length - 1, optimalMonth + windowSize),
    peakMonth: optimalMonth,
  };
  
  // Calculate equity range with confidence intervals
  const peakEquity = projections[optimalMonth]?.cashPosition?.tradeIn || 0;
  const equityVariance = Math.abs(peakEquity) * (volatility === 'high' ? 0.15 : volatility === 'medium' ? 0.10 : 0.05);
  
  const equityRange = {
    low: Math.round(peakEquity - equityVariance),
    expected: Math.round(peakEquity),
    high: Math.round(peakEquity + equityVariance),
  };
  
  // True profit = equity - deposit (accounts for money already put in)
  const trueProfitRange = {
    low: Math.round(peakEquity - equityVariance - depositPaid),
    expected: Math.round(peakEquity - depositPaid),
    high: Math.round(peakEquity + equityVariance - depositPaid),
  };
  
  // Determine recommendation status
  const monthsToOptimal = optimalMonth - vehicle.monthsElapsed;
  const isInWindow = vehicle.monthsElapsed >= optimalWindow.startMonth && 
                     vehicle.monthsElapsed <= optimalWindow.endMonth;
  const hasPassed = vehicle.monthsElapsed > optimalWindow.endMonth;
  
  const confidenceLevel = determineConfidence(volatility);
  
  // Generate warnings including optimal vs peak explanation
  const warnings = detectEdgeWarnings(vehicle, projections, optimalMonth, peakEquityMonth);
  
  // Generate timing explanation if optimal ≠ peak
  const timingExplanation = generateTimingExplanation(optimalMonth, peakEquityMonth, vehicle);
  
  const statusResult = generateStatusMessage(
    currentEquity,
    monthsToOptimal,
    isInWindow,
    hasPassed,
    equityRange,
    vehicle,
    optimalWindow,
    trueProfitRange
  );
  
  return {
    status: statusResult.status,
    headline: statusResult.headline,
    subtext: statusResult.subtext,
    actionLabel: statusResult.actionLabel,
    statusColor: statusResult.statusColor,
    statusBgColor: statusResult.statusBgColor,
    statusIcon: statusResult.statusIcon,
    confidenceLevel,
    optimalWindow,
    equityRange,
    trueProfitRange,
    currentEquity,
    currentTrueProfit,
    depositPaid,
    warnings,
    timingExplanation,
  };
}

// ============================================================================
// TIMING EXPLANATION - Why optimal ≠ peak
// ============================================================================

function generateTimingExplanation(
  optimalMonth: number,
  peakEquityMonth: number,
  vehicle: VehicleFinanceData
): string | null {
  // If optimal and peak are the same or very close, no explanation needed
  if (Math.abs(optimalMonth - peakEquityMonth) <= 2) {
    return null;
  }
  
  // Optimal is BEFORE peak - explain why
  if (optimalMonth < peakEquityMonth) {
    const monthsDiff = peakEquityMonth - optimalMonth;
    return `We recommend selling ${monthsDiff} months before peak equity because: ` +
      `(1) Each extra month ties up your money with diminishing returns, ` +
      `(2) Market conditions can change, and ` +
      `(3) Mileage and wear reduce value faster in later months. ` +
      `The "optimal" time balances maximum equity with minimum risk.`;
  }
  
  // Optimal is AFTER peak (rare, usually for leases)
  return `The optimal time accounts for your specific finance structure. ` +
    `For leases and balloon loans, the buyout amount changes how equity builds over time.`;
}

// ============================================================================
// EDGE WARNING DETECTION
// ============================================================================

function detectEdgeWarnings(
  vehicle: VehicleFinanceData,
  projections: MonthlyProjection[],
  optimalMonth: number,
  peakEquityMonth: number
): EdgeWarning[] {
  const warnings: EdgeWarning[] = [];
  const currentEquity = vehicle.currentValue - vehicle.payoffAmount;
  
  // 0. Explain optimal vs peak if they differ significantly
  if (Math.abs(optimalMonth - peakEquityMonth) > 3) {
    warnings.push({
      type: 'optimal_vs_peak',
      severity: 'info',
      title: 'Why Not Wait for Peak?',
      message: `Peak equity is at month ${peakEquityMonth}, but we recommend month ${optimalMonth}. Waiting longer has diminishing returns and increases risk.`,
      icon: '💡',
    });
  }
  
  // 1. High Mileage Warning
  if (vehicle.annualMileage >= MILEAGE_THRESHOLDS.extreme) {
    warnings.push({
      type: 'high_mileage',
      severity: 'warning',
      title: 'Extreme Mileage',
      message: `At ${vehicle.annualMileage.toLocaleString()} mi/year, your car is depreciating faster than average. Consider selling sooner.`,
      icon: '🚗💨',
    });
  } else if (vehicle.annualMileage >= MILEAGE_THRESHOLDS.high) {
    warnings.push({
      type: 'high_mileage',
      severity: 'info',
      title: 'Above Average Mileage',
      message: `Your ${vehicle.annualMileage.toLocaleString()} mi/year is above average. This affects resale value.`,
      icon: '📊',
    });
  }
  
  // 2. Approaching Mileage Cliff
  const projectedMileageAtOptimal = vehicle.mileage + 
    (vehicle.annualMileage / 12) * (optimalMonth - vehicle.monthsElapsed);
  
  for (const cliff of MILEAGE_CLIFFS) {
    if (vehicle.mileage < cliff && projectedMileageAtOptimal >= cliff) {
      warnings.push({
        type: 'high_mileage',
        severity: 'warning',
        title: `Approaching ${(cliff / 1000).toFixed(0)}k Mile Mark`,
        message: `Your car will cross ${cliff.toLocaleString()} miles before optimal sell time. Consider selling before this threshold.`,
        icon: '⚠️',
      });
      break;
    }
  }
  
  // 3. Balloon Payment Warning
  if (vehicle.ownershipType === 'balloon' && vehicle.balloonPayment > 0) {
    const monthsUntilBalloon = vehicle.termMonths - vehicle.monthsElapsed;
    
    if (monthsUntilBalloon <= 6) {
      warnings.push({
        type: 'balloon_due',
        severity: 'critical',
        title: 'Balloon Payment Due Soon',
        message: `Your $${vehicle.balloonPayment.toLocaleString()} balloon payment is due in ${monthsUntilBalloon} months. Plan your exit strategy now.`,
        icon: '🎈',
      });
    } else if (monthsUntilBalloon <= 12) {
      warnings.push({
        type: 'balloon_due',
        severity: 'warning',
        title: 'Balloon Payment Approaching',
        message: `$${vehicle.balloonPayment.toLocaleString()} balloon due in ${monthsUntilBalloon} months. Start planning.`,
        icon: '🎈',
      });
    }
  }
  
  // 4. Warranty Expiring
  if (vehicle.monthsElapsed < WARRANTY_MONTHS && 
      vehicle.monthsElapsed >= WARRANTY_MONTHS - 3) {
    warnings.push({
      type: 'warranty_expiring',
      severity: 'info',
      title: 'Warranty Expiring Soon',
      message: 'Factory warranty expires at 36 months. Cars typically lose 5% value after warranty ends.',
      icon: '🛡️',
    });
  }
  
  // 5. Deep Underwater Warning
  if (currentEquity < -5000) {
    warnings.push({
      type: 'deep_underwater',
      severity: 'warning',
      title: 'Significantly Underwater',
      message: `You're $${Math.abs(currentEquity).toLocaleString()} underwater. Selling now would require bringing money to close.`,
      icon: '📉',
    });
  }
  
  // 6. End of Term Warning
  if (vehicle.monthsElapsed >= vehicle.termMonths - 3 && vehicle.ownershipType !== 'cash') {
    warnings.push({
      type: 'end_of_term',
      severity: 'info',
      title: 'Near End of Finance Term',
      message: 'Your loan is almost paid off. Consider your options: keep, sell, or trade.',
      icon: '🏁',
    });
  }
  
  return warnings;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findPeakEquityMonth(projections: MonthlyProjection[]): number {
  let peakIdx = 0;
  let peakEquity = -Infinity;
  
  for (let i = 0; i < projections.length; i++) {
    const equity = projections[i]?.cashPosition?.tradeIn || 0;
    if (equity > peakEquity) {
      peakEquity = equity;
      peakIdx = i;
    }
  }
  
  return peakIdx;
}

function calculateVolatility(projections: MonthlyProjection[]): 'high' | 'medium' | 'low' {
  if (projections.length < 12) return 'low';
  
  const changes: number[] = [];
  for (let i = 1; i < Math.min(projections.length, 24); i++) {
    const prev = projections[i - 1]?.cashPosition?.tradeIn || 0;
    const curr = projections[i]?.cashPosition?.tradeIn || 0;
    changes.push(Math.abs(curr - prev));
  }
  
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
  
  if (avgChange > 500) return 'high';
  if (avgChange > 250) return 'medium';
  return 'low';
}

function determineConfidence(volatility: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
  if (volatility === 'high') return 'low';
  if (volatility === 'medium') return 'medium';
  return 'high';
}

interface StatusResult {
  status: SellRecommendation['status'];
  headline: string;
  subtext: string;
  actionLabel: string;
  statusColor: string;
  statusBgColor: string;
  statusIcon: SellRecommendation['statusIcon'];
}

function generateStatusMessage(
  currentEquity: number,
  monthsToOptimal: number,
  isInWindow: boolean,
  hasPassed: boolean,
  equityRange: { low: number; expected: number; high: number },
  vehicle: VehicleFinanceData,
  optimalWindow: { startMonth: number; endMonth: number; peakMonth: number },
  trueProfitRange: { low: number; expected: number; high: number }
): StatusResult {
  // Use true profit (deposit-adjusted) for user-facing messages
  const depositPaid = vehicle.depositPaid || 0;
  const trueProfit = currentEquity - depositPaid;
  const hasDeposit = depositPaid > 0;
  
  // Helper to format the profit number
  const formatProfit = (val: number) => {
    const prefix = val >= 0 ? '+' : '-';
    return `${prefix}$${Math.abs(val).toLocaleString()}`;
  };
  
  // Too early (< 6 months)
  if (vehicle.monthsElapsed < 6) {
    return {
      status: 'too_early',
      headline: 'Too Early to Sell',
      subtext: `Wait at least ${6 - vehicle.monthsElapsed} more months. New cars lose value fastest in the first 6 months.`,
      actionLabel: 'Set Reminder',
      statusColor: '#EF4444',
      statusBgColor: 'rgba(239, 68, 68, 0.15)',
      statusIcon: 'alert',
    };
  }
  
  // OPTIMAL WINDOW HAS PASSED - sell now is best remaining option
  if (hasPassed && currentEquity >= 0) {
    return {
      status: 'optimal_passed',
      headline: 'Sell Now — Best Remaining Option',
      subtext: `Optimal window passed. ${hasDeposit ? 'Real profit' : 'You\'d pocket'}: ${formatProfit(trueProfit)}.`,
      actionLabel: 'See Selling Options',
      statusColor: '#F59E0B',
      statusBgColor: 'rgba(245, 158, 11, 0.15)',
      statusIcon: 'trending_up',
    };
  }
  
  // Optimal passed but underwater - tough situation
  if (hasPassed && trueProfit < 0) {
    return {
      status: 'optimal_passed',
      headline: 'Optimal Window Passed',
      subtext: `Currently ${formatProfit(trueProfit)}. Consider refinancing or holding.`,
      actionLabel: 'See Options',
      statusColor: '#EF4444',
      statusBgColor: 'rgba(239, 68, 68, 0.15)',
      statusIcon: 'alert',
    };
  }
  
  // Deep underwater (not passed yet)
  if (trueProfit < -5000) {
    const waitText = monthsToOptimal > 0 
      ? `Optimal window in ~${monthsToOptimal} months.`
      : 'Position may improve as loan pays down.';
    return {
      status: 'wait',
      headline: 'Wait — Underwater',
      subtext: `Currently ${formatProfit(trueProfit)}. ${waitText}`,
      actionLabel: 'Set Reminder',
      statusColor: '#EF4444',
      statusBgColor: 'rgba(239, 68, 68, 0.15)',
      statusIcon: 'clock',
    };
  }
  
  // Optimal now (in window)
  if (isInWindow && currentEquity >= 0) {
    const rangeText = hasDeposit
      ? `${formatProfit(trueProfitRange.low)} to ${formatProfit(trueProfitRange.high)}`
      : `${formatProfit(equityRange.low)} to ${formatProfit(equityRange.high)}`;
    
    return {
      status: 'optimal_now',
      headline: '🎯 Optimal Sell Window',
      subtext: `Best time to sell. Expected: ${rangeText}`,
      actionLabel: 'See Selling Options',
      statusColor: '#22C55E',
      statusBgColor: 'rgba(34, 197, 94, 0.15)',
      statusIcon: 'check',
    };
  }
  
  // In window but slightly underwater - still good to consider
  if (isInWindow && trueProfit >= -2000) {
    return {
      status: 'good_to_sell',
      headline: 'Near Break-Even',
      subtext: `You're close to break-even. Selling now means minimal out-of-pocket.`,
      actionLabel: 'See Selling Options',
      statusColor: '#FFB800',
      statusBgColor: 'rgba(255, 184, 0, 0.15)',
      statusIcon: 'trending_up',
    };
  }
  
  // Good to sell (positive equity, close to window)
  if (trueProfit >= 0 && monthsToOptimal <= 3 && monthsToOptimal >= 0) {
    return {
      status: 'good_to_sell',
      headline: 'Good Time to Sell',
      subtext: `${hasDeposit ? 'Real profit' : 'You\'d pocket'}: ${formatProfit(trueProfit)}. Peak in ${monthsToOptimal} months.`,
      actionLabel: 'See Selling Options',
      statusColor: '#FFB800',
      statusBgColor: 'rgba(255, 184, 0, 0.15)',
      statusIcon: 'trending_up',
    };
  }
  
  // Approaching optimal (3-6 months out)
  if (monthsToOptimal > 0 && monthsToOptimal <= 6) {
    return {
      status: 'approaching_optimal',
      headline: 'Approaching Optimal Window',
      subtext: `${monthsToOptimal} months until best sell time. Expected: ${formatProfit(hasDeposit ? trueProfitRange.expected : equityRange.expected)}`,
      actionLabel: 'Set Reminder',
      statusColor: '#3B82F6',
      statusBgColor: 'rgba(59, 130, 246, 0.15)',
      statusIcon: 'clock',
    };
  }
  
  // Default: wait (more than 6 months out)
  return {
    status: 'wait',
    headline: 'Wait for Better Timing',
    subtext: monthsToOptimal > 0 
      ? `Optimal window in ${monthsToOptimal} months. Expected: ${formatProfit(hasDeposit ? trueProfitRange.expected : equityRange.expected)}`
      : 'Your position will improve over time.',
    actionLabel: 'Set Reminder',
    statusColor: '#F59E0B',
    statusBgColor: 'rgba(245, 158, 11, 0.15)',
    statusIcon: 'clock',
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

export function formatConfidenceInterval(equityRange: SellRecommendation['equityRange']): string {
  if (equityRange.low === equityRange.high) {
    return `~$${equityRange.expected.toLocaleString()}`;
  }
  return `$${equityRange.low.toLocaleString()} - $${equityRange.high.toLocaleString()}`;
}

export function formatTrueProfitRange(profitRange: SellRecommendation['trueProfitRange']): string {
  const formatValue = (val: number) => {
    const prefix = val >= 0 ? '+' : '';
    return `${prefix}$${Math.abs(val).toLocaleString()}`;
  };
  
  if (profitRange.low === profitRange.high) {
    return formatValue(profitRange.expected);
  }
  return `${formatValue(profitRange.low)} to ${formatValue(profitRange.high)}`;
}

export function formatOptimalWindow(
  window: SellRecommendation['optimalWindow'],
  currentMonth: number
): string {
  if (currentMonth > window.endMonth) {
    return 'Passed';
  }
  if (currentMonth >= window.startMonth && currentMonth <= window.endMonth) {
    return 'Now';
  }
  const monthsUntilStart = window.startMonth - currentMonth;
  return `In ${monthsUntilStart} months`;
}

export function getConfidenceBadge(level: SellRecommendation['confidenceLevel']): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (level) {
    case 'high':
      return { label: 'High Confidence', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.12)' };
    case 'medium':
      return { label: 'Medium Confidence', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.12)' };
    case 'low':
      return { label: 'Estimate Only', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.12)' };
  }
}
