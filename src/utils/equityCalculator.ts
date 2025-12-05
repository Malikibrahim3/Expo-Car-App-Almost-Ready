/**
 * Equity Calculator - "Real World" Math
 * 
 * HYBRID APPROACH:
 * - CURRENT VALUE: Uses MarketCheck API data (cached) when available
 * - FUTURE PROJECTIONS: Uses calibrated depreciation formula from current value
 * - FALLBACK: Pure formula when no market data exists
 * 
 * CORE FORMULA: Net Sale Position = Car Value - Remaining Finance Balance
 * 
 * This is NOT:
 * ❌ Car Value - Total Money Spent
 * ❌ Car Value - Total Loan Paid So Far  
 * ❌ Car Value - Original Loan Amount
 * 
 * This IS:
 * ✅ Current Market Value - What You Still Owe Today
 * 
 * WHY THIS MATTERS:
 * - Optimal sell time is when this GAP is maximized
 * - Typically in the MIDDLE of the loan (not at the end!)
 * - Early years: value drops fast, loan doesn't → negative position
 * - Middle years: depreciation slows, loan drops faster → position peaks
 * - Later years: car value plummets → position shrinks again
 * 
 * Key Features:
 * - Settlement Figure = Principal Remaining + Interest Penalty
 * - PCP accounts for Balloon Payment (GMFV)
 * - Uses REAL market data for current value (MarketCheck API)
 * - Calibrated depreciation curves for future projections
 */

import { 
  FinanceType, 
  FinancialStatus, 
  MonthlyProjection, 
  SwapWindow,
  SettlementCalculation,
  CategoryCharacteristics,
  VehicleCategory
} from '../types/vehicle';

// Drive-off depreciation by category (retail to trade-in gap)
// This is the immediate hit when you drive off the lot
// Drive-off depreciation: the gap between what you paid and trade-in value
// This is INCLUDED in year 1 depreciation, not added on top
// Real data: Most cars lose 10-20% in year 1 TOTAL, not drive-off + year 1
const DRIVE_OFF_RATES: Record<VehicleCategory, number> = {
  economy: 0.09,    // 9% immediate (trade-in vs retail gap)
  premium: 0.12,    // 12% - luxury has bigger retail/trade gap
  ev: 0.10,         // 10% - EVs similar to economy
  exotic: 0.05,     // 5% - exotics hold better
};

// CALIBRATED DEPRECIATION CURVES - Based on real market data (KBB/Edmunds 2023-2024)
// 
// Real-world total depreciation benchmarks:
// - Economy (Toyota Camry, Honda Civic): 
//   Year 1: 12-15%, Year 2: 18-22%, Year 3: 25-30%, Year 5: 40-45%
// - Premium (BMW 3-Series, Mercedes C-Class):
//   Year 1: 15-20%, Year 2: 25-30%, Year 3: 35-40%, Year 5: 50-55%
// - EV (Tesla Model 3, Model Y):
//   Year 1: 10-15%, Year 2: 18-22%, Year 3: 25-30%, Year 5: 35-40%
// - Exotic (Porsche 911, Land Cruiser):
//   Year 1: 5-10%, Year 2: 10-15%, Year 3: 15-20%, Year 5: 25-30%
//
// These rates are AFTER drive-off, applied monthly
const YEARLY_DEPRECIATION: Record<VehicleCategory, Record<number, number>> = {
  economy: {
    1: 0.05,   // 5% in year 1 (after 9% drive-off = ~14% total year 1)
    2: 0.06,   // 6% in year 2 (~20% cumulative)
    3: 0.05,   // 5% in year 3 (~25% cumulative)
    4: 0.04,   // 4% in year 4 (~29% cumulative)
    5: 0.04,   // 4% in year 5 (~33% cumulative)
    6: 0.03,   // 3% in year 6+
  },
  premium: {
    1: 0.08,   // 8% in year 1 (after 12% drive-off = ~20% total year 1)
    2: 0.08,   // 8% in year 2 (~28% cumulative)
    3: 0.07,   // 7% in year 3 (~35% cumulative)
    4: 0.06,   // 6% in year 4 (~41% cumulative)
    5: 0.05,   // 5% in year 5 (~46% cumulative)
    6: 0.04,   // 4% in year 6+
  },
  ev: {
    1: 0.06,   // 6% in year 1 (after 10% drive-off = ~16% total year 1)
    2: 0.06,   // 6% in year 2 (~22% cumulative)
    3: 0.05,   // 5% in year 3 (~27% cumulative)
    4: 0.04,   // 4% in year 4 (~31% cumulative)
    5: 0.03,   // 3% in year 5 (~34% cumulative)
    6: 0.03,   // 3% in year 6+ (EVs stabilize well)
  },
  exotic: {
    1: 0.04,   // 4% in year 1 (after 5% drive-off = ~9% total year 1)
    2: 0.04,   // 4% in year 2 (~13% cumulative)
    3: 0.03,   // 3% in year 3 (~16% cumulative)
    4: 0.03,   // 3% in year 4 (~19% cumulative)
    5: 0.02,   // 2% in year 5 (~21% cumulative)
    6: 0.02,   // 2% in year 6+ (exotics hold exceptionally well)
  },
};

