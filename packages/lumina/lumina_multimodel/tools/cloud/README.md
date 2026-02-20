# Lumina Cloud Experiments

This folder contains the GCP launcher for multimodel experiments.

## Prereqs
- `gcloud` installed and authenticated
- `yq` installed (`brew install yq` or `apt-get install yq`)

If your local gcloud config directory is not writable, run:

```bash
export CLOUDSDK_CONFIG=/tmp/gcloud
gcloud auth login
```

## Active specs

- `experiments_hq_stage_a.yaml` (generator training/calibration/eval flow)
- `experiments_hq_eval_ab_a100.yaml` (A/B eval flow)

Legacy specs were moved to `../../archive/legacy_2026-02/tools/cloud/`.

## Configure experiments
Edit one of the active yaml files:
- `project`, `zone`, `machine_type`, `bucket`, `repo_url`
- experiment entries and command sequence

## Launch
From this folder:

```bash
bash launch_experiments.sh experiments_hq_stage_a.yaml
# or
bash launch_experiments.sh experiments_hq_eval_ab_a100.yaml
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
