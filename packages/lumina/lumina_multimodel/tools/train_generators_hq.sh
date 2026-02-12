#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DATA_ROOT="datasets_hq"
MAX_VAL="${MAX_VAL:-5000}"
MAX_GEN="${MAX_GEN:-300000}"
MAX_MATH="${MAX_MATH:-100000}"
MAX_CODE="${MAX_CODE:-100000}"
EPOCHS="${EPOCHS:-1}"
BATCH_SIZE="${BATCH_SIZE:-8}"
MODEL_NAME="${MODEL_NAME:-gpt2}"

python -m training.train_gpt2_generator \
  --data-root "$DATA_ROOT" --domain general --epochs "$EPOCHS" --batch-size "$BATCH_SIZE" \
  --max-train-samples "$MAX_GEN" --max-val-samples "$MAX_VAL" \
  --model-name "$MODEL_NAME"

python -m training.train_gpt2_generator \
  --data-root "$DATA_ROOT" --domain math --epochs "$EPOCHS" --batch-size "$BATCH_SIZE" \
  --max-train-samples "$MAX_MATH" --max-val-samples "$MAX_VAL" \
  --model-name "$MODEL_NAME"

python -m training.train_gpt2_generator \
  --data-root "$DATA_ROOT" --domain code --epochs "$EPOCHS" --batch-size "$BATCH_SIZE" \
  --max-train-samples "$MAX_CODE" --max-val-samples "$MAX_VAL" \
  --model-name "$MODEL_NAME"
