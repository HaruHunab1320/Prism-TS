#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

HF_HOME="${HF_HOME:-$HOME/.cache/huggingface}"
TRANSFORMERS_OFFLINE="${TRANSFORMERS_OFFLINE:-1}"
HF_DATASETS_OFFLINE="${HF_DATASETS_OFFLINE:-1}"
export HF_HOME TRANSFORMERS_OFFLINE HF_DATASETS_OFFLINE

GEN_MODEL="${GENERATOR_MODEL:-gpt2}"
GEN_MODEL_TAG="${GEN_MODEL//\//_}"

PYTORCH_ENABLE_MPS_FALLBACK=1 \
python -u -m evaluation.eval_aggregator_minimal \
  --data-root datasets_hq_med \
  --domains general math code \
  --weights "outputs_gpt2/general_gpt2_confidence.pt" "outputs_gpt2/math_gpt2_confidence.pt" "outputs_gpt2/code_gpt2_confidence.pt" \
  --generator-model "$GEN_MODEL" \
  --generator-domain-weights \
    "outputs_gen/general_${GEN_MODEL_TAG}_gen" \
    "outputs_gen/math_${GEN_MODEL_TAG}_gen" \
    "outputs_gen/code_${GEN_MODEL_TAG}_gen" \
  --router-weights "outputs_router/router.pt" \
  --router-labels "outputs_router/labels.json" \
  --max-samples 5000 \
  --max-new-tokens 40 \
  --alpha 0.5 \
  --top-k 2 \
  --abstain-threshold 0.55 \
  --conflict-margin 0.05 \
  --conf-calibration "outputs_gpt2/conf_calibration_hq_med.json" \
  2>&1 | tee /tmp/agg_debug.txt