// Mileage cliffs - values drop disproportionately at these thresholds
// Based on real auction data: buyers pay significantly less at these milestones
const MILEAGE_CLIFFS = [
  { threshold: 30000, penalty: 0.03 },   // 3% drop at 30k (warranty concerns)
  { threshold: 60000, penalty: 0.06 },   // 6% drop at 60k (major service due)
  { threshold: 100000, penalty: 0.10 },  // 10% drop at 100k (psychological barrier)
];

// Warranty expiry penalties
const WARRANTY_EXPIRY_MONTHS = 36;  // 3 years typical manufacturer warranty
const WARRANTY_EXPIRY_PENALTY = 0.05;  // 5% drop when warranty expires

/**
 * Calculate the Settlement Figure (Cost to Clear Finance)
 * This is what you'd actually pay to close the loan TODAY
 * 
 * IMPORTANT: Includes INTEREST REBATE on early settlement
 * Under UK Consumer Credit Act, you get back most of the future interest
 * you would have paid. This makes early settlement CHEAPER than just
 * paying the remaining principal.
 * 
 * Settlement = Principal Remaining - Interest Rebate + Early Settlement Fee
 */
export const calculateSettlementFigure = (
  originalLoan: number,
  monthlyPayment: number,
  interestRate: number,
  termMonths: number,
  monthsElapsed: number,
  financeType: FinanceType,
  balloonPayment: number = 0
): SettlementCalculation => {
  if (financeType === 'cash') {
    return {
      principalRemaining: 0,
      interestPenalty: 0,
      totalSettlement: 0,
      monthsRemaining: 0
    };
  }

  const monthsRemaining = Math.max(0, termMonths - monthsElapsed);
  const monthlyRate = interestRate / 100 / 12;
  
  let principalRemaining: number;
  let interestRebate: number = 0;
  
  if (financeType === 'pcp') {
    // PCP: Principal amortizes linearly, balloon is always owed
    const totalPrincipalToPay = originalLoan - balloonPayment;
    const principalPerMonth = totalPrincipalToPay / termMonths;
    const principalPaid = principalPerMonth * monthsElapsed;
    
    // Remaining = what's left of regular principal + balloon
    principalRemaining = (totalPrincipalToPay - principalPaid) + balloonPayment;
    
    // Calculate interest rebate for PCP
    // You save interest on both the amortizing portion AND the balloon
    const totalInterest = (monthlyPayment * termMonths) - totalPrincipalToPay;
    const interestPerMonth = totalInterest / termMonths;
    const remainingInterest = interestPerMonth * monthsRemaining;
    
    // Rebate is typically 90% of remaining interest (actuarial method)
    interestRebate = remainingInterest * 0.90;
    
  } else {
    // HP: Standard amortization
    const factor = Math.pow(1 + monthlyRate, termMonths);
    const factorElapsed = Math.pow(1 + monthlyRate, monthsElapsed);
    
    if (factor === 1 || monthlyRate === 0) {
      principalRemaining = originalLoan * (1 - monthsElapsed / termMonths);
    } else {
      principalRemaining = originalLoan * (factor - factorElapsed) / (factor - 1);
    }
    
    // Calculate interest rebate for HP
    // Total interest over life of loan
    const totalPayments = monthlyPayment * termMonths;
    const totalInterest = totalPayments - originalLoan;
    
    // Interest paid so far (sum of interest portions)
    let interestPaid = 0;
    let balance = originalLoan;
    for (let m = 0; m < monthsElapsed; m++) {
      const interestThisMonth = balance * monthlyRate;
      interestPaid += interestThisMonth;
      const principalThisMonth = monthlyPayment - interestThisMonth;
      balance -= principalThisMonth;
    }
    
    // Remaining interest = total - paid
    const remainingInterest = totalInterest - interestPaid;
    
    // Rebate is typically 90% of remaining interest
    interestRebate = remainingInterest * 0.90;
  }
  
  // Early settlement fee (typically 1-2 months interest, capped at 58 days under UK FCA)
  const earlySettlementFee = principalRemaining * monthlyRate * 1.5; // ~1.5 months
  
  // Final settlement = principal - rebate + fee
  const totalSettlement = principalRemaining - interestRebate + earlySettlementFee;
  
  return {
    principalRemaining: Math.max(0, principalRemaining),
    interestPenalty: Math.max(0, earlySettlementFee - interestRebate), // Net of rebate
    totalSettlement: Math.max(0, totalSettlement),
    monthsRemaining
  };
};

