# Lumina Multimodel Roadmap (Falsifiable)

Last updated: 2026-03-13

## Current state

### Proven
- Router collapse was the dominant blocker in recent low-quality runs.
- Rebuilt/retrained router on `datasets_hq_med` can reach near-perfect routing on a narrower eval slice (`~0.991` route accuracy in-stack).
- Pipeline is reproducible (isolated env, cloud launcher, run logs in GCS + notes).
- Pipeline is reproducible (isolated env, NVMe-backed paths, active scripts reduced/archived).

### Not proven
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
- `lumina-router-robustness-5000-001` passed broad confirm across three seeds:
  - route `0.992-0.994`
  - F1 `0.078-0.082`
  - task `0.137-0.142`
- Stage 0 is now satisfied for routing stability.

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

Status:
- `pass` on `lumina-router-robustness-5000-001`

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
1. Freeze the router-dominant baseline from `lumina-router-robustness-5000-001`.
2. Re-run math uplift under the stable robust-router regime; earlier math results were confounded by routing collapse.
3. Promote only materially positive domain treatments into the next combined confirm.
4. Keep confidence work paused until Stage 1 produces a stronger plain baseline.

Current frozen plain baseline:
- combined confirm `lumina-combined-confirm-robust-router-5000-002`
  - route `0.992`
  - F1 `0.081`
  - task `0.140`
  - success@0.7 `0.102`
  - abstain `0.004`

Current Stage 1 keeps:
- `general` uplift: keep
- `math` uplift: keep
- `code` uplift: tentative keep (small but positive)

Immediate next experiment:
- Matrix C: confidence utility on top of the frozen combined baseline
  - router-only baseline (`alpha=1.0`)
  - hybrid with current confidence heads
  - hybrid with retrained/recalibrated confidence heads

Matrix C result:
- `drop` for active control use in current regime
- confidence heads are tied with router-only and do not justify blend complexity

Next experiment:
- Matrix D: disagreement utility
  - direct-answer baseline (`top-k=1`)
  - top-2 current aggregation
  - top-2 oracle diagnostic upper-bound
  - analyze only the subset where top-2 answers disagree and both answers have high confidence

Matrix D result:
- `drop` for current regime
- no high-confidence disagreement subset exists in the current stack (`subset_size=0`)

Where this leaves us:
- routing: validated
- generator uplift: incremental but real
- confidence utility: not validated
- disagreement utility: not validated because the prerequisite signal does not yet exist

Next strategic focus:
- specialist diversity diagnostic shows modest hidden top-2 upside:
  - selected task `0.140`
  - oracle task `0.161`
  - oracle lift `+0.021`
  - useful disagreement exists, but `high_conf_disagree=0`
- immediate next gate is an explicit top-2 selector/correctness model
- stronger and more heterogeneous specialists remain the parallel next-phase track once selector headroom is measured

Next experiment:
- Matrix E: top-2 selector utility
  - train a chooser on frozen top-2 candidate metadata/debug dumps
  - compare current top-2 selection vs selector-chosen candidate vs oracle@2 on held-out seed
  - keep only if selector recovers a meaningful share of the observed oracle lift

Matrix E result:
- `drop` for the simple metadata-only selector
- latent top-2 upside is real (`oracle task lift ~ +0.022`), but it is not recoverable from the current shallow chooser features

Next experiment:
- Matrix F: heterogeneous specialist uplift
  - replace the weakest least-specialized expert with a genuinely different family
  - first target: code specialist using a code-native base rather than the general instruct family
  - compare against the frozen combined baseline under the robust router
