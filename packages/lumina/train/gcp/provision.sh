#!/bin/bash
# ============================================================================
# Lumina GCP VM Provisioning
#
# Creates GCP resources for training:
# - GCS bucket for checkpoints
# - Compute instance with GPUs
# - Firewall rules for monitoring
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - GCP project with billing enabled
#   - GPU quota approved for the region
#
# Usage:
#   ./provision.sh [command]
#
# Commands:
#   create-bucket   Create GCS bucket for training data and checkpoints
#   create-vm       Create training VM with GPUs
#   create-a3       Create A3 Mega VM with 8x H100
#   delete-vm       Delete training VM
#   ssh             SSH into training VM
#   status          Show VM status
# ============================================================================

set -e

# ============================================================================
# Configuration - CUSTOMIZE THESE
# ============================================================================

PROJECT_ID="${GCP_PROJECT:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
BUCKET_NAME="${GCS_BUCKET_NAME:-lumina-training-$(whoami)}"

# VM Configuration
VM_NAME="${VM_NAME:-lumina-trainer}"
MACHINE_TYPE="${MACHINE_TYPE:-n1-standard-32}"  # For GPU VMs
GPU_TYPE="${GPU_TYPE:-nvidia-tesla-a100}"
GPU_COUNT="${GPU_COUNT:-8}"

# A3 Mega configuration (8x H100)
A3_MACHINE_TYPE="a3-megagpu-8g"

# Disk configuration
BOOT_DISK_SIZE="200GB"
DATA_DISK_SIZE="2000GB"  # 2TB for datasets

# ============================================================================
# Helper Functions
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
}

# ============================================================================
# Commands
# ============================================================================

create_bucket() {
    log_info "Creating GCS bucket: gs://$BUCKET_NAME"

    gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME || true

    # Create directory structure
    gsutil cp /dev/null gs://$BUCKET_NAME/data/.placeholder
    gsutil cp /dev/null gs://$BUCKET_NAME/checkpoints/.placeholder

    log_info "Bucket created: gs://$BUCKET_NAME"
    echo ""
    echo "Bucket structure:"
    echo "  gs://$BUCKET_NAME/data/         - Training datasets"
    echo "  gs://$BUCKET_NAME/checkpoints/  - Model checkpoints"
}

create_vm() {
    log_info "Creating VM: $VM_NAME"
    log_info "Machine type: $MACHINE_TYPE with ${GPU_COUNT}x $GPU_TYPE"

    # Create startup script
    cat > /tmp/startup.sh << 'EOF'
#!/bin/bash
# Format and mount NVMe if available
if [ -e /dev/nvme0n1 ]; then
    mkfs.ext4 -F /dev/nvme0n1
    mkdir -p /mnt/disks/nvme
    mount /dev/nvme0n1 /mnt/disks/nvme
    chmod 777 /mnt/disks/nvme
fi
EOF

    gcloud compute instances create $VM_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --accelerator=type=$GPU_TYPE,count=$GPU_COUNT \
        --image-family=pytorch-latest-gpu \
        --image-project=deeplearning-platform-release \
        --boot-disk-size=$BOOT_DISK_SIZE \
        --boot-disk-type=pd-ssd \
        --maintenance-policy=TERMINATE \
        --scopes=cloud-platform \
        --metadata-from-file=startup-script=/tmp/startup.sh

    rm /tmp/startup.sh

    log_info "VM created: $VM_NAME"
    echo ""
    echo "Connect with: gcloud compute ssh $VM_NAME --zone=$ZONE"
}

create_a3() {
    log_info "Creating A3 Mega VM: $VM_NAME"
    log_info "This includes 8x NVIDIA H100 80GB GPUs"

    gcloud compute instances create $VM_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE \
        --machine-type=$A3_MACHINE_TYPE \
        --image-family=pytorch-latest-gpu \
        --image-project=deeplearning-platform-release \
        --boot-disk-size=$BOOT_DISK_SIZE \
        --boot-disk-type=pd-ssd \
        --maintenance-policy=TERMINATE \
        --scopes=cloud-platform

    log_info "A3 Mega VM created: $VM_NAME"

    # Estimated cost warning
    log_warn "A3 Mega (8x H100) costs approximately \$25/hour"
    log_warn "Remember to delete the VM when done: ./provision.sh delete-vm"
    echo ""
    echo "Connect with: gcloud compute ssh $VM_NAME --zone=$ZONE"
}

delete_vm() {
    log_warn "Deleting VM: $VM_NAME"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud compute instances delete $VM_NAME \
            --project=$PROJECT_ID \
            --zone=$ZONE \
            --quiet

        log_info "VM deleted"
    fi
}

ssh_vm() {
    gcloud compute ssh $VM_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE
}

status() {
    log_info "VM Status:"
    gcloud compute instances describe $VM_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE \
        --format="table(name,status,machineType,zone)" 2>/dev/null || echo "VM not found"

    echo ""
    log_info "GCS Bucket:"
    gsutil du -sh gs://$BUCKET_NAME 2>/dev/null || echo "Bucket not found"
}

show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  create-bucket   Create GCS bucket for training data and checkpoints"
    echo "  create-vm       Create training VM with ${GPU_COUNT}x ${GPU_TYPE}"
    echo "  create-a3       Create A3 Mega VM with 8x H100"
    echo "  delete-vm       Delete training VM"
    echo "  ssh             SSH into training VM"
    echo "  status          Show VM and bucket status"
    echo ""
    echo "Environment variables:"
    echo "  GCP_PROJECT     - GCP project ID (current: $PROJECT_ID)"
    echo "  GCP_REGION      - GCP region (current: $REGION)"
    echo "  GCP_ZONE        - GCP zone (current: $ZONE)"
    echo "  GCS_BUCKET_NAME - GCS bucket name (current: $BUCKET_NAME)"
    echo "  VM_NAME         - VM instance name (current: $VM_NAME)"
    echo "  MACHINE_TYPE    - Machine type (current: $MACHINE_TYPE)"
    echo "  GPU_TYPE        - GPU type (current: $GPU_TYPE)"
    echo "  GPU_COUNT       - Number of GPUs (current: $GPU_COUNT)"
}

# ============================================================================
# Main
# ============================================================================

check_gcloud

case "${1:-}" in
    create-bucket)
        create_bucket
        ;;
    create-vm)
        create_vm
        ;;
    create-a3)
        create_a3
        ;;
    delete-vm)
        delete_vm
        ;;
    ssh)
        ssh_vm
        ;;
    status)
        status
        ;;
    *)
        show_usage
        ;;
esac
