#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 python -m evaluation.eval_hybrid_routing \
  --data-root datasets_merged \
  --domains general math code \
  --weights outputs_gpt2/general_gpt2_confidence.pt outputs_gpt2/math_gpt2_confidence.pt outputs_gpt2/code_gpt2_confidence.pt \
  --router-weights outputs_router/router.pt \
  --router-labels outputs_router/labels.json \
  --max-samples 1000 \
  --alpha 0.7 \
  --seed 42
