#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-/Volumes/ROCKET-nano/lumina_multimodel}"
DATA_ROOT="${DATA_ROOT:-$NVME_ROOT/datasets_hq_med_distill_v1}"

OUTPUTS_GPT2_DIR="${OUTPUTS_GPT2_DIR:-outputs_gpt2}"
OUTPUTS_ROUTER_DIR="${OUTPUTS_ROUTER_DIR:-outputs_router}"

GENERAL_GEN="${GENERAL_GEN:-outputs_gen_overfit/general_Qwen_Qwen2.5-0.5B-Instruct_gen}"
MATH_GEN="${MATH_GEN:-outputs_gen_overfit/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen}"
CODE_GEN="${CODE_GEN:-outputs_gen_overfit/code_Qwen_Qwen2.5-0.5B-Instruct_gen}"

GENERATOR_MODEL="${GENERATOR_MODEL:-Qwen/Qwen2.5-0.5B-Instruct}"
CONF_CALIBRATION="${CONF_CALIBRATION:-$OUTPUTS_GPT2_DIR/conf_calibration_mixed_qwen.json}"

MAX_SAMPLES="${MAX_SAMPLES:-300}"
MAX_NEW_TOKENS="${MAX_NEW_TOKENS:-24}"
ALPHA="${ALPHA:-0.5}"
TOP_K="${TOP_K:-2}"
ABSTAIN_THRESHOLD="${ABSTAIN_THRESHOLD:-0.55}"
CONFLICT_MARGIN="${CONFLICT_MARGIN:-0.05}"
SEED="${SEED:-7}"

DEVICE="${DEVICE:-cpu}"
TRANSFORMERS_OFFLINE="${TRANSFORMERS_OFFLINE:-1}"
HF_DATASETS_OFFLINE="${HF_DATASETS_OFFLINE:-1}"
LOG_PATH="${LOG_PATH:-/tmp/lumina_mix_gate_300_a05.log}"
export DEVICE TRANSFORMERS_OFFLINE HF_DATASETS_OFFLINE

echo "Running eval_aggregator_minimal..."
echo "  data-root: $DATA_ROOT"
echo "  log:       $LOG_PATH"

python -u -m evaluation.eval_aggregator_minimal \
  --data-root "$DATA_ROOT" \
  --domains general math code \
  --weights \
    "$OUTPUTS_GPT2_DIR/general_gpt2_confidence.pt" \
    "$OUTPUTS_GPT2_DIR/math_gpt2_confidence.pt" \
    "$OUTPUTS_GPT2_DIR/code_gpt2_confidence.pt" \
  --generator-domain-weights \
    "$GENERAL_GEN" \
    "$MATH_GEN" \
    "$CODE_GEN" \
  --generator-model "$GENERATOR_MODEL" \
  --router-weights "$OUTPUTS_ROUTER_DIR/router.pt" \
  --router-labels "$OUTPUTS_ROUTER_DIR/labels.json" \
  --max-samples "$MAX_SAMPLES" \
  --max-new-tokens "$MAX_NEW_TOKENS" \
  --alpha "$ALPHA" \
  --top-k "$TOP_K" \
  --abstain-threshold "$ABSTAIN_THRESHOLD" \
  --conflict-margin "$CONFLICT_MARGIN" \
  --seed "$SEED" \
  --conf-calibration "$CONF_CALIBRATION" \
  2>&1 | tee "$LOG_PATH"
