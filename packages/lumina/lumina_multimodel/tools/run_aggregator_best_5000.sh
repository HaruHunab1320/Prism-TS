#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

WEIGHT_GENERAL="outputs_gpt2/general_gpt2_confidence.pt"
WEIGHT_MATH="outputs_gpt2/math_gpt2_confidence.pt"
WEIGHT_CODE="outputs_gpt2/code_gpt2_confidence.pt"

if [ ! -f "$WEIGHT_GENERAL" ] || [ ! -f "$WEIGHT_MATH" ] || [ ! -f "$WEIGHT_CODE" ]; then
  BUCKET_PATH="${LUMINA_BUCKET:-${BUCKET:-}}"
  if [ -n "$BUCKET_PATH" ]; then
    echo "Missing confidence weights; attempting to sync from $BUCKET_PATH/outputs_gpt2"
    mkdir -p outputs_gpt2
    gsutil -m rsync -r "$BUCKET_PATH/outputs_gpt2" outputs_gpt2 || true
  fi
fi

if [ ! -f "$WEIGHT_GENERAL" ] || [ ! -f "$WEIGHT_MATH" ] || [ ! -f "$WEIGHT_CODE" ]; then
  echo "Missing confidence weights in outputs_gpt2; skipping aggregator run."
  exit 0
fi

TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 python -m evaluation.eval_aggregator_minimal \
  --data-root datasets_merged \
  --domains general math code \
  --weights "$WEIGHT_GENERAL" "$WEIGHT_MATH" "$WEIGHT_CODE" \
  --generator-domain-weights outputs_gen/general_gpt2_gen outputs_gen/math_gpt2_gen outputs_gen/code_gpt2_gen \
  --router-weights outputs_router/router.pt \
  --router-labels outputs_router/labels.json \
  --max-samples 5000 \
  --max-new-tokens 40 \
  --alpha 0.5 \
  --top-k 2 \
  --abstain-threshold 0.55 \
  --conflict-margin 0.05
