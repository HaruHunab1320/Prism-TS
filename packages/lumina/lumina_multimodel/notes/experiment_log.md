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
