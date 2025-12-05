# AutoTrack Stress Test Suite & CI Gating

## Overview
This suite provides rigorous, deterministic validation of the equity prediction algorithm.
Every code change is automatically validated against identical criteria.

## Test Structure

### A. Deterministic Historical Suite (Golden-100) — Every PR
- 100 cars with known historical values
- Validates equity peak month accuracy
- Validates equity sign safety
- Validates balloon/PCP correctness

### B. Monte Carlo Stress Simulations (10k runs) — Nightly/Pre-release
- Randomized perturbations with fixed seeds
- Tests robustness under extreme inputs

### C. Edge-Case Battery (200 cases) — Nightly
- COVID spikes, recalls, buybacks
- Negative equity rollovers
- Extreme mileage scenarios

### D. Performance & Load — Every PR
- Latency benchmarks
- Memory stability
- Determinism verification

### E. A/B Regression Check — Model Updates
- Comparison against golden baseline
- MAE and max delta gates

## Pass/Fail Thresholds (Gates)

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Golden-100 ±1 month | ≥88% | Block PR |
| Golden-100 ±2 months | ≥95% | Block PR |
| False positive equity | 0 | Block PR |
| Balloon set accuracy | ≥90% | Block PR |
| Monte Carlo ±3 months | ≥88% | High Alert |
| Monte Carlo false positive | ≤1% | High Alert |
| Edge-200 failures | ≤2 | High Alert |
| MAE vs baseline | ≤0.6 months | Block PR |
| Max delta | ≤6 months | Manual Approval |
| Performance | <0.5s/car | Block PR |

## Running Tests

```bash
# Run full suite (PR gate)
npm run test:stress

# Run nightly suite
npm run test:stress:nightly

# Run Monte Carlo only
npm run test:stress:monte-carlo

# Run with specific seed
STRESS_SEED=12345 npm run test:stress
```

## Golden Datasets

Located in `tests/stress-suite/golden-data/`:
- `golden-100.json` - 100 historical vehicles with known outcomes
- `golden-balloon-50.json` - 50 PCP/balloon examples
- `golden-ev-30.json` - 30 EV-specific cases
- `edge-cases-200.json` - 200 edge case scenarios
- `monte-carlo-seeds.json` - Deterministic random seeds

## CI Integration

See `.github/workflows/stress-tests.yml` for CI configuration.

## Failure Remediation

1. CI blocks merge
2. Auto-generated failing-report ticket with diffs
3. Triage: reproduce locally with exact seed
4. Root cause → fix code, update baseline (with approval), or fix data
5. Re-run CI after fix
