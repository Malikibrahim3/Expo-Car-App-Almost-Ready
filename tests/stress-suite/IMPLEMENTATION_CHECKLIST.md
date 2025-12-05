# Stress Test Implementation Checklist

## Hybrid Valuation Architecture

The equity calculator now uses a **hybrid approach**:

1. **Current Value**: Uses MarketCheck API data (cached in Supabase)
2. **Future Projections**: Uses calibrated depreciation from current market value
3. **Fallback**: Pure formula when no market data exists

### Key Functions:
- `generateHybridProjections()` - Use when you have MarketCheck data
- `generateProjections()` - Fallback when no market data
- `getCurrentValue()` in `hybridValuation.ts` - Smart cache handling

### Data Flow:
```
MarketCheck API → Supabase Cache (30 days) → equityCalculator
                                           ↓
                              Current value = REAL market data
                              Future months = Projected from real anchor
```

---

## Quick Reference - Copy/Paste Commands

### Initial Setup
```bash
# Generate golden datasets (run once, keep immutable)
npm run test:generate-golden

# Run PR-level tests (fast, blocking)
npm run test:stress

# Run nightly tests (includes Monte Carlo)
npm run test:stress:nightly

# Run full suite (pre-release)
npm run test:stress:full
```

---

## Numeric Gates Summary (Quick Reference)

| Test | Metric | Threshold | Action on Fail |
|------|--------|-----------|----------------|
| Golden-100 | ±1 month accuracy | ≥88% | Block PR |
| Golden-100 | ±2 month accuracy | ≥95% | Block PR |
| Golden-100 | False positives | 0 | Block PR |
| Balloon-50 | Strategy accuracy | ≥85% | Block PR |
| Monte Carlo | ±3 month accuracy | ≥88% | High Alert |
| Monte Carlo | False positive rate | ≤5% | High Alert |
| Edge-200 | Failures | ≤2 | High Alert |
| Regression | MAE | ≤0.6 months | Block PR |
| Regression | Max delta | ≤6 months | Manual Approval |
| Performance | Avg time | <0.5s/car | Block PR |
| Performance | Max time | <1.0s/car | Block PR |

---

## Implementation Checklist

### Phase 1: Golden Datasets ✅
- [x] Create `tests/stress-suite/` directory structure
- [x] Create `config.js` with all thresholds
- [x] Create `generators/generateGoldenData.js`
- [x] Generate Golden-100 historical dataset
- [x] Generate Golden-Balloon-50 PCP dataset
- [x] Generate Golden-EV-30 dataset
- [x] Generate Edge-Cases-200 dataset
- [x] Generate Monte Carlo seeds file

### Phase 2: Test Runners ✅
- [x] Create `runners/runFullStressSuite.js`
- [x] Implement Golden-100 test
- [x] Implement Balloon correctness test
- [x] Implement Monte Carlo stress test
- [x] Implement Edge case battery
- [x] Implement Performance test
- [x] Implement Regression test

### Phase 3: CI Integration ✅
- [x] Create `.github/workflows/stress-tests.yml`
- [x] Configure PR-level tests (blocking)
- [x] Configure nightly tests (alerting)
- [x] Configure full tests (manual trigger)
- [x] Add PR comment on failure
- [x] Add issue creation on nightly failure

### Phase 4: npm Scripts ✅
- [x] Add `test:stress` script
- [x] Add `test:stress:nightly` script
- [x] Add `test:stress:full` script
- [x] Add `test:generate-golden` script

---

## Failure Remediation Workflow

### When CI Fails:

1. **CI blocks merge** - PR cannot be merged until fixed

2. **Review failing-cases.csv** in artifacts
   ```bash
   # Download from GitHub Actions artifacts
   # Or run locally:
   npm run test:stress
   cat tests/stress-suite/results/failing-cases.csv
   ```

3. **Reproduce locally with exact seed**
   ```bash
   STRESS_SEED=12345 npm run test:stress
   ```

4. **Root cause analysis** - Three options:
   - **Code bug** → Fix and push new PR
   - **Intended model update** → Update baseline with approval
   - **Data issue** → Correct dataset and re-run

5. **For baseline updates** (requires approval):
   ```bash
   # Delete old baseline
   rm tests/stress-suite/baseline/baseline-predictions.json
   
   # Run tests to create new baseline
   npm run test:stress
   
   # Commit with justification in PR description
   ```

---

## Production Monitoring (Post-Release)

### Signals to Track:
- `user_accept_rate` on offers by equity bucket
- `actual_sell_month_distribution` from users who shared sale data
- `prediction_error_over_time` (predicted vs observed)
- `drift_metrics` - monthly KL-divergence vs baseline

### Alert Thresholds:
- Prediction error spike > 1 month avg over 7 days → Page data team
- Conversion drop > 20% vs baseline over 14 days → Product review

### Rollback Criteria:
- Multiple alerts triggered → Flag release
- Auto-rollback to last stable model artifact

---

## Acceptance & Release Policy

1. **Green CI + Monte Carlo nightly** = Safe to stage
2. **Staging canary** (1% users, 48-72 hours)
3. **Ramp**: 1% → 10% → 50% → 100% over days
4. **Any alert** → Rollback to previous stable

---

## File Structure

```
tests/stress-suite/
├── README.md                    # Overview documentation
├── IMPLEMENTATION_CHECKLIST.md  # This file
├── config.js                    # All thresholds and configuration
├── golden-data/
│   ├── golden-100.json          # 100 historical vehicles
│   ├── golden-balloon-50.json   # 50 PCP/balloon cases
│   ├── golden-ev-30.json        # 30 EV cases
│   ├── edge-cases-200.json      # 200 edge cases
│   └── monte-carlo-seeds.json   # Deterministic seeds
├── generators/
│   └── generateGoldenData.js    # Dataset generator
├── runners/
│   └── runFullStressSuite.js    # Main test runner
├── baseline/
│   └── baseline-predictions.json # Regression baseline
└── results/
    ├── stress-test-results.json # Full results
    └── failing-cases.csv        # Failed cases for triage
```

---

## Tips to Reduce Pain

1. **Feature flags** - Toggle new heuristics without re-training
2. **Deterministic seeds** - Always log seeds for reproducibility
3. **Rolling baseline history** - Compare long-term drift
4. **Track CI flakiness** - Flaky tests hide real problems
5. **Immutable golden data** - Never modify after validation