/**
 * Calculate Trade-In Value at a given month
 * 
 * REALISTIC DEPRECIATION MODEL:
 * - Year 1: FAST depreciation (drive-off + first year)
 * - Year 2-3: SLOWING depreciation (value stabilizes)
 * - Year 4+: SLOW, STABLE depreciation
 * 
 * This creates the "sweet spot" in years 2-3 where:
 * - Car value has stabilized
 * - Loan balance is dropping faster than value
 * - Net position PEAKS in the MIDDLE of the loan
 * 
 * Additional factors:
 * - Mileage cliffs at 30k, 60k, 100k
 * - Warranty expiry penalty at 36 months
 */
export const calculateTradeInValue = (
  retailPrice: number,
  category: VehicleCategory,
  monthsOwned: number,
  currentMileage: number,
  expectedAnnualMileage: number = 10000
): number => {
  // Apply immediate drive-off depreciation (month 0)
  const driveOffRate = DRIVE_OFF_RATES[category];
  let value = retailPrice * (1 - driveOffRate);
  
  // Apply DECELERATING yearly depreciation
  // This is the KEY fix: depreciation SLOWS DOWN over time
  const yearlyRates = YEARLY_DEPRECIATION[category];
  
  for (let m = 0; m < monthsOwned; m++) {
    const year = Math.floor(m / 12) + 1;
    const yearRate = yearlyRates[Math.min(year, 6)] || yearlyRates[6];
    const monthlyRate = yearRate / 12;
    value *= (1 - monthlyRate);
  }
  
  // Apply warranty expiry penalty (typically at 36 months)
  if (monthsOwned >= WARRANTY_EXPIRY_MONTHS) {
    value *= (1 - WARRANTY_EXPIRY_PENALTY);
  }
  
  // Apply mileage cliff penalties
  for (const cliff of MILEAGE_CLIFFS) {
    if (currentMileage >= cliff.threshold) {
      value *= (1 - cliff.penalty);
    }
  }
  
  // Linear mileage adjustment for deviation from average (±2% per 5000 miles)
  const expectedMileage = (expectedAnnualMileage / 12) * monthsOwned;
  const mileageDiff = currentMileage - expectedMileage;
  const mileageAdjustment = 1 - (mileageDiff / 5000) * 0.02;
  value *= Math.max(0.7, Math.min(1.3, mileageAdjustment));
  
  // Floor at 15% of original value (cars don't go to zero)
  const floorValue = retailPrice * 0.15;
  
  return Math.max(floorValue, value);
};

/**
 * Calculate Private Sale Value (typically 10-15% higher than trade-in)
 */
export const calculatePrivateValue = (tradeInValue: number): number => {
  return tradeInValue * 1.12; // 12% premium for private sale
};

/**
 * Calculate Cash Position (The Key Metric)
 * Positive = "Cash for Next Deposit"
 * Negative = "Cost to Change"
 */
export const calculateCashPosition = (
  tradeInValue: number,
  settlementFigure: number
): number => {
  return tradeInValue - settlementFigure;
};

/**
 * Determine financial status from cash position
 */
export const getFinancialStatus = (cashPosition: number): FinancialStatus => {
  if (cashPosition > 200) return 'winning';
  if (cashPosition < -200) return 'losing';
  return 'breakeven';
};

