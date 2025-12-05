#!/usr/bin/env node
/**
 * Golden Dataset Generator
 * 
 * Generates deterministic golden datasets for stress testing.
 * Run once to create baseline, then keep immutable.
 * 
 * Usage: node tests/stress-suite/generators/generateGoldenData.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG = require('../config');

// Seeded random for reproducibility
class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  range(min, max) {
    return min + this.next() * (max - min);
  }
  
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  
  choice(arr) {
    return arr[this.int(0, arr.length - 1)];
  }
}

// Vehicle catalog by category
const VEHICLE_CATALOG = {
  economy: [
    { make: 'Toyota', model: 'Camry', msrpRange: [25000, 35000] },
    { make: 'Toyota', model: 'Corolla', msrpRange: [20000, 28000] },
    { make: 'Honda', model: 'Civic', msrpRange: [22000, 30000] },
    { make: 'Honda', model: 'Accord', msrpRange: [26000, 38000] },
    { make: 'Hyundai', model: 'Elantra', msrpRange: [20000, 26000] },
    { make: 'Hyundai', model: 'Sonata', msrpRange: [24000, 34000] },
    { make: 'Kia', model: 'Forte', msrpRange: [19000, 25000] },
    { make: 'Mazda', model: 'Mazda3', msrpRange: [22000, 30000] },
    { make: 'Nissan', model: 'Altima', msrpRange: [25000, 34000] },
    { make: 'Subaru', model: 'Impreza', msrpRange: [20000, 28000] },
  ],
  premium: [
    { make: 'BMW', model: '3 Series', msrpRange: [42000, 58000] },
    { make: 'BMW', model: '5 Series', msrpRange: [55000, 75000] },
    { make: 'Mercedes-Benz', model: 'C-Class', msrpRange: [44000, 58000] },
    { make: 'Mercedes-Benz', model: 'E-Class', msrpRange: [56000, 75000] },
    { make: 'Audi', model: 'A4', msrpRange: [40000, 52000] },
    { make: 'Audi', model: 'A6', msrpRange: [56000, 72000] },
    { make: 'Lexus', model: 'IS', msrpRange: [40000, 48000] },
    { make: 'Lexus', model: 'ES', msrpRange: [42000, 52000] },
  ],
  ev: [
    { make: 'Tesla', model: 'Model 3', msrpRange: [40000, 55000] },
    { make: 'Tesla', model: 'Model Y', msrpRange: [45000, 65000] },
    { make: 'Tesla', model: 'Model S', msrpRange: [80000, 110000] },
    { make: 'Chevrolet', model: 'Bolt EV', msrpRange: [28000, 35000] },
    { make: 'Ford', model: 'Mustang Mach-E', msrpRange: [45000, 65000] },
    { make: 'Hyundai', model: 'Ioniq 5', msrpRange: [42000, 58000] },
    { make: 'Kia', model: 'EV6', msrpRange: [45000, 62000] },
    { make: 'Nissan', model: 'Leaf', msrpRange: [28000, 38000] },
  ],
  exotic: [
    { make: 'Porsche', model: '911', msrpRange: [100000, 180000] },
    { make: 'Porsche', model: 'Cayman', msrpRange: [65000, 95000] },
    { make: 'BMW', model: 'M3', msrpRange: [72000, 95000] },
    { make: 'Mercedes-AMG', model: 'C63', msrpRange: [75000, 95000] },
    { make: 'Chevrolet', model: 'Corvette', msrpRange: [60000, 85000] },
    { make: 'Jeep', model: 'Wrangler Rubicon', msrpRange: [45000, 60000] },
  ],
};

const FINANCE_TYPES = [
  { type: 'loan', termMonths: 36, aprRange: [3, 6], depositRange: [0.10, 0.15], balloonPct: 0 },
  { type: 'loan', termMonths: 48, aprRange: [4, 7], depositRange: [0.10, 0.15], balloonPct: 0 },
  { type: 'loan', termMonths: 60, aprRange: [5, 8], depositRange: [0.05, 0.15], balloonPct: 0 },
  { type: 'loan', termMonths: 72, aprRange: [6, 9], depositRange: [0.05, 0.10], balloonPct: 0 },
  { type: 'pcp', termMonths: 48, aprRange: [3, 6], depositRange: [0.10, 0.20], balloonRange: [0.35, 0.45] },
  { type: 'pcp', termMonths: 60, aprRange: [4, 7], depositRange: [0.10, 0.15], balloonRange: [0.40, 0.55] },
];

// CALIBRATED to match real market data (KBB/Edmunds 2023-2024)
// These are yearly rates AFTER drive-off
const DEPRECIATION_PATTERNS = {
  economy: [0.05, 0.06, 0.05, 0.04, 0.04, 0.03],  // ~33% total at year 5
  premium: [0.08, 0.08, 0.07, 0.06, 0.05, 0.04],  // ~46% total at year 5
  ev: [0.06, 0.06, 0.05, 0.04, 0.03, 0.03],       // ~34% total at year 5
  exotic: [0.04, 0.04, 0.03, 0.03, 0.02, 0.02],   // ~21% total at year 5
};

function generateHistoricalValues(msrp, category, termMonths, annualMileage, rng) {
  const driveOffRate = CONFIG.categories[category]?.driveOffRate || 0.15;
  const depreciation = DEPRECIATION_PATTERNS[category] || DEPRECIATION_PATTERNS.economy;
  
  let value = msrp * (1 - driveOffRate);
  const values = [];
  const monthlyMileage = annualMileage / 12;
  let mileage = 0;
  
  for (let month = 0; month <= termMonths + 12; month++) {
    // Apply depreciation
    if (month > 0) {
      const year = Math.floor(month / 12);
      const yearlyRate = depreciation[Math.min(year, depreciation.length - 1)];
      const monthlyRate = yearlyRate / 12;
      value *= (1 - monthlyRate);
    }
    
    // Add market noise (±4%)
    const noise = 1 + (rng.next() - 0.5) * 0.08;
    const noisyValue = value * noise;
    
    // Mileage accumulation
    mileage += monthlyMileage;
    
    // Mileage adjustment
    const expectedMileage = (10000 / 12) * month;
    const mileageDiff = mileage - expectedMileage;
    const mileageAdj = 1 - (mileageDiff / 5000) * 0.02;
    const adjustedValue = noisyValue * Math.max(0.7, Math.min(1.3, mileageAdj));
    
    values.push({
      month,
      value: Math.round(Math.max(msrp * 0.15, adjustedValue)),
      mileage: Math.round(mileage),
    });
  }
  
  return values;
}

function calculateSettlement(principal, apr, termMonths, month, balloonPct = 0) {
  if (month >= termMonths) return balloonPct > 0 ? principal * balloonPct : 0;
  
  const balloonAmount = principal * balloonPct;
  const principalToAmortize = principal - balloonAmount;
  const monthlyRate = apr / 100 / 12;
  
  let principalRemaining;
  if (monthlyRate === 0) {
    principalRemaining = principalToAmortize * (1 - month / termMonths);
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    const factorElapsed = Math.pow(1 + monthlyRate, month);
    principalRemaining = principalToAmortize * (factor - factorElapsed) / (factor - 1);
  }
  
  return Math.max(0, principalRemaining + balloonAmount);
}

function findActualBestMonth(historicalValues, principal, apr, termMonths, balloonPct) {
  const minMonth = 12;
  const maxMonth = termMonths - 3;
  
  let bestMonth = minMonth;
  let bestEquity = -Infinity;
  
  // Calculate smoothed equities
  const equities = historicalValues.map((v, i) => {
    const settlement = calculateSettlement(principal, apr, termMonths, v.month, balloonPct);
    return { month: v.month, equity: v.value - settlement };
  });
  
  // 3-month smoothing
  const smoothed = equities.map((e, i) => {
    if (i < 1 || i >= equities.length - 1) return e.equity;
    return (equities[i-1].equity + e.equity + equities[i+1].equity) / 3;
  });
  
  for (let i = minMonth; i <= maxMonth && i < smoothed.length; i++) {
    if (smoothed[i] > bestEquity) {
      bestEquity = smoothed[i];
      bestMonth = i;
    }
  }
  
  return { bestMonth, bestEquity: Math.round(bestEquity) };
}

function generateGolden100() {
  const rng = new SeededRandom(42);
  const vehicles = [];
  
  // Distribution: 30 economy, 25 premium, 25 ev, 20 exotic
  const distribution = { economy: 30, premium: 25, ev: 25, exotic: 20 };
  let id = 1;
  
  for (const [category, count] of Object.entries(distribution)) {
    const catalog = VEHICLE_CATALOG[category];
    
    for (let i = 0; i < count; i++) {
      const vehicleTemplate = rng.choice(catalog);
      const financeTemplate = rng.choice(FINANCE_TYPES);
      
      const msrp = rng.int(vehicleTemplate.msrpRange[0], vehicleTemplate.msrpRange[1]);
      const year = rng.int(2015, 2022);
      const apr = rng.range(financeTemplate.aprRange[0], financeTemplate.aprRange[1]);
      const depositPct = rng.range(financeTemplate.depositRange[0], financeTemplate.depositRange[1]);
      const balloonPct = financeTemplate.balloonRange 
        ? rng.range(financeTemplate.balloonRange[0], financeTemplate.balloonRange[1])
        : 0;
      const annualMileage = rng.choice([6000, 8000, 10000, 12000, 15000, 20000]);
      
      const principal = msrp * (1 - depositPct);
      const historicalValues = generateHistoricalValues(
        msrp, category, financeTemplate.termMonths, annualMileage, rng
      );
      
      const { bestMonth, bestEquity } = findActualBestMonth(
        historicalValues, principal, apr, financeTemplate.termMonths, balloonPct
      );
      
      vehicles.push({
        id: id++,
        make: vehicleTemplate.make,
        model: vehicleTemplate.model,
        year,
        category,
        msrp,
        finance: {
          type: financeTemplate.type,
          termMonths: financeTemplate.termMonths,
          apr: Math.round(apr * 100) / 100,
          depositPct: Math.round(depositPct * 100) / 100,
          balloonPct: Math.round(balloonPct * 100) / 100,
          principal: Math.round(principal),
        },
        annualMileage,
        historicalValues,
        groundTruth: {
          actualBestMonth: bestMonth,
          actualBestEquity: bestEquity,
        },
      });
    }
  }
  
  return vehicles;
}

function generateBalloon50() {
  const rng = new SeededRandom(123);
  const vehicles = [];
  
  const allVehicles = [
    ...VEHICLE_CATALOG.economy,
    ...VEHICLE_CATALOG.premium,
    ...VEHICLE_CATALOG.ev,
  ];
  
  for (let i = 0; i < 50; i++) {
    const vehicleTemplate = rng.choice(allVehicles);
    const category = VEHICLE_CATALOG.economy.includes(vehicleTemplate) ? 'economy' :
                     VEHICLE_CATALOG.premium.includes(vehicleTemplate) ? 'premium' : 'ev';
    
    const msrp = rng.int(vehicleTemplate.msrpRange[0], vehicleTemplate.msrpRange[1]);
    const termMonths = rng.choice([36, 48, 60]);
    const apr = rng.range(3, 7);
    const depositPct = rng.range(0.10, 0.25);
    const balloonPct = rng.range(0.30, 0.70); // Wide range for testing
    const annualMileage = rng.choice([8000, 10000, 12000, 15000]);
    
    const principal = msrp * (1 - depositPct);
    const historicalValues = generateHistoricalValues(
      msrp, category, termMonths, annualMileage, rng
    );
    
    // Determine correct balloon strategy
    const balloonAmount = principal * balloonPct;
    const equityAtBalloon = historicalValues[termMonths]?.value - balloonAmount;
    
    let bestPreBalloonEquity = -Infinity;
    let bestPreBalloonMonth = 12;
    for (let m = 12; m < termMonths - 3; m++) {
      const settlement = calculateSettlement(principal, apr, termMonths, m, balloonPct);
      const equity = historicalValues[m]?.value - settlement;
      if (equity > bestPreBalloonEquity) {
        bestPreBalloonEquity = equity;
        bestPreBalloonMonth = m;
      }
    }
    
    const sellBeforeBetter = bestPreBalloonEquity > equityAtBalloon * 1.1;
    
    vehicles.push({
      id: i + 1,
      make: vehicleTemplate.make,
      model: vehicleTemplate.model,
      category,
      msrp,
      finance: {
        type: 'pcp',
        termMonths,
        apr: Math.round(apr * 100) / 100,
        depositPct: Math.round(depositPct * 100) / 100,
        balloonPct: Math.round(balloonPct * 100) / 100,
        principal: Math.round(principal),
        balloonAmount: Math.round(balloonAmount),
      },
      annualMileage,
      groundTruth: {
        correctStrategy: sellBeforeBetter ? 'sell_before_balloon' : 'pay_balloon_or_refinance',
        equityAtBalloon: Math.round(equityAtBalloon),
        bestPreBalloonMonth,
        bestPreBalloonEquity: Math.round(bestPreBalloonEquity),
      },
    });
  }
  
  return vehicles;
}

function generateEV30() {
  const rng = new SeededRandom(456);
  const vehicles = [];
  
  const evCatalog = VEHICLE_CATALOG.ev;
  
  for (let i = 0; i < 30; i++) {
    const vehicleTemplate = rng.choice(evCatalog);
    const msrp = rng.int(vehicleTemplate.msrpRange[0], vehicleTemplate.msrpRange[1]);
    const termMonths = rng.choice([36, 48, 60, 72]);
    const apr = rng.range(2, 6);
    const depositPct = rng.range(0.10, 0.20);
    const annualMileage = rng.choice([8000, 10000, 12000, 15000]);
    
    const principal = msrp * (1 - depositPct);
    const historicalValues = generateHistoricalValues(
      msrp, 'ev', termMonths, annualMileage, rng
    );
    
    const { bestMonth, bestEquity } = findActualBestMonth(
      historicalValues, principal, apr, termMonths, 0
    );
    
    vehicles.push({
      id: i + 1,
      make: vehicleTemplate.make,
      model: vehicleTemplate.model,
      category: 'ev',
      msrp,
      finance: {
        type: 'loan',
        termMonths,
        apr: Math.round(apr * 100) / 100,
        depositPct: Math.round(depositPct * 100) / 100,
        principal: Math.round(principal),
      },
      annualMileage,
      groundTruth: {
        actualBestMonth: bestMonth,
        actualBestEquity: bestEquity,
      },
    });
  }
  
  return vehicles;
}

function generateEdgeCases200() {
  const rng = new SeededRandom(789);
  const cases = [];
  let id = 1;
  
  // COVID spike cases (20)
  for (let i = 0; i < 20; i++) {
    cases.push({
      id: id++,
      type: 'covid_spike',
      description: `COVID inflated purchase - bought at +${15 + i}% market peak`,
      make: rng.choice(['Toyota', 'Honda', 'Hyundai']),
      model: rng.choice(['RAV4', 'CR-V', 'Tucson']),
      purchaseYear: 2021,
      purchaseMonth: rng.int(3, 8),
      marketPremiumAtPurchase: 0.15 + (i * 0.01),
      expectedBehavior: 'value_collapse_after_peak',
    });
  }
  
  // Recall cases (15)
  for (let i = 0; i < 15; i++) {
    cases.push({
      id: id++,
      type: 'recall',
      description: `Manufacturer recall causing -${10 + i}% value dip`,
      make: rng.choice(['Hyundai', 'Kia', 'Chevrolet']),
      model: rng.choice(['Kona EV', 'Niro EV', 'Bolt EV']),
      recallMonth: rng.int(12, 36),
      valueDipPct: 0.10 + (i * 0.01),
      expectedBehavior: 'temporary_dip_then_recovery',
    });
  }
  
  // Buyback program cases (10)
  for (let i = 0; i < 10; i++) {
    cases.push({
      id: id++,
      type: 'buyback',
      description: 'Manufacturer buyback at guaranteed residual',
      make: 'Volkswagen',
      model: 'TDI Jetta',
      buybackValue: 18000 + (i * 500),
      expectedBehavior: 'buyback_value_floor',
    });
  }
  
  // Negative equity rollover cases (20)
  for (let i = 0; i < 20; i++) {
    cases.push({
      id: id++,
      type: 'negative_equity_rollover',
      description: `Previous car negative equity rolled into new loan: $${3000 + i * 500}`,
      rolledNegativeEquity: 3000 + (i * 500),
      expectedBehavior: 'extended_underwater_period',
    });
  }
  
  // High down payment cases (15)
  for (let i = 0; i < 15; i++) {
    cases.push({
      id: id++,
      type: 'high_down_payment',
      description: `High down payment: ${30 + i * 2}%`,
      downPaymentPct: 0.30 + (i * 0.02),
      expectedBehavior: 'immediate_positive_equity',
    });
  }
  
  // Zero APR promotional cases (15)
  for (let i = 0; i < 15; i++) {
    cases.push({
      id: id++,
      type: 'zero_apr',
      description: 'Zero APR promotional financing',
      apr: 0,
      termMonths: rng.choice([36, 48, 60]),
      expectedBehavior: 'faster_equity_build',
    });
  }
  
  // Lease early buyout cases (15)
  for (let i = 0; i < 15; i++) {
    cases.push({
      id: id++,
      type: 'lease_buyout',
      description: `Lease early buyout with ${2 + i} month penalty`,
      penaltyMonths: 2 + i,
      expectedBehavior: 'penalty_affects_optimal_timing',
    });
  }
  
  // Salvage/rebuilt title cases (10)
  for (let i = 0; i < 10; i++) {
    cases.push({
      id: id++,
      type: 'salvage_title',
      description: 'Rebuilt/salvage title vehicle',
      valueReduction: 0.30 + (i * 0.02),
      expectedBehavior: 'reduced_resale_value',
    });
  }
  
  // Very low mileage cases (15)
  for (let i = 0; i < 15; i++) {
    cases.push({
      id: id++,
      type: 'low_mileage',
      description: `Very low mileage: ${3000 + i * 500}/year`,
      annualMileage: 3000 + (i * 500),
      expectedBehavior: 'value_premium',
    });
  }
  
  // Very high mileage cases (15)
  for (let i = 0; i < 15; i++) {
    cases.push({
      id: id++,
      type: 'high_mileage',
      description: `Very high mileage: ${25000 + i * 5000}/year`,
      annualMileage: 25000 + (i * 5000),
      expectedBehavior: 'accelerated_depreciation',
    });
  }
  
  // Exotic appreciation cases (10)
  for (let i = 0; i < 10; i++) {
    cases.push({
      id: id++,
      type: 'appreciation',
      description: 'Exotic car with appreciation potential',
      make: rng.choice(['Porsche', 'Toyota']),
      model: rng.choice(['911 GT3', 'Supra', 'Land Cruiser']),
      expectedBehavior: 'value_appreciation',
    });
  }
  
  // Market crash scenarios (15)
  for (let i = 0; i < 15; i++) {
    cases.push({
      id: id++,
      type: 'market_crash',
      description: `Market crash: -${20 + i}% sudden drop`,
      crashMonth: rng.int(18, 36),
      crashMagnitude: 0.20 + (i * 0.01),
      expectedBehavior: 'sell_before_crash',
    });
  }
  
  // Supply spike scenarios (15)
  for (let i = 0; i < 15; i++) {
    cases.push({
      id: id++,
      type: 'supply_spike',
      description: `Supply shortage spike: +${15 + i}% temporary`,
      spikeMonth: rng.int(24, 48),
      spikeMagnitude: 0.15 + (i * 0.01),
      expectedBehavior: 'sell_during_spike',
    });
  }
  
  // Extreme finance terms (10)
  for (let i = 0; i < 10; i++) {
    cases.push({
      id: id++,
      type: 'extreme_finance',
      description: `Extreme finance: 84mo term, ${10 + i}% APR`,
      termMonths: 84,
      apr: 10 + i,
      expectedBehavior: 'extended_underwater_period',
    });
  }
  
  return cases;
}

function generateMonteCarloSeeds() {
  const seeds = [];
  for (let i = 0; i < 100; i++) {
    seeds.push({
      seedId: i + 1,
      seed: 10000 + i * 137,
      description: `Monte Carlo seed batch ${i + 1}`,
    });
  }
  return seeds;
}

function calculateChecksum(data) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

function main() {
  const outputDir = path.join(__dirname, '..', 'golden-data');
  
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('Generating golden datasets...\n');
  
  // Generate Golden-100
  console.log('1. Generating Golden-100 historical dataset...');
  const golden100 = generateGolden100();
  const golden100Data = {
    version: '1.0.0',
    description: 'Golden 100-car dataset for deterministic testing',
    checksum: calculateChecksum(golden100),
    createdAt: new Date().toISOString(),
    vehicles: golden100,
  };
  fs.writeFileSync(
    path.join(outputDir, 'golden-100.json'),
    JSON.stringify(golden100Data, null, 2)
  );
  console.log(`   ✓ Generated ${golden100.length} vehicles`);
  
  // Generate Balloon-50
  console.log('2. Generating Golden-Balloon-50 dataset...');
  const balloon50 = generateBalloon50();
  const balloon50Data = {
    version: '1.0.0',
    description: 'Golden 50-car PCP/balloon dataset',
    checksum: calculateChecksum(balloon50),
    createdAt: new Date().toISOString(),
    vehicles: balloon50,
  };
  fs.writeFileSync(
    path.join(outputDir, 'golden-balloon-50.json'),
    JSON.stringify(balloon50Data, null, 2)
  );
  console.log(`   ✓ Generated ${balloon50.length} balloon vehicles`);
  
  // Generate EV-30
  console.log('3. Generating Golden-EV-30 dataset...');
  const ev30 = generateEV30();
  const ev30Data = {
    version: '1.0.0',
    description: 'Golden 30-car EV dataset',
    checksum: calculateChecksum(ev30),
    createdAt: new Date().toISOString(),
    vehicles: ev30,
  };
  fs.writeFileSync(
    path.join(outputDir, 'golden-ev-30.json'),
    JSON.stringify(ev30Data, null, 2)
  );
  console.log(`   ✓ Generated ${ev30.length} EV vehicles`);
  
  // Generate Edge Cases
  console.log('4. Generating Edge-Cases-200 dataset...');
  const edgeCases = generateEdgeCases200();
  const edgeCasesData = {
    version: '1.0.0',
    description: '200 edge case scenarios',
    checksum: calculateChecksum(edgeCases),
    createdAt: new Date().toISOString(),
    cases: edgeCases,
  };
  fs.writeFileSync(
    path.join(outputDir, 'edge-cases-200.json'),
    JSON.stringify(edgeCasesData, null, 2)
  );
  console.log(`   ✓ Generated ${edgeCases.length} edge cases`);
  
  // Generate Monte Carlo Seeds
  console.log('5. Generating Monte Carlo seeds...');
  const seeds = generateMonteCarloSeeds();
  const seedsData = {
    version: '1.0.0',
    description: 'Deterministic seeds for Monte Carlo simulations',
    checksum: calculateChecksum(seeds),
    createdAt: new Date().toISOString(),
    seeds,
  };
  fs.writeFileSync(
    path.join(outputDir, 'monte-carlo-seeds.json'),
    JSON.stringify(seedsData, null, 2)
  );
  console.log(`   ✓ Generated ${seeds.length} seed batches`);
  
  console.log('\n✅ All golden datasets generated successfully!');
  console.log(`   Output directory: ${outputDir}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  generateGolden100,
  generateBalloon50,
  generateEV30,
  generateEdgeCases200,
  generateMonteCarloSeeds,
};
