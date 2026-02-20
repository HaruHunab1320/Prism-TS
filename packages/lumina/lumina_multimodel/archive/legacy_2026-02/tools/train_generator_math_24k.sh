#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 python -m training.train_gpt2_generator \
  --data-root datasets_merged \
  --domain math \
  --epochs 1 \
  --batch-size 4 \
  --lr 2e-5 \
  --unfreeze-n 2 \
  --max-train-samples 24000 \
  --max-val-samples 2000 \
  --output-dir outputs_gen
