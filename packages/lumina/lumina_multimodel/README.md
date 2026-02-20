# Lumina Multimodel

Current active workspace for the multimodel architecture (confidence models + router + aggregator).

## Active pipeline

Use these as canonical entry points:

- Train generators (HQ-med): `tools/train_generators_hq_med.sh`
- Build calibration: `tools/build_conf_calibration_hq_med.sh`
- Run aggregator eval (5k): `tools/run_aggregator_hq_med_5000.sh`
- Run A/B generator eval: `tools/run_hq_med_generator_ab.sh`
- Cloud launcher: `tools/cloud/launch_experiments.sh`
- Active cloud specs:
  - `tools/cloud/experiments_hq_stage_a.yaml`
  - `tools/cloud/experiments_hq_eval_ab_a100.yaml`

## Local eval helpers

- `scripts/build_conf_calibration_hq_med_local.sh`
- `scripts/run_eval_hq_med_5000_local.sh`

Run these from this directory (`lumina_multimodel/`), ideally inside `.venv`.
For external NVMe storage (ROCKET-nano), set `LUMINA_NVME_ROOT` (see `scripts/README.md`).

## Experiment tracking

- Log: `notes/experiment_log.md`
- Journey notebook: `notebooks/multimodel_journey.ipynb`
- Cleanup map: `notes/cleanup_inventory_2026-02-20.md`

## Legacy scripts

Superseded scripts/specs were moved (not deleted) to:

- `archive/legacy_2026-02/`
