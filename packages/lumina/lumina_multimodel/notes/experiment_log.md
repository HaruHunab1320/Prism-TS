# Lumina Experiment Log

## 2026-02-08
- Baseline (outputs_gen from lumina-pilot-001e), hybrid aggregator (alpha=0.7, top-k=2, abstain=0.50, margin=0.03, 999 samples):
  - F1 0.262, task score 0.391, success@0.7 0.367, abstain 0.039, agreement 0.002.
- Filtered merged dataset generators (short/high-quality answers), same aggregator settings (999 samples):
  - F1 0.264, task score 0.394, success@0.7 0.366, abstain 0.049, agreement 0.000.
  - Interpretation: small lift vs baseline; needs seed sweep to confirm stability.
- Filtered generators seed sweep (999 samples each):
  - Seed 1: F1 0.264, task 0.394, success@0.7 0.352, abstain 0.064.
  - Seed 2: F1 0.261, task 0.392, success@0.7 0.355, abstain 0.052.
  - Seed 3: F1 0.270, task 0.397, success@0.7 0.383, abstain 0.059.
  - Avg: F1 ~0.265, task ~0.394. Lift vs baseline appears small but consistent.
- Filtered generators parameter sweep (alpha/abstain/margin):
  - Best observed: alpha=0.5, abstain=0.55, margin=0.05
    - F1 0.278, task 0.415, success@0.7 0.387, abstain 0.100.
  - Interpretation: tuning routing/abstain parameters yields the largest lift so far.
  - Completed sweep: alpha=0.9, abstain=0.55, margin=0.05 gave F1 0.268, task 0.400 (not best).
- Best-config scale check (filtered generators, alpha=0.5, abstain=0.55, margin=0.05):
  - 1998 samples: F1 0.281, task 0.421, success@0.7 0.399, abstain 0.105.
  - Interpretation: lift holds and slightly improves at larger sample size.
  - 4998 samples: F1 0.277, task 0.413, success@0.7 0.385, abstain 0.105.
  - Interpretation: lift holds at larger scale (slight regression vs 2k, still above baseline).


## 2026-02-19 to 2026-02-20
- Isolated Lumina environment at `lumina_multimodel/.venv` to avoid global dependency conflicts.
  - Verified: transformers 4.57.1, huggingface_hub 0.36.2, torch 2.10.0.
- Local hybrid routing check (isolated env, 859 samples, alpha=0.5):
  - Confidence-only: 0.473
  - Router-only: 0.448
  - Hybrid: 0.647
  - Interpretation: routing fusion still works; hybrid is materially better than either signal alone.
- HQ-med A/B eval (cloud A100 run, 3178 samples):
  - Arm A (`filtered_gpt2`): route 0.700, F1 0.018, task 0.037, abstain 0.209.
  - Arm B (`hq_stagea_gpt2_medium`): route 0.700, F1 0.032, task 0.048, abstain 0.070, agreement 0.680.
  - Interpretation: routing is stable, but generator answer quality remains the bottleneck.

### Current working thesis
1. Hybrid routing signal is valid and consistently improves routing proxy accuracy.
2. End-task quality is now constrained mainly by generator quality/calibration, not routing.
3. Priority is generator quality lift (data mix + training objective + decoding), then re-evaluate full aggregator.

## 2026-02-22
- Stage A v2 local training on NVMe (`outputs_gen_stagea_v2`, `gpt2-medium`, 2 epochs, quality weighting):
  - general: train 3.0871 -> 2.7189, val 2.7529 -> 2.6980
  - math: train 0.9063 -> 0.7851, val 2.6110 -> 2.5659
  - code: train 1.4706 -> 1.3062, val 1.5511 -> 1.4970
- Candidate-only eval (`hq_stagea_v2`, 3178 samples):
  - Route 0.512, F1 0.022, task 0.039, success@0.7 0.012, abstain 0.061.
- Corrected local A/B run (`filtered gpt2` vs `hq_stagea_v2 gpt2-medium`, 3178 samples):
  - filtered: F1 0.017, task 0.031, success@0.7 0.009, abstain 0.076.
  - hq_stagea_v2: F1 0.022, task 0.039, success@0.7 0.012, abstain 0.061.
  - Interpretation: candidate improves over filtered baseline, but absolute quality remains low.
