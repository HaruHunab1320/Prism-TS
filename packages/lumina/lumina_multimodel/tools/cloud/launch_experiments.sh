#!/usr/bin/env bash
set -euo pipefail

CONFIG="${1:-experiments.yaml}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="$ROOT_DIR/$CONFIG"

if ! command -v yq >/dev/null 2>&1; then
  echo "yq is required. Install with: brew install yq (mac) or apt-get install yq (linux)"
  exit 1
fi

PROJECT="$(yq -r '.project' "$CONFIG_PATH")"
ZONE="$(yq -r '.zone' "$CONFIG_PATH")"
MACHINE="$(yq -r '.machine_type' "$CONFIG_PATH")"
BUCKET="$(yq -r '.bucket' "$CONFIG_PATH")"
REPO="$(yq -r '.repo_url' "$CONFIG_PATH")"
IMAGE_FAMILY="$(yq -r '.image_family // "ubuntu-2204-lts"' "$CONFIG_PATH")"
IMAGE_PROJECT="$(yq -r '.image_project // "ubuntu-os-cloud"' "$CONFIG_PATH")"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

INDEX=0
for NAME in $(yq -r '.experiments[].name' "$CONFIG_PATH"); do
  STARTUP_FILE="/tmp/${NAME}_startup.sh"
  COMMANDS=$(yq -r ".experiments[$INDEX].commands[]" "$CONFIG_PATH")

  SHUTDOWN_FILE="/tmp/${NAME}_shutdown.sh"
  COMMANDS_FILE="/tmp/${NAME}_commands.txt"
  cat <<EOF > "$STARTUP_FILE"
#!/usr/bin/env bash
set -euo pipefail
set -x

# Avoid emitting huge progress lines to the metadata script runner (token too long).
exec > /var/log/lumina_startup.log 2>&1

BUCKET="${BUCKET}"
RUN_ID="${NAME}"
REPO_URL="${REPO}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT}"

# auto-stop on exit (success or failure)
trap 'sudo shutdown -h now' EXIT

sudo apt-get update -y
sudo apt-get install -y git python3-venv curl apt-transport-https ca-certificates gnupg
# Install Google Cloud CLI (gsutil) from official repo
sudo mkdir -p /usr/share/keyrings
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
sudo chmod 644 /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list >/dev/null
sudo apt-get update -y
sudo apt-get install -y google-cloud-cli

if [ ! -d Prism-TS ]; then
  git clone "\$REPO_URL"
fi
cd Prism-TS/packages/lumina/lumina_multimodel

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
if [ -f requirements.txt ]; then
  grep -v '^mlx' requirements.txt > /tmp/requirements.linux.txt
  pip install -r /tmp/requirements.linux.txt
else
  echo "requirements.txt missing; installing minimal deps"
fi
pip install numpy transformers sentencepiece safetensors tokenizers datasets
pip install torch --index-url https://download.pytorch.org/whl/cu121

# Allow downloads in cloud (local scripts default to offline for Mac).
export TRANSFORMERS_OFFLINE=0
export HF_DATASETS_OFFLINE=0
export HF_HOME=/root/.cache/huggingface
export HF_HUB_DISABLE_TELEMETRY=1
export HF_HUB_DISABLE_PROGRESS_BARS=1
export HF_DATASETS_DISABLE_PROGRESS_BARS=1
export TQDM_DISABLE=1
export REQUIRE_CUDA=1

# Ensure output dirs exist for gsutil rsync
mkdir -p outputs_gen outputs_router outputs_gpt2 logs

# Pull prepared datasets from GCS
echo ">>> checking bucket access"
echo ">>> gsutil path: \$(command -v gsutil || echo MISSING)"
gsutil version -l || true
echo ">>> metadata service accounts:"
curl -s -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/ || true
echo ">>> testing bucket list"
set +e
gsutil ls "\$BUCKET"
ls_status=\$?
set -e
echo ">>> bucket list exit status: \$ls_status"
if [ "\$ls_status" -ne 0 ]; then
  echo ">>> bucket list failed; aborting"
  exit \$ls_status
fi

# Pull HF cache from GCS (pre-seeded on local machine)
echo ">>> syncing hf_cache from GCS"
mkdir -p "\$HF_HOME"
set +e
gsutil -m rsync -r "\$BUCKET/hf_cache/" "\$HF_HOME/"
hf_status=\$?
set -e
echo ">>> hf_cache sync exit status: \$hf_status"
echo ">>> syncing datasets_merged from GCS"
rm -f datasets_merged
mkdir -p datasets_merged
set +e
gsutil -m rsync -r "\$BUCKET/datasets_merged/" datasets_merged/
ds_status=\$?
set -e
echo ">>> datasets sync exit status: \$ds_status"
if [ "\$ds_status" -ne 0 ]; then
  echo ">>> datasets sync failed; listing bucket path"
  gsutil ls "\$BUCKET/datasets_merged/" || echo "GSUTIL_DATASETS_LIST_FAILED"
  exit \$ds_status
fi

