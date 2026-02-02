#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 python -m evaluation.eval_aggregator_minimal \
  --data-root datasets_merged \
  --domains general math code \
  --weights outputs_gpt2/general_gpt2_confidence.pt outputs_gpt2/math_gpt2_confidence.pt outputs_gpt2/code_gpt2_confidence.pt \
  --generator-domain-weights outputs_gen/general_gpt2_gen outputs_gen/math_gpt2_gen outputs_gen/code_gpt2_gen \
  --router-weights outputs_router/router.pt \
  --router-labels outputs_router/labels.json \
  --max-samples 1000 \
  --max-new-tokens 40 \
  --alpha 0.7 \
  --top-k 2 \
  --abstain-threshold 0.50 \
  --conflict-margin 0.03
