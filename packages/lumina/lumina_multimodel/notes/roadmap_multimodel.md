# Lumina Multimodel Roadmap (Falsifiable)

Last updated: 2026-03-13

## Current state

### Proven
- Router collapse was the dominant blocker in recent low-quality runs.
- Rebuilt/retrained router on `datasets_hq_med` can reach near-perfect routing on a narrower eval slice (`~0.991` route accuracy in-stack).
- Pipeline is reproducible (isolated env, cloud launcher, run logs in GCS + notes).
- Pipeline is reproducible (isolated env, NVMe-backed paths, active scripts reduced/archived).

### Not proven
- Router robustness on a broader mixed-domain confirm set.
- A generator recipe that gives reliable, material end-task gains now that routing is fixed.
- Confidence blending (`alpha<1`) that consistently beats router-only in this regime.

## Objective
With routing stabilized, find and lock a generator recipe that materially lifts end-task quality, then reintroduce Lumina-specific confidence and escalation mechanisms only if they beat the stronger plain baseline.

## Stages

### Stage 0: Freeze the plain baseline
Claim S0:
- A router-dominant stack can be made stable enough to serve as the reference system that Lumina mechanisms must beat.

Method:
- Use the refreshed router checkpoint.
- Use best-known general/math/code specialist checkpoints.
- Evaluate with `alpha=1.0` on the canonical mixed-domain set.

Pass gate:
- Route accuracy >= `0.95`
- End-task metrics reproduce within `+/- 0.01` F1 / task across reruns

Fail signal:
- Material drift between reruns means the benchmark is not trustworthy yet.

Current status:
- `lumina-router-refresh-2000-002` passed on a narrower slice (`route 0.991`, `F1 0.091`, `task 0.162`).
- `lumina-combined-confirm-5000-002` failed broad confirm (`effective n=3178`, `route 0.505`, `F1 0.063`, `task 0.087`), with math mostly collapsing into general.
- Stage 0 is therefore still open.

### Stage 1: Generator quality discovery
Claim S1:
- Better specialists can improve the router-dominant baseline by >= `+0.02` F1 and >= `+0.03` task score on the canonical eval.

Method:
- Run per-domain A/B uplifts under fixed router-dominant mode.
- Promote only positive single-domain treatments into combined confirms.
- Change one training variable per domain at a time: model size, data mix, answer target format, or teacher-cleaning policy.

Pass gate:
- Combined confirm beats the frozen plain baseline by the thresholds above.

Fail signal:
- After 6 bounded recipe changes, no combined stack clears the thresholds.

### Stage 2: Confidence utility under a strong baseline
Claim S2:
- Confidence heads add decision value beyond the strong router baseline.

Method:
- Retrain confidence heads on the current winning specialist regime.
- Compare:
  - router-only (`alpha=1.0`)
  - router + confidence rerank
  - router + confidence abstain at matched coverage
- Measure selective accuracy, abstain quality, and end-task metrics at equal answer-rate budgets.

Pass gate:
- Confidence-enabled mode improves F1 or task score at equal coverage, or
- Improves answered-case quality at a fixed abstain budget.

Fail signal:
- Confidence remains tied or worse than router-only after retraining/calibration.

### Stage 3: High-confidence disagreement as signal
Claim S3:
- When strong candidates disagree with high confidence, escalation improves hard-case outcomes enough to justify extra compute.

Method:
- Restrict to top-2 routed candidates.
- Detect disagreement with explicit thresholds:
  - both candidate confidences >= configured high-confidence threshold
  - answer overlap below configured disagreement threshold
- Compare:
  - direct-answer baseline
  - escalate-on-disagreement mode
- Escalation can be adjudicator pass, longer decode, or specialist re-query with added context.

Pass gate:
- On the disagreement subset, escalation improves task score by >= `+0.05` absolute without unacceptable overall latency/cost.

Fail signal:
- Disagreement-triggered extra compute does not beat simpler selection rules.

### Stage 4: Transfer into `lumina_basic`
Claim S4:
- The winning multimodel mechanisms transfer into `lumina_basic` without major regression.

Method:
- Port only mechanisms that already cleared prior gates:
  - fixed router baseline
  - any proven confidence utility
  - any proven escalation rule
- Run matched eval harness/settings in `lumina_basic`.

Pass gate:
- `lumina_basic` reaches >= `95%` of multimodel metrics on matched eval.

Fail signal:
- Transfer causes large regression or requires architecture-specific hacks.

### Stage 5: Stabilize
- Canonical runbook and scripts
- CI smoke eval
- Result logging + rollback configuration

## Experiment Matrix

### Matrix A: Plain baseline
- Experiment: combined confirm with best current checkpoints, `alpha=1.0`
- Purpose: freeze the strongest non-Lumina baseline
- Decision:
  - `pass` if stable and >= `0.95` route accuracy
  - `fail` if unstable or materially below prior router-refresh result

### Matrix A1: Router robustness
- Experiment: router-only confirm on broad mixed-domain eval with shuffled/stratified sampling, plus per-domain confusion dump
- Purpose: determine whether router-refresh quality generalizes beyond the narrow slice
- Decision:
  - `pass` if overall route accuracy >= `0.90`, math recall >= `0.80`, and rerun variance <= `0.03`
  - `fail` if broad eval still collapses math into general/code

### Matrix B: Domain uplift
- Experiment: per-domain control vs treatment under fixed router mode
- Purpose: identify which specialist upgrades actually move end metrics
- Decision:
  - `keep` if treatment improves task score by >= `+0.01` and does not hurt routing
  - `drop` if uplift is noise-level or regressions dominate

### Matrix C: Confidence utility
- Experiment: router-only vs hybrid vs abstain-at-budget on same checkpoint stack
- Purpose: test whether confidence carries extra information
- Decision:
  - `keep` if confidence beats router-only at matched coverage
  - `drop` if tied/worse after retraining

### Matrix D: Disagreement escalation
- Experiment: direct answer vs escalate on high-confidence disagreement
- Purpose: test the core Lumina claim
- Decision:
  - `keep` if disagreement escalation wins on hard cases by a meaningful margin
  - `drop` if disagreement is mostly noise or cost dominates gain

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
1. Run Matrix A1: broad router-only robustness confirm with shuffled/stratified sampling and per-domain confusion outputs.
2. If Matrix A1 passes, freeze the router-dominant baseline and then resume generator discovery under that stable baseline.
3. If Matrix A1 fails, rebuild router training/eval splits before any more generator or confidence work.
4. Do not resume confidence-utility experiments until Stage 0 is actually frozen on the broad confirm set.