# Optional HQ datasets for H100 pilots
echo ">>> syncing datasets_hq from GCS (optional)"
mkdir -p datasets_hq
set +e
gsutil -m rsync -r "\$BUCKET/datasets_hq/" datasets_hq/
hq_status=\$?
set -e
echo ">>> datasets_hq sync exit status: \$hq_status"

# Optional medium HQ datasets for Stage A
echo ">>> syncing datasets_hq_med from GCS (optional)"
mkdir -p datasets_hq_med
set +e
gsutil -m rsync -r "\$BUCKET/datasets_hq_med/" datasets_hq_med/
hq_med_status=\$?
set -e
echo ">>> datasets_hq_med sync exit status: \$hq_med_status"

# Optional curated HQ v2 datasets for Stage A
echo ">>> syncing datasets_hq_v2_curated from GCS (optional)"
mkdir -p datasets_hq_v2_curated
set +e
gsutil -m rsync -r "\$BUCKET/datasets_hq_v2_curated/" datasets_hq_v2_curated/
hq_v2_curated_status=\$?
set -e
echo ">>> datasets_hq_v2_curated sync exit status: \$hq_v2_curated_status"

# Pull confidence + router weights (required for aggregator)
echo ">>> syncing outputs_gpt2 from GCS"
set +e
gsutil -m rsync -r "\$BUCKET/outputs_gpt2/" outputs_gpt2/
gpt2_status=\$?
set -e
echo ">>> outputs_gpt2 sync exit status: \$gpt2_status"

echo ">>> syncing outputs_router from GCS"
set +e
gsutil -m rsync -r "\$BUCKET/outputs_router/" outputs_router/
router_status=\$?
set -e
echo ">>> outputs_router sync exit status: \$router_status"

cat <<'CMDS' > "$COMMANDS_FILE"
$(printf "%s\n" "$COMMANDS")
CMDS

while IFS= read -r cmd; do
  [ -z "\$cmd" ] && continue
  echo ">>> \$cmd"
  set +e
  bash -lc "\$cmd"
  status=\$?
  set -e
  echo ">>> command exit status: \$status"
  if [ "\$status" -ne 0 ]; then
    echo ">>> syncing after failure"
    gsutil -m rsync -r outputs_gen "\$BUCKET/runs/\$RUN_ID/outputs_gen" || true
    gsutil -m rsync -r outputs_router "\$BUCKET/runs/\$RUN_ID/outputs_router" || true
    gsutil -m rsync -r logs "\$BUCKET/runs/\$RUN_ID/logs" || true
    exit \$status
  fi
  gsutil ls "\$BUCKET" || echo "GSUTIL_BUCKET_LIST_FAILED"
  gsutil -m rsync -r outputs_gen "\$BUCKET/runs/\$RUN_ID/outputs_gen" || echo "GSUTIL_SYNC_OUTPUTS_GEN_FAILED"
  gsutil -m rsync -r outputs_router "\$BUCKET/runs/\$RUN_ID/outputs_router" || echo "GSUTIL_SYNC_OUTPUTS_ROUTER_FAILED"
  gsutil -m rsync -r logs "\$BUCKET/runs/\$RUN_ID/logs" || echo "GSUTIL_SYNC_LOGS_FAILED"
done < "$COMMANDS_FILE"
EOF

  cat <<EOF > "$SHUTDOWN_FILE"
#!/usr/bin/env bash
set -euo pipefail
BUCKET="${BUCKET}"
RUN_ID="${NAME}"
cd /Prism-TS/packages/lumina/lumina_multimodel 2>/dev/null || exit 0
gsutil ls "\$BUCKET" || echo "GSUTIL_BUCKET_LIST_FAILED"
gsutil cp /var/log/lumina_startup.log "\$BUCKET/runs/\$RUN_ID/lumina_startup.log" || echo "GSUTIL_LOG_COPY_FAILED"
gsutil -m rsync -r outputs_gen "\$BUCKET/runs/\$RUN_ID/outputs_gen" || echo "GSUTIL_SYNC_OUTPUTS_GEN_FAILED"
gsutil -m rsync -r outputs_router "\$BUCKET/runs/\$RUN_ID/outputs_router" || echo "GSUTIL_SYNC_OUTPUTS_ROUTER_FAILED"
gsutil -m rsync -r logs "\$BUCKET/runs/\$RUN_ID/logs" || echo "GSUTIL_SYNC_LOGS_FAILED"
EOF

  gcloud compute instances create "$NAME" \
    --project "$PROJECT" \
    --zone "$ZONE" \
    --machine-type "$MACHINE" \
    --service-account "$SERVICE_ACCOUNT" \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --provisioning-model=SPOT \
    --instance-termination-action=STOP \
    --maintenance-policy TERMINATE \
    --restart-on-failure \
    --boot-disk-size 200GB \
    --image-family "$IMAGE_FAMILY" \
    --image-project "$IMAGE_PROJECT" \
    --metadata-from-file startup-script="$STARTUP_FILE",shutdown-script="$SHUTDOWN_FILE"

  INDEX=$((INDEX+1))
done
