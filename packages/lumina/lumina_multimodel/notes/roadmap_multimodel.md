# Lumina Multimodel Roadmap (Falsifiable)

Last updated: 2026-03-12

## Current state

### Proven
- Router collapse was the dominant blocker in recent low-quality runs.
- Rebuilt/retrained router on `datasets_hq_med` reaches near-perfect routing on eval (`~0.991` route accuracy in-stack).
- Pipeline is reproducible (isolated env, cloud launcher, run logs in GCS + notes).
- Pipeline is reproducible (isolated env, NVMe-backed paths, active scripts reduced/archived).

### Not proven
- A generator recipe that gives reliable, material end-task gains now that routing is fixed.
- Confidence blending (`alpha<1`) that consistently beats router-only in this regime.

## Objective
With routing stabilized, find and lock a generator recipe that materially lifts end-task quality and transfers into `lumina_basic`.

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
1. Promote operating mode to router-dominant (`alpha=1.0`) in canonical eval scripts.
2. Run code-generator uplift A/B (control vs treatment) with fixed router mode.
3. Run combined uplift confirm (`general+math+code`) at larger sample count (target 5000, report effective n).
4. If gains hold, freeze a production candidate config and start transfer checks in `lumina_basic`.
