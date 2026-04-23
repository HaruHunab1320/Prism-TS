#!/bin/bash
# ============================================================================
# Lumina GCP Training Setup
#
# This script sets up a GCP VM for Lumina training:
# 1. Installs CUDA, PyTorch, and dependencies
# 2. Downloads and prepares datasets
# 3. Configures GCS for checkpointing
#
# Usage:
#   # On the GCP VM:
#   curl -sSL https://raw.githubusercontent.com/.../setup.sh | bash
#
#   # Or clone and run:
#   git clone <repo> && cd lumina/train/gcp && ./setup.sh
# ============================================================================

set -e

echo "=============================================="
echo "Lumina GCP Training Setup"
echo "=============================================="

# Configuration
PYTHON_VERSION="3.10"
CUDA_VERSION="12.1"
PROJECT_DIR="/opt/lumina"
DATA_DIR="/data"
VENV_DIR="$PROJECT_DIR/venv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================================
# System Setup
# ============================================================================

log_info "Updating system packages..."
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    git \
    curl \
    wget \
    htop \
    tmux \
    nvtop \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-venv \
    python${PYTHON_VERSION}-dev

# ============================================================================
# NVIDIA Drivers (if not already installed)
# ============================================================================

if ! command -v nvidia-smi &> /dev/null; then
    log_info "Installing NVIDIA drivers..."
    sudo apt-get install -y nvidia-driver-535
    log_warn "NVIDIA drivers installed. A reboot may be required."
fi

# Check GPU
log_info "Checking GPU..."
nvidia-smi || { log_error "GPU not detected!"; exit 1; }

# ============================================================================
# CUDA Toolkit
# ============================================================================

if ! command -v nvcc &> /dev/null; then
    log_info "Installing CUDA ${CUDA_VERSION}..."
    wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
    sudo dpkg -i cuda-keyring_1.1-1_all.deb
    sudo apt-get update
    sudo apt-get install -y cuda-toolkit-12-1
    rm cuda-keyring_1.1-1_all.deb

    # Add to PATH
    echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
    echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
    export PATH=/usr/local/cuda/bin:$PATH
    export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
fi

# ============================================================================
# Project Setup
# ============================================================================

log_info "Setting up project directory..."
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Create data directory on local NVMe (if available)
if [ -d "/mnt/disks/nvme" ]; then
    DATA_DIR="/mnt/disks/nvme/data"
else
    DATA_DIR="$PROJECT_DIR/data"
fi
mkdir -p $DATA_DIR

# Clone repository (or copy)
cd $PROJECT_DIR
if [ ! -d "Prism-TS" ]; then
    log_info "Cloning repository..."
    # git clone <your-repo-url> Prism-TS
    # For now, create structure
    mkdir -p Prism-TS/packages/lumina/train
fi

# ============================================================================
# Python Environment
# ============================================================================

log_info "Setting up Python virtual environment..."
python${PYTHON_VERSION} -m venv $VENV_DIR
source $VENV_DIR/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install PyTorch with CUDA
log_info "Installing PyTorch..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install training dependencies
log_info "Installing training dependencies..."
pip install \
    transformers \
    datasets \
    huggingface_hub \
    deepspeed \
    flash-attn --no-build-isolation \
    google-cloud-storage \
    tensorboard \
    wandb \
    tqdm \
    numpy \
    scipy \
    arxiv

# ============================================================================
# GCS Authentication
# ============================================================================

log_info "Setting up GCS authentication..."

# Check if running on GCE (Compute Engine)
if curl -s -f -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/zone" &> /dev/null; then
    log_info "Running on GCE - using default service account"
else
    log_warn "Not running on GCE - ensure GOOGLE_APPLICATION_CREDENTIALS is set"
    echo "Run: gcloud auth application-default login"
fi

# Install gcloud CLI if not present
if ! command -v gcloud &> /dev/null; then
    log_info "Installing Google Cloud CLI..."
    curl https://sdk.cloud.google.com | bash -s -- --disable-prompts
    exec -l $SHELL
fi

# ============================================================================
# Create Helper Scripts
# ============================================================================

log_info "Creating helper scripts..."

# Download data script
cat > $PROJECT_DIR/download_data.sh << 'EOF'
#!/bin/bash
set -e
source /opt/lumina/venv/bin/activate
cd /opt/lumina/Prism-TS/packages/lumina/train

echo "Downloading Phase 1 datasets..."
python scripts/download_datasets.py --phase 1 --output /data/raw

echo "Downloading Phase 2 datasets..."
python scripts/download_datasets.py --phase 2 --output /data/raw

