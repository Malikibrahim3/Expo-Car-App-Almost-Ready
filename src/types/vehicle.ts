/**
 * Enhanced Vehicle Data Models - "Optimal Sell Time" Focus
 * Refactored from debt tracking to identifying when to swap without losing money
 */

export type VehicleCategory = 'economy' | 'premium' | 'ev' | 'exotic';
export type FinanceType = 'pcp' | 'hp' | 'cash';
export type FinancialStatus = 'winning' | 'losing' | 'breakeven';
export type SaleType = 'trade_in' | 'private';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  mileage: number;
  expectedMonthlyMileage: number;
  
  // Purchase info
  purchasePrice: number;  // Retail price paid
  purchaseDate: Date;
  
  // Finance details
  financing: {
    type: FinanceType;
    deposit?: number;
    loanAmount?: number;           // Original loan amount
    termMonths?: number;
    interestRate?: number;         // APR
    balloonPayment?: number;       // GMFV for PCP
    startDate?: Date;
    monthlyPayment?: number;
    monthsElapsed?: number;
  };
  
  // Current values
  tradeInValue: number;            // What dealer would pay (quick sale)
  privateValue: number;            // What private buyer would pay
  settlementFigure: number;        // Cost to clear finance (principal + penalty)
  
  // Projections
  projections: MonthlyProjection[];
  swapWindow: SwapWindow;
  recommendation: VehicleRecommendation;
}

export interface MonthlyProjection {
  month: number;
  monthLabel: string;              // "Jan 2025"
  
  // Values
  tradeInValue: number;
  privateValue: number;
  settlementFigure: number;        // Cost to clear finance at this point
  
  // The key metric: Cash position
  cashPosition: {
    tradeIn: number;               // Trade-in value - settlement
    private: number;               // Private value - settlement
  };
  
  // Status
  status: FinancialStatus;
  isOptimalMonth: boolean;
  isBreakEvenMonth: boolean;
  isBalloonMonth: boolean;
  isContractEnd: boolean;
}

export interface SwapWindow {
  startMonth: number;              // When positive equity begins
  endMonth: number;                // Contract end / when equity disappears
  peakMonth: number;               // Maximum equity month
  peakEquity: number;              // Maximum equity amount
  currentMonth: number;
  isInWindow: boolean;             // Currently in the "green zone"
}

export interface VehicleRecommendation {
  action: 'sell_now' | 'wait' | 'urgent';
  headline: string;                // "You're winning!" or "Cost to change: £500"
  subtext: string;                 // Explanation
  
  // Comparison data
  currentCashPosition: number;
  optimalCashPosition: number;
  optimalMonth: number;
  improvementPotential: number;
  
  // PCP-specific
  apathyWarning?: {
    handBackValue: number;         // £0 if just hand keys back
    sellValue: number;             // What they'd get selling
    lostMoney: number;             // Difference
  };
}

export interface FinancialSummary {
  // The main number users see
  cashPosition: number;            // Positive = "Cash for Next Deposit", Negative = "Cost to Change"
  status: FinancialStatus;
  
  // Supporting data
  tradeInValue: number;
  privateValue: number;
  settlementFigure: number;
  
  // Labels (user-friendly)
  statusLabel: string;             // "Cash for Next Deposit" or "Shortfall / Cost to Change"
  actionLabel: string;             // "You get a check" or "You write a check"
}

export interface CategoryCharacteristics {
  name: string;
  monthlyDepreciationRate: number;
  annualDepreciationRate: number;
  driveOffDepreciation: number;    // Immediate 10-15% drop
  description: string;
  guidance: string;
  icon: string;
}

// Settlement calculation inputs
export interface SettlementCalculation {
  principalRemaining: number;
  interestPenalty: number;         // Early settlement penalty
  totalSettlement: number;
  monthsRemaining: number;
}