- Infra fixes added:
  - explicit `BASE_GENERATOR_MODEL` / `CAND_GENERATOR_MODEL` support in A/B script.
  - `DEVICE` selection with fail-fast (`mps`/`cuda`/`cpu`) in train + eval entry points.
  - local eval script defaults to `DEVICE=mps` and NVMe-rooted paths.

## 2026-02-23 to 2026-02-24
- Fast recipe sweep on MPS (all using `datasets_hq_med` unless noted), evaluated on 859 samples:
  - `stagea_v3` (answer cap=24, quality weighting on, max_new_tokens=40): F1 0.026, task 0.073, abstain 0.095.
  - `stagea_v3` with max_new_tokens=80: F1 0.017, task 0.055, abstain 0.095 (worse).
  - `stagea_v4` (removed answer cap, quality weighting on, t=40): F1 0.026, task 0.071, abstain 0.095.
  - `stagea_v5` (removed quality weighting, no answer cap, t=40): F1 0.026, task 0.068, abstain 0.092.
- Data-composition test (`datasets_hq_med_clean_v1`, dedupe + stricter answer filters):
  - `stagea_v6` @859: F1 0.031, task 0.072, abstain 0.130 (F1 up, abstain up).
- Threshold sweep on `stagea_v6` (`abstain in {0.45,0.50,0.55}`, `margin in {0.03,0.05,0.07}`):
  - For abstain 0.45/0.50: identical metrics at 859: F1 0.029, task 0.074, abstain 0.042.
  - For abstain 0.55: F1 0.030-0.031, task 0.072, abstain 0.125-0.130.
- Larger confirm run (target 5000; effective 3178 due split size):
  - `a=0.45,m=0.05`: F1 0.023, task 0.040, abstain 0.047.
  - `a=0.55,m=0.05`: F1 0.023, task 0.039, abstain 0.104.
- Decision:
  - Keep lower abstain (0.45) for coverage when quality is equal.
  - Do not spend more cycles on decode/threshold tweaks alone.
  - Next phase is data enrichment/distillation and domain-balance improvements.


## 2026-02-27
- Curated HQ v2 dataset audit and freeze:
- Stage A v9 cloud run (`lumina-hq-v2-stagea-002`, quality weighting OFF, same curated dataset and eval thresholds):
  - Samples 3210, route 0.577, F1 0.047, task 0.092, success@0.7 0.013, abstain 0.018, agreement 0.001.
  - Comparison vs stagea-001 (quality weighting ON):
    - F1 0.048 -> 0.047 (slight down)
    - task 0.087 -> 0.092 (up)
    - abstain 0.111 -> 0.018 (large coverage gain)
  - Decision: prefer quality weighting OFF for current curated-HQ-v2 training recipe.
- Threshold sweep on H100 checkpoint (`outputs_gen_stagea_v8_h100`, 3210 samples):
  - `abstain=0.35, margin=0.03`: F1 0.047, task 0.090, abstain 0.023.
  - `abstain=0.35, margin=0.05`: F1 0.047, task 0.090, abstain 0.023.
  - `abstain=0.45, margin=0.03`: F1 0.047, task 0.090, abstain 0.023.
  - `abstain=0.45, margin=0.05`: F1 0.047, task 0.090, abstain 0.023.
  - `abstain=0.55, margin=0.03`: F1 0.048, task 0.088, abstain 0.097.
  - `abstain=0.55, margin=0.05`: F1 0.048, task 0.087, abstain 0.111.
  - Decision: prefer `abstain=0.45`, `margin=0.03` for this checkpoint (best task score with low abstention).
  - `datasets_hq_v2_curated` counts:
    - general train 120000 / val 5000 (`trivia_qa` 70168 train, `squad_v2` 49832 train)
    - math train 10433 / val 549 (`gsm8k` 7005 train, `metamathqa` 3428 train)
    - code train 18918 / val 995 (`codealpaca` 17853 train, `mbpp` 908 train, `humaneval` 157 train)
  - Interpretation: source provenance added; prior math corruption removed; math is now usable.