/**
 * SELL TIMING CRITERIA - Clear financial parameters
 * 
 * OPTIMAL TO SELL NOW (Gold):
 * - Net position is positive (you walk away with money)
 * - Current month is within 3 months of peak optimal month
 * - OR net position is > $2,000 and within optimal window
 * 
 * GOOD TO SELL (Green):
 * - Net position is positive
 * - Not yet at optimal, but approaching it
 * 
 * WAIT (Orange):
 * - Net position is negative
 * - OR too early (< 12 months into loan)
 * - Better position coming in future
 * 
 * TOO EARLY (Red):
 * - Less than 6 months into ownership
 * - Deep negative position (> $5,000 underwater)
 */
export const SELL_TIMING = {
  MIN_MONTHS_BEFORE_SELL: 6,        // Don't recommend selling before 6 months
  OPTIMAL_WINDOW_MONTHS: 3,         // Within 3 months of peak = "optimal now"
  MIN_POSITIVE_FOR_GOOD: 500,       // Need at least $500 positive to be "good"
  MIN_POSITIVE_FOR_OPTIMAL: 2000,   // Need at least $2,000 for "optimal"
  DEEP_NEGATIVE_THRESHOLD: -5000,   // Below this = "too early"
  SWEET_SPOT_START: 24,             // Optimal window typically starts month 24
  SWEET_SPOT_END: 48,               // Optimal window typically ends month 48
};

/**
 * Generate monthly projections for the swap window chart
 */
