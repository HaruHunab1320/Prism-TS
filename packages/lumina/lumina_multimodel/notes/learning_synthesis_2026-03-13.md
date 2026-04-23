# Lumina Multimodel Learning Synthesis (2026-03-13)

## Purpose
Capture the durable learnings from the multimodel experiment trail, identify the experiments worth preserving, and define the smallest active surface area for continued work.

## Chronology and durable findings

### 1. Early HQ-med / filtered baseline phase
- We proved that routing behavior can matter materially.
- We also over-read some early hybrid wins because they came from narrower slices and earlier data/model regimes.
- Durable learning:
  - small-sample wins are not enough
  - every promoted claim needs a larger confirm run

### 2. HQ / curated HQ-v2 data work
- We improved dataset provenance and removed earlier math corruption.
- Generator quality improved somewhat under better data, but not enough to unlock strong end-task behavior by itself.
- Durable learning:
  - data quality does matter
  - but weak routing can mask generator gains entirely

### 3. General-domain clean ablation and gate alignment
- `A clean-only` general training was the best of the early general variants.
- We found a metric mismatch between general ablation eval and gate eval, then fixed `run_domain_qa_gate.sh`.
- Durable learning:
  - strict-answer / constrained postprocess settings must match between probe and gate
  - otherwise we get false negatives and waste cycles

### 4. Routing vs confidence isolation
- `router_only` beat `conf_only`.
- Confidence calibration choice materially changed end-task quality.
- Durable learning:
  - confidence heads were not carrying the routing decision
  - router signal was the stronger component in the current regime

### 5. Generator uplift experiments
- General uplift produced a real end-to-end gain.
- Code uplift produced a smaller but still positive gain.
- Math uplift improved standalone math QA but initially did not move end metrics.
- Durable learning:
  - domain-specific generator improvements can help
  - but only if routing sends the right questions to the right specialist

### 6. Router refresh
- Rebuilding the router dataset from `datasets_hq_med` and retraining the router produced near-perfect route accuracy on the smaller attribution run.
- This exposed that the dominant failure in the poor runs was routing collapse, especially `math -> code`.
- Durable learning:
  - routing was a first-order blocker
  - the pipeline cannot meaningfully evaluate Lumina-style arbitration while routing is broken

### 7. Confidence recalibration after router refresh
- Recalibrated confidence heads did not beat router-only or meaningfully improve hybrid.
- Durable learning:
  - confidence heads are still not yet providing independent decision value in the current regime
  - confidence should currently be treated as secondary: abstain/diagnostics, not the main routing blend term

### 8. Larger combined confirm
- The broader confirm run regressed badly versus the smaller router-refresh slice.
- Main error pattern: `math -> general` became dominant on the larger slice.
- Durable learning:
  - the smaller router-refresh win did not fully generalize
  - current router success is real but not yet stable across the broader eval slice
  - larger confirms remain mandatory before freezing claims

## What is actually proven today
- The cloud/local experiment loop is reproducible.
- Generator quality is a real bottleneck.
- Routing quality is also a real bottleneck and can dominate observed results.
- Confidence blending is not yet proven to outperform a simpler router-dominant system.
- We are not yet at full-Lumina validation.

## What is not proven
- A stable plain baseline that holds on larger mixed-domain confirms.
- Confidence utility beyond routing at matched coverage.
- High-confidence disagreement as a useful escalation signal.
- Branching / multi-thread Lumina behavior that beats simpler baselines.

## Canonical experiments to keep

### Baseline diagnosis and metric hygiene
- `tools/cloud/experiments_general_ablation.yaml`
- `tools/cloud/experiments_general_aclean_gate_agg.yaml`
- `tools/cloud/experiments_routing_isolation_300.yaml`

### Generator uplift sequence
- `tools/cloud/experiments_general_generator_uplift.yaml`
- `tools/cloud/experiments_math_generator_uplift.yaml`
- `tools/cloud/experiments_code_generator_uplift.yaml`

### Routing and confidence sequence
- `tools/cloud/experiments_math_attribution_2000.yaml`
- `tools/cloud/experiments_router_refresh_2000.yaml`
- `tools/cloud/experiments_router_new_hybrid_only.yaml`
- `tools/cloud/experiments_conf_recalibration_2000.yaml`

### Broad confirm
- `tools/cloud/experiments_combined_confirm_5000.yaml`

## Active surface area to keep small

### Core notes
- `notes/experiment_log.md`
- `notes/roadmap_multimodel.md`
- `notes/learning_synthesis_2026-03-13.md`

### Core scripts
- `scripts/build_router_dataset.py`
- `scripts/run_domain_qa_gate.sh`
- `scripts/run_agg_gate_if_pass.sh`
- `scripts/train_general_v2.sh`
- `scripts/build_conf_calibration_hq_med_local.sh`
- `scripts/run_eval_hq_med_5000_local.sh`

### Core tool helpers
- `tools/build_conf_calibration_hq_med.sh`
- `tools/build_general_clean_slice_v2.sh`
- `tools/build_hq_v2_dataset.sh`
- `tools/build_math_clean_slice_v1.sh`
- `tools/log_run.py`
- `tools/run_aggregator_hq_med_5000.sh`
- `tools/run_generator_overfit_sanity.sh`

### Core cloud launcher
- `tools/cloud/launch_experiments.sh`
- current canonical cloud specs listed above

## Housekeeping decision
- Keep the canonical experiments and helpers listed here.
- Move superseded stage-a/stage-b specs and obsolete local probe scripts into a dated archive.
- Prefer archive moves over deletions unless a file is clearly broken and unrecoverable.
