# Lumina GCP Training Guide

Train Lumina on Google Cloud Platform with H100 GPUs.

## Quick Start

```bash
# 1. Create GCS bucket for data and checkpoints
./provision.sh create-bucket

# 2. Create A3 Mega VM (8x H100)
./provision.sh create-a3

# 3. SSH into VM
./provision.sh ssh

# 4. On the VM: run setup
curl -sSL https://raw.githubusercontent.com/.../setup.sh | bash

# 5. Download and prepare data
/opt/lumina/download_data.sh

# 6. Start training
GCS_BUCKET=gs://your-bucket /opt/lumina/train.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GCP Project                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐        ┌──────────────────────────────┐      │
│   │  GCS Bucket  │        │     A3 Mega VM (8x H100)     │      │
│   ├──────────────┤        ├──────────────────────────────┤      │
│   │ /data/       │◄──────►│  Local NVMe: /data/          │      │
│   │   raw/       │  sync  │    tokenized/                │      │
│   │   tokenized/ │        │                              │      │
│   ├──────────────┤        │  Training:                   │      │
│   │ /checkpoints/│◄───────│    DeepSpeed ZeRO-2          │      │
│   │   step-1000/ │  save  │    Flash Attention 2         │      │
│   │   step-2000/ │        │    BFloat16                  │      │
│   │   best/      │        │                              │      │
│   └──────────────┘        └──────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## VM Options

| VM Type | GPUs | VRAM | Cost/hr | Training Time | Total Cost |
|---------|------|------|---------|---------------|------------|
| n1-standard-8 + 1x A100 | 1x A100 | 40GB | ~$4 | ~200 hrs | ~$800 |
| n1-standard-32 + 4x A100 | 4x A100 | 160GB | ~$16 | ~50 hrs | ~$800 |
| a3-megagpu-8g | 8x H100 | 640GB | ~$25 | ~25 hrs | ~$625 |

**Recommended:** A3 Mega with 8x H100 offers best time-to-completion and cost efficiency.

## Step-by-Step Guide

### 1. Prerequisites

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable storage.googleapis.com

# Request GPU quota (if needed)
# Go to: https://console.cloud.google.com/iam-admin/quotas
# Request quota for "NVIDIA H100 80GB GPUs" in your region
```

### 2. Create Infrastructure

```bash
# Set your project
export GCP_PROJECT=your-project-id
export GCP_REGION=us-central1
export GCP_ZONE=us-central1-a
export GCS_BUCKET_NAME=lumina-training-yourusername

# Create bucket
./provision.sh create-bucket

# Create VM (choose one)
./provision.sh create-a3    # 8x H100 - recommended
./provision.sh create-vm    # Custom GPU config
```

### 3. Setup VM Environment

```bash
# SSH into VM
./provision.sh ssh

# Run setup script
bash /opt/lumina/setup.sh

# Verify GPUs
nvidia-smi
```

### 4. Prepare Data

```bash
# Download and tokenize datasets
/opt/lumina/download_data.sh

# This will:
# - Download The Pile, Wikipedia, GitHub code
# - Download arXiv, FEVER for uncertainty training
# - Tokenize everything
# - Create merged train/val files

# Check data
du -sh /data/*
```

### 5. Start Training

```bash
# Set environment
export GCS_BUCKET=gs://your-bucket-name
export MODEL_CONFIG=base       # tiny/small/base/medium
export BATCH_SIZE=32           # per GPU
export MAX_STEPS=150000        # Phase 1 + 2

# Start training
/opt/lumina/train.sh

# Or run in tmux for persistence
tmux new -s training
/opt/lumina/train.sh
# Ctrl+B, D to detach
```

### 6. Monitor Training

```bash
# GPU utilization
watch -n 1 nvidia-smi

# Or use nvtop
nvtop

# Check training logs
tail -f /opt/lumina/Prism-TS/packages/lumina/train/outputs/*/training.log

# List checkpoints in GCS
gsutil ls gs://your-bucket/checkpoints/
```