export const generateProjections = (
  retailPrice: number,
  category: VehicleCategory,
  financeType: FinanceType,
  originalLoan: number,
  monthlyPayment: number,
  interestRate: number,
  termMonths: number,
  currentMonthsElapsed: number,
  balloonPayment: number = 0,
  currentMileage: number = 0,       // Current mileage (what the odometer shows NOW)
  expectedAnnualMileage: number = 10000
): MonthlyProjection[] => {
  const projections: MonthlyProjection[] = [];
  const totalMonths = termMonths + 6; // Project 6 months past contract end
  
  let peakEquity = -Infinity;
  let peakMonth = 0;
  let breakEvenMonth = -1;
  
  // Track the rate of change to find true optimal (not just end of loan)
  let foundTruePeak = false;
  
  // Calculate starting mileage by working backwards from current mileage
  // If user has owned car for 24 months and has 50,000 miles now with 12,000/year rate,
  // then starting mileage was approximately 50,000 - (24 * 1,000) = 26,000 miles
  const monthlyMileageRate = expectedAnnualMileage / 12;
  const estimatedStartingMileage = Math.max(0, currentMileage - (monthlyMileageRate * currentMonthsElapsed));
  
  // Track equity growth rates to find optimal point
  // The optimal point is where the RATE of equity growth starts declining
  // This is the "diminishing returns" point - after this, each month yields less benefit
  const equityHistory: { month: number; equity: number; growthRate: number }[] = [];
  
  // First pass: calculate all equity values
  const tempProjections: { month: number; equity: number; tradeInValue: number; settlement: number }[] = [];
  
  // FIRST PASS: Calculate all equity values to analyze the curve
  for (let month = 0; month <= totalMonths; month++) {
    const monthsOwned = month;
    const projectedMileage = estimatedStartingMileage + (monthlyMileageRate * monthsOwned);
    
    const tradeInValue = calculateTradeInValue(
      retailPrice, category, monthsOwned, projectedMileage, expectedAnnualMileage
    );
    
    const settlement = calculateSettlementFigure(
      originalLoan, monthlyPayment, interestRate, termMonths, month, financeType, balloonPayment
    );
    
    const equity = calculateCashPosition(tradeInValue, settlement.totalSettlement);
    tempProjections.push({ month, equity, tradeInValue, settlement: settlement.totalSettlement });
    
    // Track absolute peak
    if (equity > peakEquity) {
      peakEquity = equity;
    }
  }
  
  // SECOND PASS: Find optimal using COMBINED SCORING
  // 
  // The optimal sell point balances THREE factors:
  // 1. ABSOLUTE EQUITY - How much money you walk away with
  // 2. EFFICIENCY - Equity per month held (return on time)
  // 3. TIMING - Sweet spot is 60-85% through the loan term
  // 
  // KEY INSIGHT: The optimal sell point is NOT necessarily the peak equity month.
  // It's the point where equity is good AND you're not too close to end-of-term.
  
  let maxScore = -Infinity;
  let maxScoreMonth = 0;
  
  // Calculate growth rates for all months
  const growthRates: number[] = [];
  for (let i = 0; i < tempProjections.length; i++) {
    if (i === 0) {
      growthRates.push(0);
    } else {
      growthRates.push(tempProjections[i].equity - tempProjections[i - 1].equity);
    }
  }
  
  // Smooth growth rates with 3-month rolling average
  const smoothedGrowth: number[] = [];
  for (let i = 0; i < growthRates.length; i++) {
    if (i < 3) {
      smoothedGrowth.push(growthRates[i]);
    } else {
      const avg = (growthRates[i] + growthRates[i - 1] + growthRates[i - 2]) / 3;
      smoothedGrowth.push(avg);
    }
  }
  
  // Find when growth rate peaks and starts declining (diminishing returns point)
  let peakGrowthMonth = 12;
  let peakGrowthRate = -Infinity;
  for (let i = 12; i < Math.min(termMonths - 3, smoothedGrowth.length); i++) {
    if (smoothedGrowth[i] > peakGrowthRate) {
      peakGrowthRate = smoothedGrowth[i];
      peakGrowthMonth = i;
    }
  }
  
  // Find when growth drops to 50% of peak
  let diminishingReturnsMonth = peakGrowthMonth;
  for (let i = peakGrowthMonth; i < Math.min(termMonths - 3, smoothedGrowth.length); i++) {
    if (smoothedGrowth[i] < peakGrowthRate * 0.5) {
      diminishingReturnsMonth = i;
      break;
    }
  }
  
  // Define the "sweet spot" window (60-85% of term)
  const sweetSpotStart = Math.floor(termMonths * 0.60);
  const sweetSpotEnd = Math.floor(termMonths * 0.85);
  const endOfTermThreshold = Math.floor(termMonths * 0.85);
  
  // Find optimal using combined scoring
  for (let i = 12; i < tempProjections.length - 6; i++) {
    const current = tempProjections[i];
    const currentGrowth = smoothedGrowth[i];
    const futureGrowth = smoothedGrowth[Math.min(i + 6, smoothedGrowth.length - 1)];
    
    equityHistory.push({ month: current.month, equity: current.equity, growthRate: currentGrowth });
    
    // Skip if equity is negative (can't sell profitably)
    if (current.equity < 0) continue;
    
    // Base score: equity value
    let score = current.equity;
    
    // Efficiency bonus: equity per month held
    const efficiency = current.equity / current.month;
    score += efficiency * 50;
    
    // Sweet spot bonus: months 60-85% of term get a boost
    if (current.month >= sweetSpotStart && current.month <= sweetSpotEnd) {
      score *= 1.3;
    }
    
    // Diminishing returns bonus: sell when growth is slowing
    if (current.month >= diminishingReturnsMonth && current.month <= diminishingReturnsMonth + 6) {
      score *= 1.2;
    }
    
    // BONUS: Before warranty expiry (month 33-35)
    if (current.month >= 33 && current.month <= 35) {
      score += current.equity * 0.15;
    }
    
    // BONUS: Before mileage cliffs
    const projectedMileage = estimatedStartingMileage + (monthlyMileageRate * current.month);
    const upcomingMileage = projectedMileage + (monthlyMileageRate * 6);
    for (const cliff of MILEAGE_CLIFFS) {
      if (projectedMileage < cliff.threshold && upcomingMileage >= cliff.threshold) {
        score += current.equity * cliff.penalty * 2;
      }
    }
    
    // STRONG penalty for end-of-term (last 15% of loan)
    // This prevents defaulting to end-of-term
    if (current.month > endOfTermThreshold) {
      const penaltyFactor = 1 - ((current.month - endOfTermThreshold) / (termMonths - endOfTermThreshold)) * 0.5;
      score *= penaltyFactor;
    }
    
    // Penalty for very early (first 30% of term)
    if (current.month < termMonths * 0.30) {
      score *= 0.7;
    }
    
    // Track best score
    if (score > maxScore) {
      maxScore = score;
      maxScoreMonth = current.month;
    }
  }
  
  // Set optimal month from scoring
  if (maxScoreMonth > 0) {
    peakMonth = maxScoreMonth;
    foundTruePeak = true;
  }
  
  // Fallback: if scoring didn't find anything, use first month with good equity
  if (!foundTruePeak) {
    for (const p of tempProjections) {
      if (p.equity > SELL_TIMING.MIN_POSITIVE_FOR_OPTIMAL && p.month >= 18 && p.month <= 48) {
        peakMonth = p.month;
        foundTruePeak = true;
        break;
      }
    }
  }
  
  // THIRD PASS: Build final projections
  for (let month = 0; month <= totalMonths; month++) {
    const monthsOwned = month;
    const projectedMileage = estimatedStartingMileage + (monthlyMileageRate * monthsOwned);
    
    const tradeInValue = calculateTradeInValue(
      retailPrice, category, monthsOwned, projectedMileage, expectedAnnualMileage
    );
    const privateValue = calculatePrivateValue(tradeInValue);
    
    const settlement = calculateSettlementFigure(
      originalLoan, monthlyPayment, interestRate, termMonths, month, financeType, balloonPayment
    );
    
    const tradeInCash = calculateCashPosition(tradeInValue, settlement.totalSettlement);
    const privateCash = calculateCashPosition(privateValue, settlement.totalSettlement);
    
    const status = getFinancialStatus(tradeInCash);
    
    if (breakEvenMonth === -1 && tradeInCash >= 0) {
      breakEvenMonth = month;
    }
    
    const date = new Date();
    date.setMonth(date.getMonth() + (month - currentMonthsElapsed));
    const monthLabel = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    
    projections.push({
      month,
      monthLabel,
      tradeInValue,
      privateValue,
      settlementFigure: settlement.totalSettlement,
      cashPosition: {
        tradeIn: tradeInCash,
        private: privateCash
      },
      status,
      isOptimalMonth: false,
      isBreakEvenMonth: month === breakEvenMonth,
      isBalloonMonth: financeType === 'pcp' && month === termMonths,
      isContractEnd: month === termMonths
    });
  }
  
  // Mark optimal month
  if (projections[peakMonth]) {
    projections[peakMonth].isOptimalMonth = true;
  }
  
  return projections;
};