echo "Tokenizing datasets..."
python scripts/tokenize_datasets.py --input /data/raw --output /data/tokenized --merge

echo "Data preparation complete!"
du -sh /data/*
EOF
chmod +x $PROJECT_DIR/download_data.sh

# Training script
cat > $PROJECT_DIR/train.sh << 'EOF'
#!/bin/bash
set -e
source /opt/lumina/venv/bin/activate
cd /opt/lumina/Prism-TS/packages/lumina/train

# Get number of GPUs
NUM_GPUS=$(nvidia-smi -L | wc -l)
echo "Training with $NUM_GPUS GPUs"

# Configuration
GCS_BUCKET="${GCS_BUCKET:-gs://lumina-training}"
MODEL_CONFIG="${MODEL_CONFIG:-base}"
BATCH_SIZE="${BATCH_SIZE:-32}"
MAX_STEPS="${MAX_STEPS:-150000}"

if [ "$NUM_GPUS" -gt 1 ]; then
    # Multi-GPU with DeepSpeed
    deepspeed --num_gpus=$NUM_GPUS \
        -m lumina_train.train_pytorch \
        --config $MODEL_CONFIG \
        --data-dir /data/tokenized \
        --batch-size $BATCH_SIZE \
        --max-steps $MAX_STEPS \
        --gcs-bucket $GCS_BUCKET \
        --save-steps 1000 \
        --deepspeed \
        --bf16
else
    # Single GPU
    python -m lumina_train.train_pytorch \
        --config $MODEL_CONFIG \
        --data-dir /data/tokenized \
        --batch-size $BATCH_SIZE \
        --max-steps $MAX_STEPS \
        --gcs-bucket $GCS_BUCKET \
        --save-steps 1000 \
        --bf16
fi
EOF
chmod +x $PROJECT_DIR/train.sh

# Resume script
cat > $PROJECT_DIR/resume.sh << 'EOF'
#!/bin/bash
set -e
source /opt/lumina/venv/bin/activate
cd /opt/lumina/Prism-TS/packages/lumina/train

if [ -z "$1" ]; then
    echo "Usage: ./resume.sh <checkpoint-path>"
    echo "Example: ./resume.sh gs://lumina-training/checkpoints/run-123/checkpoint-10000"
    exit 1
fi

NUM_GPUS=$(nvidia-smi -L | wc -l)
GCS_BUCKET="${GCS_BUCKET:-gs://lumina-training}"

deepspeed --num_gpus=$NUM_GPUS \
    -m lumina_train.train_pytorch \
    --resume "$1" \
    --gcs-bucket $GCS_BUCKET \
    --deepspeed \
    --bf16
EOF
chmod +x $PROJECT_DIR/resume.sh

# Monitor script
cat > $PROJECT_DIR/monitor.sh << 'EOF'
#!/bin/bash
# Monitor GPU usage and training progress
watch -n 1 nvidia-smi
EOF
chmod +x $PROJECT_DIR/monitor.sh

# ============================================================================
# Verify Installation
# ============================================================================

log_info "Verifying installation..."

source $VENV_DIR/bin/activate

python << 'PYTHON'
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
print(f"Number of GPUs: {torch.cuda.device_count()}")

for i in range(torch.cuda.device_count()):
    print(f"  GPU {i}: {torch.cuda.get_device_name(i)}")

try:
    from flash_attn import flash_attn_func
    print("Flash Attention: Available")
except ImportError:
    print("Flash Attention: Not available")

try:
    import deepspeed
    print(f"DeepSpeed version: {deepspeed.__version__}")
except ImportError:
    print("DeepSpeed: Not available")

try:
    from google.cloud import storage
    print("Google Cloud Storage: Available")
except ImportError:
    print("Google Cloud Storage: Not available")
PYTHON

# ============================================================================
# Done
# ============================================================================

echo ""
log_info "=============================================="
log_info "Setup complete!"
log_info "=============================================="
echo ""
echo "Next steps:"
echo "  1. Download data:    $PROJECT_DIR/download_data.sh"
echo "  2. Start training:   $PROJECT_DIR/train.sh"
echo "  3. Monitor GPUs:     $PROJECT_DIR/monitor.sh"
echo ""
echo "Environment variables:"
echo "  GCS_BUCKET     - GCS bucket for checkpoints (default: gs://lumina-training)"
echo "  MODEL_CONFIG   - Model size: tiny/small/base/medium (default: base)"
echo "  BATCH_SIZE     - Per-GPU batch size (default: 32)"
echo "  MAX_STEPS      - Maximum training steps (default: 150000)"
echo ""
