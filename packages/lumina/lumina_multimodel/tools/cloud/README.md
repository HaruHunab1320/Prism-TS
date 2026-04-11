# Lumina Cloud Experiments

This folder now keeps only the active promoted-path experiment specs.

Older exploratory or superseded specs are archived under:

- `archive/legacy_2026-04/`

## Prereqs
- `gcloud` installed and authenticated
- `yq` installed (`brew install yq` or `apt-get install yq`)

If your local gcloud config directory is not writable, run:

```bash
export CLOUDSDK_CONFIG=/tmp/gcloud
gcloud auth login
```

## Active canonical specs

### Math promoted path
- `experiments_lumina_basic_qwen_math_uplift.yaml`
- `experiments_lumina_basic_qwen_math_probe_v2.yaml`
- `experiments_lumina_basic_qwen_math_probe_v2_stability.yaml`

### Code promoted path
- `experiments_lumina_basic_code_python_contract.yaml`
- `experiments_lumina_basic_code_probe_v1.yaml`
- `experiments_lumina_basic_code_policy_stability.yaml`

Older stage-a / stage-b and multimodel exploration specs were moved to:

- `../../archive/legacy_2026-02/`
- `../../archive/legacy_2026-03/`
- `archive/legacy_2026-04/`

## Configure experiments
Edit one of the active yaml files:
- `project`, `zone`, `machine_type`, `bucket`, `repo_url`
- experiment entries and command sequence
- optional `preflight_commands` per experiment for cheap fail-fast validation before long training

## Launch
From this folder:

```bash
bash launch_experiments.sh experiments_lumina_basic_qwen_math_probe_v2.yaml
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