/**
 * HYBRID PROJECTIONS - Uses real market data when available
 * 
 * This is the PREFERRED method when you have MarketCheck API data.
 * It grounds the current value in reality and projects forward from there.
 * 
 * @param marketValue - Current value from MarketCheck API (or cache)
 * @param marketTradeIn - Trade-in value from MarketCheck
 * @param marketPrivate - Private party value from MarketCheck
 * @param valueConfidence - 'high' (fresh API), 'medium' (cached), 'low' (estimate)
 */
export const generateHybridProjections = (
  // Market data (from MarketCheck API/cache)
  marketValue: number | null,
  marketTradeIn: number | null,
  marketPrivate: number | null,
  valueConfidence: 'high' | 'medium' | 'low' | 'estimate',
  // Vehicle info
  retailPrice: number,
  category: VehicleCategory,
  // Finance info
  financeType: FinanceType,
  originalLoan: number,
  monthlyPayment: number,
  interestRate: number,
  termMonths: number,
  currentMonthsElapsed: number,
  balloonPayment: number = 0,
  // Mileage info
  currentMileage: number = 0,
  expectedAnnualMileage: number = 10000
): MonthlyProjection[] => {
  
  // If we have market data, use it as the anchor for current month
  // Otherwise fall back to formula-based calculation
  const hasMarketData = marketValue && marketValue > 0;
  
  if (!hasMarketData) {
    // No market data - use pure formula approach
    return generateProjections(
      retailPrice, category, financeType, originalLoan, monthlyPayment,
      interestRate, termMonths, currentMonthsElapsed, balloonPayment,
      currentMileage, expectedAnnualMileage
    );
  }
  
  // HYBRID APPROACH: Use market data for current, project forward
  const projections: MonthlyProjection[] = [];
  const totalMonths = termMonths + 6;
  const monthlyMileageRate = expectedAnnualMileage / 12;
  
  // Monthly depreciation rates for projections (calibrated to real data)
  const monthlyDepreciation: Record<VehicleCategory, number> = {
    economy: 0.004,   // ~5% per year
    premium: 0.006,   // ~7% per year
    ev: 0.005,        // ~6% per year
    exotic: 0.003,    // ~3.5% per year
  };
  
  let peakEquity = -Infinity;
  let peakMonth = 0;
  let breakEvenMonth = -1;
  
  // Calculate projections
  for (let month = 0; month <= totalMonths; month++) {
    let tradeInValue: number;
    let privateValue: number;
    
    if (month === currentMonthsElapsed) {
      // CURRENT MONTH: Use actual market data
      tradeInValue = marketTradeIn || marketValue * 0.88;
      privateValue = marketPrivate || marketValue * 1.05;
    } else if (month < currentMonthsElapsed) {
      // PAST: Estimate backwards from current (less accurate)
      const monthsBack = currentMonthsElapsed - month;
      const appreciationFactor = Math.pow(1 + monthlyDepreciation[category], monthsBack);
      tradeInValue = (marketTradeIn || marketValue * 0.88) * appreciationFactor;
      privateValue = (marketPrivate || marketValue * 1.05) * appreciationFactor;
    } else {
      // FUTURE: Project forward from current market value
      const monthsForward = month - currentMonthsElapsed;
      const depreciationFactor = Math.pow(1 - monthlyDepreciation[category], monthsForward);
      
      // Additional mileage depreciation
      const additionalMiles = monthlyMileageRate * monthsForward;
      const mileageDepreciation = 1 - (additionalMiles * 0.00003); // ~$0.03/mile impact
      
      tradeInValue = (marketTradeIn || marketValue * 0.88) * depreciationFactor * mileageDepreciation;
      privateValue = (marketPrivate || marketValue * 1.05) * depreciationFactor * mileageDepreciation;
      
      // Floor at 15% of current value
      tradeInValue = Math.max(marketValue * 0.15, tradeInValue);
      privateValue = Math.max(marketValue * 0.18, privateValue);
    }
    
    // Calculate settlement
    const settlement = calculateSettlementFigure(
      originalLoan, monthlyPayment, interestRate, termMonths, month, financeType, balloonPayment
    );
    
    const tradeInCash = calculateCashPosition(tradeInValue, settlement.totalSettlement);
    const privateCash = calculateCashPosition(privateValue, settlement.totalSettlement);
    const status = getFinancialStatus(tradeInCash);
    
    if (breakEvenMonth === -1 && tradeInCash >= 0) {
      breakEvenMonth = month;
    }
    
    if (tradeInCash > peakEquity && month >= 12 && month <= termMonths - 3) {
      peakEquity = tradeInCash;
      peakMonth = month;
    }
    
    const date = new Date();
    date.setMonth(date.getMonth() + (month - currentMonthsElapsed));
    const monthLabel = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    
    projections.push({
      month,
      monthLabel,
      tradeInValue: Math.round(tradeInValue),
      privateValue: Math.round(privateValue),
      settlementFigure: settlement.totalSettlement,
      cashPosition: {
        tradeIn: Math.round(tradeInCash),
        private: Math.round(privateCash)
      },
      status,
      isOptimalMonth: false,
      isBreakEvenMonth: month === breakEvenMonth,
      isBalloonMonth: financeType === 'pcp' && month === termMonths,
      isContractEnd: month === termMonths,
      // Add confidence indicator for UI
      valueSource: month === currentMonthsElapsed ? 'market' : 'projected',
    } as MonthlyProjection);
  }
  
  // Mark optimal month
  if (projections[peakMonth]) {
    projections[peakMonth].isOptimalMonth = true;
  }
  
  return projections;
};

