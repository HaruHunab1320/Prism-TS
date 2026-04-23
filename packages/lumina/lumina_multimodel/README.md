# Lumina Multimodel

Current workspace for the multimodel baseline, routing, and pre-Lumina arbitration experiments.

## Canonical references

- Experiment log: `notes/experiment_log.md`
- Learning synthesis: `notes/learning_synthesis_2026-03-13.md`
- Forward plan: `notes/roadmap_multimodel.md`

## Active scripts

- Local calibration helper: `scripts/build_conf_calibration_hq_med_local.sh`
- Local canonical eval: `scripts/run_eval_hq_med_5000_local.sh`
- Router dataset builder: `scripts/build_router_dataset.py`
- General gate helpers:
  - `scripts/run_domain_qa_gate.sh`
  - `scripts/run_agg_gate_if_pass.sh`
- General uplift trainer: `scripts/train_general_v2.sh`

Run local scripts from `lumina_multimodel/`, ideally inside `.venv`.
For external NVMe storage (ROCKET-nano), set `LUMINA_NVME_ROOT` as described in `scripts/README.md`.

## Active cloud entry point

- Launcher: `tools/cloud/launch_experiments.sh`

### Canonical cloud experiment specs to keep
- `tools/cloud/experiments_general_ablation.yaml`
- `tools/cloud/experiments_general_aclean_gate_agg.yaml`
- `tools/cloud/experiments_routing_isolation_300.yaml`
- `tools/cloud/experiments_general_generator_uplift.yaml`
- `tools/cloud/experiments_math_generator_uplift.yaml`
- `tools/cloud/experiments_math_attribution_2000.yaml`
- `tools/cloud/experiments_router_refresh_2000.yaml`
- `tools/cloud/experiments_router_new_hybrid_only.yaml`
- `tools/cloud/experiments_conf_recalibration_2000.yaml`
- `tools/cloud/experiments_code_generator_uplift.yaml`
- `tools/cloud/experiments_combined_confirm_5000.yaml`

## Archived material

Superseded scripts/specs are archived, not deleted:

- `archive/legacy_2026-02/`
- `archive/legacy_2026-03/`
