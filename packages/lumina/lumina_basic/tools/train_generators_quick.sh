#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMMON_ARGS=(
  --data-root datasets_merged
  --epochs 1
  --batch-size 4
  --lr 2e-5
  --unfreeze-n 2
  --max-train-samples 12000
  --max-val-samples 1000
  --output-dir outputs_gen
)

TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 python -m training.train_gpt2_generator --domain general "${COMMON_ARGS[@]}"
TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 python -m training.train_gpt2_generator --domain math "${COMMON_ARGS[@]}"
TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 python -m training.train_gpt2_generator --domain code "${COMMON_ARGS[@]}"