/**
 * Calculate the Swap Window (Green Zone)
 */
export const calculateSwapWindow = (
  projections: MonthlyProjection[],
  currentMonth: number
): SwapWindow => {
  let startMonth = -1;
  let endMonth = projections.length - 1;
  let peakMonth = 0;
  let peakEquity = -Infinity;
  
  for (let i = 0; i < projections.length; i++) {
    const p = projections[i];
    
    // Find when positive equity starts
    if (startMonth === -1 && p.cashPosition.tradeIn >= 0) {
      startMonth = i;
    }
    
    // Find when positive equity ends (after starting)
    if (startMonth !== -1 && p.cashPosition.tradeIn < 0 && i > startMonth) {
      endMonth = i - 1;
      break;
    }
    
    // Track peak
    if (p.cashPosition.tradeIn > peakEquity) {
      peakEquity = p.cashPosition.tradeIn;
      peakMonth = i;
    }
    
    // Contract end is a natural boundary
    if (p.isContractEnd) {
      endMonth = i;
    }
  }
  
  return {
    startMonth: Math.max(0, startMonth),
    endMonth,
    peakMonth,
    peakEquity,
    currentMonth,
    isInWindow: currentMonth >= startMonth && currentMonth <= endMonth && startMonth !== -1
  };
};

/**
 * Get user-friendly status label
 */
export const getStatusLabel = (cashPosition: number): string => {
  if (cashPosition >= 0) {
    return 'Cash for Next Deposit';
  }
  return 'Cost to Change';
};

