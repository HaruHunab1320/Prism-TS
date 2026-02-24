# Lumina Multimodel Roadmap (Falsifiable)

Last updated: 2026-02-23

## Current state

### Proven
- Hybrid routing signal (confidence + router) is consistently better than either alone on routing proxy.
- Pipeline is reproducible (isolated env, NVMe-backed paths, active scripts reduced/archived).
- Routing is not the main bottleneck in current end-task metrics.

### Not proven
- A generator training recipe that gives reliable, material end-task gains at scale.

## Objective
Find and lock a generator recipe that improves aggregator quality enough to transfer into `lumina_basic`.

## Phases

### Phase A: Generator recipe discovery (multimodel)
Claim A1:
- A single recipe can improve aggregator task score by >= +0.03 absolute and F1 by >= +0.02 versus current local baseline.

Method:
- Run 1000-sample fast experiments with one variable changed per run.
- Promote only winning configs to 5000-sample confirm.

Fail criteria:
- After 6 single-variable trials, no recipe meets A1.

### Phase B: Robustness check
Claim B1:
- Winning recipe remains better under seed/data variation.

Method:
- 3-seed confirmation at 5000 samples.
- Compare mean and spread vs baseline.

Fail criteria:
- Improvement disappears or regresses materially across seeds.

### Phase C: Transfer to lumina_basic
Claim C1:
- Hybrid routing + calibrated confidence + winning generators port to `lumina_basic` without major regression.

Method:
- Integrate multimodel-winning stack into `lumina_basic`.
- Run matched eval harness/settings.

Success gate:
- `lumina_basic` reaches >= 95% of multimodel metrics on matched eval setup.

### Phase D: Stabilize
- Canonical runbook and scripts
- CI smoke eval
- Result logging + rollback configuration

## Experiment discipline
- One variable per run.
- 1000-sample for discovery, 5000-sample for confirmation.
- Predeclare hypothesis and pass/fail criteria before launch.
- Log every run in `notes/experiment_log.md` with:
  - hypothesis
  - exact command/config
  - metrics
  - decision (keep/drop)

## Immediate next actions
1. Finish current `stagea_v4` run and log results.
2. Decide pass/fail against `stagea_v3`.
3. If pass: run 5000 confirm.
4. If fail: next variable is data-mix rebalance (especially code/math), not decoding tweaks.
