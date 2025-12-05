/**
 * Stress Test Suite Configuration
 * 
 * Central configuration for all test parameters, thresholds, and gates.
 * Modify thresholds here to adjust pass/fail criteria.
 */

module.exports = {
  // ============================================================================
  // PASS/FAIL THRESHOLDS (CI GATES)
  // ============================================================================
  gates: {
    // Golden-100 Historical Suite
    golden100: {
      pctWithin1Month: 0.88,      // ≥88% within ±1 month
      pctWithin2Months: 0.95,     // ≥95% within ±2 months
      falsePositives: 0,          // Zero false positives allowed
      equityAmountPct80: 0.05,    // ±5% for 80% of cases
      equityAmountPct95: 0.10,    // ±10% for 95% of cases
    },
    
    // Balloon/PCP Set
    balloon: {
      accuracy: 0.90,             // ≥90% correct balloon handling
    },
    
    // Monte Carlo Simulations
    monteCarlo: {
      pctWithin3Months: 0.88,     // ≥88% within ±3 months
      falsePositiveRate: 0.01,    // ≤1% false positive rate
      runs: 10000,                // Number of simulations
    },
    
    // Edge Case Battery
    edgeCases: {
      maxFailures: 2,             // ≤2 failures across 200 cases
      totalCases: 200,
    },
    
    // Regression vs Baseline
    regression: {
      maeMonths: 0.6,             // MAE ≤0.6 months
      maxDelta: 6,                // Max single-case delta ≤6 months
      medianEquityPctDelta: 0.04, // Median equity % change ≤4%
    },
    
    // Performance
    performance: {
      avgSecondsPerCar: 0.5,      // <0.5s average
      maxSecondsPerCar: 1.0,      // Fail if >1s average
      memoryGrowthMB: 50,         // Max memory growth over 10 runs
    },
  },

  // ============================================================================
  // TEST CONFIGURATION
  // ============================================================================
  testConfig: {
    // Exclude first/last months from optimal window consideration
    excludeFirstMonths: 12,
    excludeLastMonths: 3,
    
    // Monte Carlo perturbation ranges
    monteCarlo: {
      mileageMultiplier: { min: 0.5, max: 3.5 },
      monthlyMarketShock: { min: -0.30, max: 0.30 },
      aprRange: { min: 0, max: 20 },
      downPaymentRange: { min: 0, max: 0.50 },
      terms: [24, 36, 48, 60, 72, 84],
      residualRange: { min: 0.30, max: 0.70 },
      dealPriceVariance: 0.10,
    },
    
    // Finance parameter defaults
    finance: {
      defaultTerms: [36, 48, 60, 72],
      defaultAprRange: { min: 3.0, max: 8.0 },
      defaultDepositRange: { min: 0.05, max: 0.15 },
      defaultBalloonRange: { min: 0.35, max: 0.55 },
    },
    
    // Mileage options
    mileage: {
      annualOptions: [4000, 6000, 8000, 10000, 12000, 15000, 20000, 25000],
      cliffs: [30000, 60000, 100000],
    },
  },

  // ============================================================================
  // ALERT CONFIGURATION
  // ============================================================================
  alerts: {
    // High severity triggers
    highSeverity: {
      monteCarloFalsePositiveRate: 0.01,
      monteCarloWithin3Months: 0.88,
      edgeCaseFailures: 2,
    },
    
    // Production monitoring thresholds
    production: {
      predictionErrorSpikeDays: 7,
      predictionErrorSpikeMonths: 1,
      conversionDropPct: 0.20,
      conversionDropDays: 14,
    },
  },

  // ============================================================================
  // OUTPUT CONFIGURATION
  // ============================================================================
  output: {
    resultsDir: 'tests/stress-suite/results',
    goldenDataDir: 'tests/stress-suite/golden-data',
    baselineDir: 'tests/stress-suite/baseline',
    
    files: {
      summary: 'stress-test-summary.json',
      failures: 'failing-cases.csv',
      metrics: 'metrics.json',
      monteCarlo: 'monte-carlo-results.json',
      explainability: 'explainability-artifacts',
    },
  },

  // ============================================================================
  // VEHICLE CATEGORIES - CALIBRATED to real market data (KBB/Edmunds 2023-2024)
  // ============================================================================
  categories: {
    economy: {
      driveOffRate: 0.09,
      yearlyDepreciation: { 1: 0.05, 2: 0.06, 3: 0.05, 4: 0.04, 5: 0.04, 6: 0.03 },
    },
    premium: {
      driveOffRate: 0.12,
      yearlyDepreciation: { 1: 0.08, 2: 0.08, 3: 0.07, 4: 0.06, 5: 0.05, 6: 0.04 },
    },
    ev: {
      driveOffRate: 0.10,
      yearlyDepreciation: { 1: 0.06, 2: 0.06, 3: 0.05, 4: 0.04, 5: 0.03, 6: 0.03 },
    },
    exotic: {
      driveOffRate: 0.05,
      yearlyDepreciation: { 1: 0.04, 2: 0.04, 3: 0.03, 4: 0.03, 5: 0.02, 6: 0.02 },
    },
  },
};
