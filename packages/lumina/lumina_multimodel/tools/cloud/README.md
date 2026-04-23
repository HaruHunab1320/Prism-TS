# Lumina Cloud Experiments

This folder now keeps only the active rebuild specs for the promoted paths.
Historical baselines, failed branches, and superseded gates are archived.

## Archive locations

- `archive/legacy_2026-04/`
- `../../archive/legacy_2026-02/`
- `../../archive/legacy_2026-03/`

## Active canonical specs

### Math promoted path
- `experiments_lumina_basic_qwen_math_uplift.yaml`
- `experiments_lumina_basic_qwen_math_probe_v2.yaml`
- `experiments_lumina_basic_qwen_math_probe_v2_stability.yaml`

### Code promoted path
- `experiments_lumina_basic_code_python_contract.yaml`
- `experiments_lumina_basic_code_probe_v1.yaml`
- `experiments_lumina_basic_code_policy_stability.yaml`

### Micro-specialist promoted rebuild paths
- `experiments_lumina_micro_js_array_loop_to_map_uplift.yaml`
- `experiments_lumina_micro_js_array_loop_to_map_probe_v1.yaml`
- `experiments_lumina_micro_js_array_loop_to_map_policy_stability.yaml`
- `experiments_lumina_micro_js_reduce_accumulator_refactor_uplift.yaml`
- `experiments_lumina_micro_js_reduce_accumulator_refactor_probe_v1.yaml`
- `experiments_lumina_micro_js_reduce_accumulator_refactor_policy_stability.yaml`
- `experiments_lumina_micro_js_reduce_object_index_builder_uplift.yaml`
- `experiments_lumina_micro_js_reduce_object_index_builder_probe_v1.yaml`
- `experiments_lumina_micro_js_reduce_object_index_builder_policy_stability.yaml`

## Archived micro-specs

The following are no longer in the active surface:

- filter candidate gates
- micro baseline-only specs
- superseded hard-gate specs that only served probe-data generation

Those now live under `archive/legacy_2026-04/`.

## Prereqs
- `gcloud` installed and authenticated
- `yq` installed

If your local gcloud config directory is not writable:

```bash
export CLOUDSDK_CONFIG=/tmp/gcloud
gcloud auth login
```

## Launch

```bash
bash launch_experiments.sh experiments_lumina_micro_js_reduce_object_index_builder_policy_stability.yaml
```

Each VM:
- clones the repo
- runs optional `preflight_commands`
- runs the main commands
- syncs `outputs_gen`, `outputs_router`, and `logs` to GCS
- shuts itself down
