#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-/Volumes/ROCKET-nano/lumina_multimodel}"
DATA_ROOT="${DATA_ROOT:-$NVME_ROOT/datasets_hq_med_distill_v1}"

MODEL_NAME="${MODEL_NAME:-Qwen/Qwen2.5-0.5B-Instruct}"
OUTPUT_DIR="${OUTPUT_DIR:-outputs_gen_overfit_v2}"
EPOCHS="${EPOCHS:-1}"
BATCH_SIZE="${BATCH_SIZE:-8}"
LR="${LR:-2e-5}"
MAX_LEN="${MAX_LEN:-256}"
MAX_TRAIN_SAMPLES="${MAX_TRAIN_SAMPLES:-20000}"
MAX_VAL_SAMPLES="${MAX_VAL_SAMPLES:-1000}"
UNFREEZE_N="${UNFREEZE_N:-2}"
ANSWER_MAX_TOKENS="${ANSWER_MAX_TOKENS:-12}"

DEVICE="${DEVICE:-}"
TRANSFORMERS_OFFLINE="${TRANSFORMERS_OFFLINE:-1}"
HF_DATASETS_OFFLINE="${HF_DATASETS_OFFLINE:-1}"
PYTORCH_ENABLE_MPS_FALLBACK="${PYTORCH_ENABLE_MPS_FALLBACK:-1}"
if [[ -z "$DEVICE" ]]; then
  DEVICE="$(python - <<'PY'
import torch
print("mps" if torch.backends.mps.is_available() else "cpu")
PY
)"
fi
export DEVICE TRANSFORMERS_OFFLINE HF_DATASETS_OFFLINE PYTORCH_ENABLE_MPS_FALLBACK

echo "Training general generator v2..."
echo "  model: $MODEL_NAME"
echo "  data:  $DATA_ROOT"
echo "  out:   $OUTPUT_DIR"

python -u -m training.train_gpt2_generator \
  --data-root "$DATA_ROOT" \
  --domain general \
  --model-name "$MODEL_NAME" \
  --epochs "$EPOCHS" \
  --batch-size "$BATCH_SIZE" \
  --lr "$LR" \
  --max-len "$MAX_LEN" \
  --max-train-samples "$MAX_TRAIN_SAMPLES" \
  --max-val-samples "$MAX_VAL_SAMPLES" \
  --unfreeze-n "$UNFREEZE_N" \
  --output-dir "$OUTPUT_DIR" \
  --quality-weighting \
  --strict-answer \
  --answer-max-tokens "$ANSWER_MAX_TOKENS"