### 7. Resume from Checkpoint

If training is interrupted:

```bash
# Find latest checkpoint
gsutil ls gs://your-bucket/checkpoints/lumina-*/

# Resume
/opt/lumina/resume.sh gs://your-bucket/checkpoints/lumina-xxx/checkpoint-10000
```

### 8. Download Final Model

```bash
# On your local machine
gsutil cp -r gs://your-bucket/checkpoints/lumina-xxx/best/ ./lumina-trained/

# Or sync entire run
gsutil -m rsync -r gs://your-bucket/checkpoints/lumina-xxx/ ./lumina-trained/
```

### 9. Cleanup

```bash
# Delete VM (IMPORTANT - stops billing)
./provision.sh delete-vm

# Optional: delete bucket
gsutil rm -r gs://your-bucket
```

## Training Phases

### Phase 1: Foundation (12-16 hours)

```bash
export MODEL_CONFIG=base
export MAX_STEPS=100000
export BATCH_SIZE=32
/opt/lumina/train.sh
```

### Phase 2: Uncertainty Fine-tuning (4-6 hours)

```bash
# Resume from Phase 1 checkpoint
export MAX_STEPS=150000
/opt/lumina/resume.sh gs://bucket/checkpoints/run/checkpoint-100000
```

### Phase 3: Prism Specialization (2-3 hours)

```bash
# Generate Prism training data first
python scripts/generate_prism_corpus.py -n 50000 -o /data/prism
python scripts/tokenize_datasets.py --input /data/prism --output /data/tokenized/phase3

# Fine-tune on Prism
export MAX_STEPS=160000
export LEARNING_RATE=5e-5
/opt/lumina/resume.sh gs://bucket/checkpoints/run/checkpoint-150000
```

## Cost Management

### Preemptible VMs

Save 60-70% with preemptible instances (may be interrupted):

```bash
gcloud compute instances create lumina-trainer \
    --preemptible \
    --machine-type=a3-megagpu-8g \
    ...
```

### Spot VMs

Even cheaper, but less predictable:

```bash
gcloud compute instances create lumina-trainer \
    --provisioning-model=SPOT \
    --machine-type=a3-megagpu-8g \
    ...
```

### Budget Alerts

```bash
# Set budget alert at $500
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="Lumina Training" \
    --budget-amount=500USD
```

## Troubleshooting

### GPU Not Detected

```bash
# Check NVIDIA driver
nvidia-smi

# Reinstall if needed
sudo apt-get install -y nvidia-driver-535
sudo reboot
```

### Out of Memory

Reduce batch size or use gradient checkpointing:

```bash
export BATCH_SIZE=16
export GRADIENT_ACCUMULATION_STEPS=8
```

### Training Stalls

Check for network issues with GCS:

```bash
# Test GCS connectivity
gsutil ls gs://your-bucket/

# Check disk space
df -h
```

### DeepSpeed Errors

```bash
# Verify DeepSpeed installation
ds_report

# Try without DeepSpeed first
python -m lumina_train.train_pytorch --config base --no-deepspeed
```

## Files Reference

| File | Purpose |
|------|---------|
| `provision.sh` | Create/manage GCP resources |
| `setup.sh` | Install dependencies on VM |
| `/opt/lumina/train.sh` | Start training |
| `/opt/lumina/resume.sh` | Resume from checkpoint |
| `/opt/lumina/download_data.sh` | Download and prepare datasets |
| `/opt/lumina/monitor.sh` | Monitor GPU usage |

## Expected Results

After full training:

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| LAMBADA Accuracy | 35-45% | 35-45% | 35-45% |
| HellaSwag | 35-45% | 35-45% | 35-45% |
| ECE (Calibration) | ~0.10 | <0.05 | <0.05 |
| AUROC Uncertainty | ~0.75 | >0.85 | >0.85 |
| Prism Syntax Valid | N/A | N/A | >95% |
