#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-}"
DATA_ROOT="${DATA_ROOT:-${NVME_ROOT:+$NVME_ROOT/datasets_hq_med}}"
DATA_ROOT="${DATA_ROOT:-datasets_hq_med}"
OUTPUTS_GPT2_DIR="${OUTPUTS_GPT2_DIR:-${NVME_ROOT:+$NVME_ROOT/outputs_gpt2}}"
OUTPUTS_GPT2_DIR="${OUTPUTS_GPT2_DIR:-outputs_gpt2}"
OUTPUTS_GEN_DIR="${OUTPUTS_GEN_DIR:-${NVME_ROOT:+$NVME_ROOT/outputs_gen}}"
OUTPUTS_GEN_DIR="${OUTPUTS_GEN_DIR:-outputs_gen}"
OUTPUTS_ROUTER_DIR="${OUTPUTS_ROUTER_DIR:-${NVME_ROOT:+$NVME_ROOT/outputs_router}}"
OUTPUTS_ROUTER_DIR="${OUTPUTS_ROUTER_DIR:-outputs_router}"

HF_HOME="${HF_HOME:-${NVME_ROOT:+$NVME_ROOT/hf_cache}}"
HF_HOME="${HF_HOME:-$HOME/.cache/huggingface}"
TRANSFORMERS_OFFLINE="${TRANSFORMERS_OFFLINE:-1}"
HF_DATASETS_OFFLINE="${HF_DATASETS_OFFLINE:-1}"
DEVICE="${DEVICE:-mps}"
export HF_HOME TRANSFORMERS_OFFLINE HF_DATASETS_OFFLINE DEVICE

GEN_MODEL="${GENERATOR_MODEL:-gpt2}"
GEN_MODEL_TAG="${GEN_MODEL//\//_}"

PYTORCH_ENABLE_MPS_FALLBACK=1 \
python -u -m evaluation.eval_aggregator_minimal \
  --data-root "$DATA_ROOT" \
  --domains general math code \
  --weights "$OUTPUTS_GPT2_DIR/general_gpt2_confidence.pt" "$OUTPUTS_GPT2_DIR/math_gpt2_confidence.pt" "$OUTPUTS_GPT2_DIR/code_gpt2_confidence.pt" \
  --generator-model "$GEN_MODEL" \
  --generator-domain-weights \
    "$OUTPUTS_GEN_DIR/general_${GEN_MODEL_TAG}_gen" \
    "$OUTPUTS_GEN_DIR/math_${GEN_MODEL_TAG}_gen" \
    "$OUTPUTS_GEN_DIR/code_${GEN_MODEL_TAG}_gen" \
  --router-weights "$OUTPUTS_ROUTER_DIR/router.pt" \
  --router-labels "$OUTPUTS_ROUTER_DIR/labels.json" \
  --max-samples 5000 \
  --max-new-tokens 40 \
  --alpha 0.5 \
  --top-k 2 \
  --abstain-threshold 0.55 \
  --conflict-margin 0.05 \
  --conf-calibration "$OUTPUTS_GPT2_DIR/conf_calibration_hq_med.json" \
  2>&1 | tee /tmp/agg_debug.txt