- H100 Stage A run (`lumina-hq-v2-stagea-001`, `gpt2-medium`, 2 epochs, quality weighting, `datasets_hq_v2_curated`):
  - Calibration: general `a=0.241 b=0.906`, math `a=-0.001 b=1.001`, code `a=8.865 b=-3.616`.
  - Aggregator eval (effective 3210 samples): route 0.577, F1 0.048, task 0.087, success@0.7 0.014, abstain 0.111, agreement 0.001.
  - Interpretation: materially better than recent local curated runs; data quality improvements are moving the stack.
- Current next step:
  - run a bounded threshold sweep on the H100-trained checkpoint before changing data or training recipe again.

## 2026-03-05 to 2026-03-07
- Cloud launch reliability fixes:
  - `tools/cloud/launch_experiments.sh` now force-syncs repo to `origin/main` on startup (`fetch`, `checkout main`, `reset --hard`).
  - Fixed cloud gate workflow by creating missing local sync target (`outputs_gen_overfit`) before `gsutil rsync`.
- General-teacher Stage A run (`lumina-general-teacher-001`, `g2-standard-24`, us-central1-a):
  - Built general clean teacher slice: `train=39994`, `val=1000` (`datasets_general_clean_v2_teacher`).
  - Trained general generator (`Qwen/Qwen2.5-0.5B-Instruct`, 2 epochs):
    - Epoch 1: `train_loss=1.6914`, `val_loss=1.7202`
    - Epoch 2: `train_loss=1.5162`, `val_loss=1.7037`
  - General QA eval on teacher-clean val (300 samples):
    - `EM=0.003`, `F1=0.327`
- Cloud gate + aggregator follow-up (`lumina-general-v4-gate-001`):
  - Domain QA gate on `datasets_hq_med` with new general + existing math/code specialists:
    - general: `EM=0.000`, `F1=0.069` (300)
    - math: `EM=0.117`, `F1=0.117` (300)
    - code: `EM=0.000`, `F1=0.264` (193)
  - Gate criterion (`general F1 >= 0.10`): **FAIL**
  - Aggregator step skipped by policy (`run_agg_gate_if_pass.sh`).
- Interpretation:
  - The new general model scores well on its own teacher-clean validation, but does not transfer enough to the mixed HQ-med gate set.
  - Math and code remain stable; general-domain robustness is still the dominant blocker.

## 2026-03-08 to 2026-03-09
- General-only ablation set (cloud, `g2-standard-24`, eval on `datasets_hq_med`, val 300):
  - `A clean-only` (`lumina-general-ablate-a-clean-001`):
    - `EM=0.020`, `F1=0.115` (**best in ablation set**)
  - `B teacher-heavy` (`lumina-general-ablate-b-teacher-001`):
    - `EM=0.000`, `F1=0.084`
  - `C mixed` (`lumina-general-ablate-c-mixed-001`):
    - `EM=0.000`, `F1=0.085`
- Follow-up gate+agg run with A model (`lumina-general-aclean-gate-001`):
  - Domain gate metrics:
    - general: `EM=0.000`, `F1=0.064` (300)
    - math: `EM=0.117`, `F1=0.117` (300)
    - code: `EM=0.000`, `F1=0.264` (193)
  - Gate: **FAIL** (`general F1 < 0.10`)
  - Aggregator skipped by policy.
- Key observation:
  - The ablation eval command for general used strict short-answer postprocessing, but `run_domain_qa_gate.sh` currently evaluates general without that strict postprocessing.
  - This metric mismatch can explain why the same general checkpoint scores `0.115` in ablation eval and `0.064` in gate eval.

## 2026-03-09 (gate alignment fix + full pass)
- Gate script alignment:
  - Updated `scripts/run_domain_qa_gate.sh` so general uses strict-answer + constrained postprocess by default (matching ablation eval settings).
- Re-run (`lumina-general-aclean-gate-001`, corrected config):
  - Domain gate metrics:
    - general: `EM=0.020`, `F1=0.115`
    - math: `EM=0.117`, `F1=0.117`
    - code: `EM=0.000`, `F1=0.264`
  - Gate result: **PASS**
- Aggregator executed (300 samples):
  - Route accuracy: `0.443`
  - Aggregation EM (answered): `0.004`
  - Aggregation F1 (answered): `0.060`
  - Aggregation task score (answered): `0.128`
  - Task success@0.7 (answered): `0.029`
  - Abstain rate: `0.093`
  - Agreement rate (top-2): `0.020`
