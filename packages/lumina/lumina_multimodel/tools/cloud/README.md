# Lumina Cloud Experiments

This folder contains the GCP launcher and the current multimodel cloud experiment specs.

## Prereqs
- `gcloud` installed and authenticated
- `yq` installed (`brew install yq` or `apt-get install yq`)

If your local gcloud config directory is not writable, run:

```bash
export CLOUDSDK_CONFIG=/tmp/gcloud
gcloud auth login
```

## Current canonical specs

### Generator and gate path
- `experiments_general_ablation.yaml`
- `experiments_general_aclean_gate_agg.yaml`
- `experiments_general_generator_uplift.yaml`
- `experiments_math_generator_uplift.yaml`
- `experiments_math_uplift_robust_router_5000.yaml`
- `experiments_math_exact_uplift_5000.yaml`
- `experiments_code_generator_uplift.yaml`
- `experiments_code_heterogeneous_uplift_5000.yaml`
- `experiments_code_exec_uplift_5000.yaml`
- `experiments_code_v3_uplift_5000.yaml`

### Routing and confidence path
- `experiments_routing_isolation_300.yaml`
- `experiments_math_attribution_2000.yaml`
- `experiments_router_refresh_2000.yaml`
- `experiments_router_robustness_5000.yaml`
- `experiments_router_new_hybrid_only.yaml`
- `experiments_conf_recalibration_2000.yaml`
- `experiments_confidence_utility_5000.yaml`
- `experiments_disagreement_utility_5000.yaml`
- `experiments_specialist_diversity_5000.yaml`
- `experiments_top2_selector_5000.yaml`
- `experiments_prompt_contract_5000.yaml`
- `experiments_code_decode_budget_5000.yaml`

### Larger confirm
- `experiments_combined_confirm_5000.yaml`
- `experiments_combined_confirm_robust_router_5000.yaml`

Superseded stage-a / stage-b specs were moved to:

- `../../archive/legacy_2026-02/`
- `../../archive/legacy_2026-03/`

## Configure experiments
Edit one of the current yaml files:
- `project`, `zone`, `machine_type`, `bucket`, `repo_url`
- experiment entries and command sequence

## Launch
From this folder:

```bash
bash launch_experiments.sh experiments_combined_confirm_5000.yaml
```

Each VM:
- clones the repo
- runs the commands
- syncs `outputs_gen`, `outputs_router`, `logs` to GCS
- stops itself (`shutdown -h now`)

## Stop matching experiment VMs (optional)
```bash
gcloud compute instances list --filter="name~'lumina-'" --format="value(name,zone)" | \
while read -r name zone; do
  gcloud compute instances stop "$name" --zone "$zone"
done
```
