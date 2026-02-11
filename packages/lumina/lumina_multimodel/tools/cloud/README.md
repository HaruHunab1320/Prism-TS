# Lumina Cloud Pilot (One VM per Experiment)

This folder provides a minimal GCP launcher that spins up **one VM per experiment**, runs your commands, syncs artifacts to GCS, and **stops** the VM on completion or failure.

## Prereqs
- `gcloud` installed and authenticated
- `yq` installed (`brew install yq` or `apt-get install yq`)

If your local gcloud config directory is not writable, run:

```bash
export CLOUDSDK_CONFIG=/tmp/gcloud
gcloud auth login
```

## Bucket
Create the bucket once (name must be globally unique):

```bash
gcloud storage buckets create \
  gs://lumina-checkpoints-jakob-2026 \
  --location=us-west1 \
  --uniform-bucket-level-access
```

Update the bucket name in `experiments.yaml` if you choose a different name.

## Configure experiments
Edit `experiments.yaml`:
- `project`, `zone`, `machine_type`, `bucket`, `repo_url`
- Add experiments with `name` and `commands`

## Launch
From this folder:

```bash
bash launch_experiments.sh
```

Each VM:
- clones the repo
- runs the commands
- syncs `outputs_gen`, `outputs_router`, `logs` to GCS
- stops itself (`shutdown -h now`)

## Stop all pilot VMs (optional)
```bash
gcloud compute instances list --filter="name~'lumina-pilot-'" --format="value(name,zone)" | \
while read -r name zone; do
  gcloud compute instances stop "$name" --zone "$zone"
done
```
