#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DATA_ROOT="${DATA_ROOT:-datasets_hq_med}"
WEIGHT_GENERAL="outputs_gpt2/general_gpt2_confidence.pt"
WEIGHT_MATH="outputs_gpt2/math_gpt2_confidence.pt"
WEIGHT_CODE="outputs_gpt2/code_gpt2_confidence.pt"
GEN_MODEL="${GENERATOR_MODEL:-gpt2-medium}"
GEN_MODEL_TAG="${GEN_MODEL//\//_}"
CONF_CALIB="${CONF_CALIB:-outputs_gpt2/conf_calibration_hq_med.json}"

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

EXTRA_ARGS=()
if [ -f "$CONF_CALIB" ]; then
  EXTRA_ARGS+=(--conf-calibration "$CONF_CALIB")
fi

TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 python -m evaluation.eval_aggregator_minimal \
  --data-root "$DATA_ROOT" \
  --domains general math code \
  --weights "$WEIGHT_GENERAL" "$WEIGHT_MATH" "$WEIGHT_CODE" \
  --generator-domain-weights \
    "outputs_gen/general_${GEN_MODEL_TAG}_gen" \
    "outputs_gen/math_${GEN_MODEL_TAG}_gen" \
    "outputs_gen/code_${GEN_MODEL_TAG}_gen" \
  --router-weights outputs_router/router.pt \
  --router-labels outputs_router/labels.json \
  --max-samples 5000 \
  --max-new-tokens 40 \
  --alpha 0.5 \
  --top-k 2 \
  --abstain-threshold 0.55 \
  --conflict-margin 0.05 \
  "${EXTRA_ARGS[@]}"
