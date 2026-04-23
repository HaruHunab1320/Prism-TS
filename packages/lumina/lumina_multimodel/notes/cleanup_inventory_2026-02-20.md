# Lumina Multimodel Cleanup Inventory (2026-02-20)

Superseded by the current synthesis and roadmap:
- `notes/learning_synthesis_2026-03-13.md`
- `notes/roadmap_multimodel.md`

## Goal
Reduce script sprawl while preserving a reproducible path for the active multimodel architecture.

## Status
- 2026-02-20: listed archive candidates were moved to `lumina_multimodel/archive/legacy_2026-02/` (non-destructive move).

## Keep (active pipeline)

### Core train/eval scripts
- `lumina_multimodel/tools/train_generators_hq_med.sh`
- `lumina_multimodel/tools/build_conf_calibration_hq_med.sh`
- `lumina_multimodel/tools/run_aggregator_hq_med_5000.sh`
- `lumina_multimodel/tools/run_hq_med_generator_ab.sh`
- `lumina_multimodel/evaluation/eval_aggregator_minimal.py`
- `lumina_multimodel/evaluation/eval_hybrid_routing.py`
- `lumina_multimodel/evaluation/build_conf_calibration.py`

### Cloud orchestration
- `lumina_multimodel/tools/cloud/launch_experiments.sh`
- `lumina_multimodel/tools/cloud/experiments_hq_stage_a.yaml`
- `lumina_multimodel/tools/cloud/experiments_hq_eval_ab_a100.yaml`
- `lumina_multimodel/tools/cloud/README.md`

### Local reproducibility helpers
- `lumina_multimodel/scripts/build_conf_calibration_hq_med_local.sh`
- `lumina_multimodel/scripts/run_eval_hq_med_5000_local.sh`

### Notes/logs
- `lumina_multimodel/notes/experiment_log.md`
- `lumina_multimodel/notebooks/multimodel_journey.ipynb`

## Archive candidates (legacy sweeps / superseded runs)
These are still useful historically, but should move under `lumina_multimodel/archive/legacy_2026-02/`:

- `lumina_multimodel/tools/run_aggregator_1000.sh`
- `lumina_multimodel/tools/run_aggregator_abstain_sweep_1000.sh`
- `lumina_multimodel/tools/run_aggregator_best_5000.sh`
- `lumina_multimodel/tools/run_aggregator_best_filtered_1000.sh`
- `lumina_multimodel/tools/run_aggregator_best_filtered_2000.sh`
- `lumina_multimodel/tools/run_aggregator_best_filtered_5000.sh`
- `lumina_multimodel/tools/run_aggregator_hybrid_1000.sh`
- `lumina_multimodel/tools/run_aggregator_minimal.sh`
- `lumina_multimodel/tools/run_aggregator_oracle_debug.sh`
- `lumina_multimodel/tools/run_aggregator_param_sweep_filtered.sh`
- `lumina_multimodel/tools/run_aggregator_seed_sweep_1000.sh`
- `lumina_multimodel/tools/run_aggregator_seed_sweep_filtered.sh`
- `lumina_multimodel/tools/run_aggregator_topk_ablation_1000.sh`
- `lumina_multimodel/tools/run_hybrid_ablation_1000.sh`
- `lumina_multimodel/tools/run_hybrid_best.sh`
- `lumina_multimodel/tools/train_generator_math_24k.sh`
- `lumina_multimodel/tools/train_generators_hq.sh`
- `lumina_multimodel/tools/train_generators_quick.sh`
- `lumina_multimodel/scripts/run_eval_hq_med_filtered_3178_local.sh`
- `lumina_multimodel/scripts/run_eval_hq_med_pretrained_3178_local.sh`

And older cloud specs not part of current A/B flow:
- `lumina_multimodel/tools/cloud/experiments.yaml`
- `lumina_multimodel/tools/cloud/experiments_002f.yaml`
- `lumina_multimodel/tools/cloud/experiments_003.yaml`
- `lumina_multimodel/tools/cloud/experiments_hq.yaml`
- `lumina_multimodel/tools/cloud/experiments_hq_3.yaml`
- `lumina_multimodel/tools/cloud/experiments_hq_23.yaml`
- `lumina_multimodel/tools/cloud/experiments_hq_eval_a100.yaml`
- `lumina_multimodel/tools/cloud/experiments_hq_medium.yaml`

## Immediate hygiene fixes
- Standardize script env handling: avoid hardcoding `TRANSFORMERS_OFFLINE=1` in scripts that may need online HF fetch.
- Keep one canonical local eval wrapper (5000 hq_med) and one canonical cloud eval path.
- Keep all experiment outputs in GCS + append metrics to `notes/experiment_log.md` after each run.

## Proposed next action
After review/approval, perform a non-destructive archive move (no deletions).