- Interpretation:
  - We now have metric-consistent gating and a complete gate→aggregator run.
  - General gate quality improved enough to pass, but overall stack quality is still low.
  - Immediate suspect is router/calibration mismatch (route accuracy collapse to `0.443`).

## 2026-03-10 (routing isolation + general generator uplift)
- Routing/calibration isolation sweep (`lumina-routing-isolation-001`, 300 samples):
  - `router_only` (`alpha=1.0`, base calib): route `0.477`, F1 `0.062`, task `0.125`, abstain `0.213`
  - `conf_only` (`alpha=0.0`, base calib): route `0.337`, F1 `0.031`, task `0.111`, abstain `0.003`
  - `hybrid_base_calib` (`alpha=0.5`, base calib): route `0.443`, F1 `0.060`, task `0.128`, abstain `0.093`
  - `hybrid_mixed_calib` (`alpha=0.5`, mixed qwen calib): route `0.477`, F1 `0.098`, task `0.167`, abstain `0.130`
- Interpretation:
  - Router signal is stronger than confidence-only routing.
  - Calibration choice materially changes end-task quality.
  - New working baseline promoted to `hybrid + conf_calibration_mixed_qwen`.

- General uplift A/B (`experiments_general_generator_uplift.yaml`, 300 samples):
  - Control (`lumina-general-uplift-control-001`, baseline stack): route `0.477`, F1 `0.098`, task `0.167`, abstain `0.130`
  - Treatment (`lumina-general-uplift-tx-001`, retrained general `Qwen/Qwen2.5-1.5B-Instruct`):
    - General QA gate probe: `EM=0.127`, `F1=0.255` (300)
    - Aggregator: route `0.477`, F1 `0.107`, task `0.176`, abstain `0.137`
- Interpretation:
  - With routing fixed, stronger general generator improved end-to-end quality (`F1 +0.009`, `task +0.009`) while route accuracy stayed flat.
  - This supports the thesis that generator quality is still a primary bottleneck after routing/calibration stabilization.

## 2026-03-11 to 2026-03-12 (math attribution + router refresh + confidence recal)
- Math uplift attribution at larger eval (`lumina-math-attr-control-2000-001` vs `lumina-math-attr-treatment-2000-001`):
  - Both runs (effective `1525` samples) were nearly identical:
    - control: route `0.354`, F1 `0.069`, task `0.107`, abstain `0.144`
    - treatment: route `0.354`, F1 `0.069`, task `0.108`, abstain `0.142`
  - Router attribution showed severe collapse:
    - true math -> routed code: `573`
    - true math -> routed math: `9`
  - Decision: generator math uplift cannot express while routing is collapsed; router must be fixed first.

- Router refresh (`lumina-router-refresh-2000-002`, new router dataset build + retrain):
  - Router dataset built from `datasets_hq_med`:
    - train `56,874`, val `4,512`
  - Router training finished with high val accuracy (`~0.989-0.994`).
  - Old-router hybrid reference (effective `1525`): route `0.354`, F1 `0.069`, task `0.108`, abstain `0.142`.
  - New-router router-only (effective `1525`): route `0.991`, F1 `0.091`, task `0.162`, abstain `0.001`.
  - Routing attribution with new router:
    - true math -> routed math: `664` (vs `9` before)
    - true general -> routed general: `654`
    - true code -> routed code: `192`
  - Interpretation: routing collapse was the dominant blocker; routing is now fixed in this regime.

- Missing hybrid completion filled (`lumina-router-new-hybrid-only-001`):
  - New-router hybrid (`alpha=0.5`, effective `1525`): route `0.991`, F1 `0.091`, task `0.162`, abstain `0.003`.
  - Effectively tied with new-router router-only in end metrics.

- Confidence recalibration (`lumina-conf-recal-2000-001`):
  - Baseline hybrid w/ existing confidence heads: route `0.991`, F1 `0.091`, task `0.163`, abstain `0.001`.
  - Hybrid w/ recalibrated confidence heads: route `0.994`, F1 `0.091`, task `0.162`, abstain `0.002`.
  - Interpretation: recalibrating confidence heads did not improve end-task quality on current stack.

- Operating decision:
  - Lock operating mode to router-dominant (`alpha=1.0`) for production experiments.
  - Keep confidence heads for abstain/diagnostics while generator quality is improved.