/**
 * Get action label - the key question answered
 */
export const getActionLabel = (cashPosition: number): string => {
  if (cashPosition >= 0) {
    return 'You get a check';
  }
  return 'You write a check';
};

/**
 * Format currency for UK market
 */
export const formatCurrency = (value: number, showSign: boolean = false): string => {
  const absValue = Math.abs(value);
  const formatted = `£${absValue.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
  
  if (showSign) {
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
  }
  
  return formatted;
};

/**
 * Determine sell timing recommendation based on clear financial criteria
 */
export type SellTimingStatus = 'optimal_now' | 'good_to_sell' | 'wait' | 'too_early';

export const getSellTimingStatus = (
  currentNetPosition: number,
  currentMonth: number,
  optimalMonth: number,
  optimalNetPosition: number
): { status: SellTimingStatus; reason: string } => {
  const monthsToOptimal = optimalMonth - currentMonth;
  
  // TOO EARLY: Less than 6 months in OR deep negative
  if (currentMonth < SELL_TIMING.MIN_MONTHS_BEFORE_SELL) {
    return {
      status: 'too_early',
      reason: `Too early — wait at least ${SELL_TIMING.MIN_MONTHS_BEFORE_SELL - currentMonth} more months`
    };
  }
  
  if (currentNetPosition < SELL_TIMING.DEEP_NEGATIVE_THRESHOLD) {
    return {
      status: 'too_early',
      reason: `Deep negative position — you'd owe $${Math.round(Math.abs(currentNetPosition)).toLocaleString()}`
    };
  }
  
  // WAIT: Negative position with better times ahead
  if (currentNetPosition < 0) {
    if (monthsToOptimal > 0 && optimalNetPosition > 0) {
      return {
        status: 'wait',
        reason: `Wait ${monthsToOptimal} months — position improves to +$${Math.round(optimalNetPosition).toLocaleString()}`
      };
    }
    return {
      status: 'wait',
      reason: `Negative position — you'd owe $${Math.round(Math.abs(currentNetPosition)).toLocaleString()}`
    };
  }
  
  // OPTIMAL NOW: Within window of peak AND good position
  if (Math.abs(monthsToOptimal) <= SELL_TIMING.OPTIMAL_WINDOW_MONTHS && 
      currentNetPosition >= SELL_TIMING.MIN_POSITIVE_FOR_OPTIMAL) {
    return {
      status: 'optimal_now',
      reason: `Optimal window — walk away with +$${Math.round(currentNetPosition).toLocaleString()}`
    };
  }
  
  // OPTIMAL NOW: At or past peak with good position
  if (monthsToOptimal <= 0 && currentNetPosition >= SELL_TIMING.MIN_POSITIVE_FOR_GOOD) {
    return {
      status: 'optimal_now',
      reason: `At peak — walk away with +$${Math.round(currentNetPosition).toLocaleString()}`
    };
  }
  
  // GOOD TO SELL: Positive but not yet optimal
  if (currentNetPosition >= SELL_TIMING.MIN_POSITIVE_FOR_GOOD) {
    if (monthsToOptimal > SELL_TIMING.OPTIMAL_WINDOW_MONTHS) {
      const extraIfWait = optimalNetPosition - currentNetPosition;
      return {
        status: 'good_to_sell',
        reason: `Good now (+$${Math.round(currentNetPosition).toLocaleString()}) • Optimal in ${monthsToOptimal}mo (+$${Math.round(extraIfWait).toLocaleString()} more)`
      };
    }
    return {
      status: 'good_to_sell',
      reason: `Good position — walk away with +$${Math.round(currentNetPosition).toLocaleString()}`
    };
  }
  
  // WAIT: Small positive, better to wait
  return {
    status: 'wait',
    reason: `Near break-even — wait for better position`
  };
};

/**
 * Calculate PCP Apathy Warning
 * Shows what user loses by just handing keys back vs selling
 */
export const calculateApathyWarning = (
  tradeInValue: number,
  settlementFigure: number,
  balloonPayment: number
): { handBackValue: number; sellValue: number; lostMoney: number } | null => {
  // Only relevant for PCP with positive equity
  const cashPosition = tradeInValue - settlementFigure;
  
  if (cashPosition <= 0) return null;
  
  return {
    handBackValue: 0,              // Hand keys back = £0
    sellValue: cashPosition,       // What they'd get selling
    lostMoney: cashPosition        // Money left on table
  };
};
