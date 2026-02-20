#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-}"
DATA_ROOT="${DATA_ROOT:-${NVME_ROOT:+$NVME_ROOT/datasets_hq_med}}"
DATA_ROOT="${DATA_ROOT:-datasets_hq_med}"
OUTPUTS_GPT2_DIR="${OUTPUTS_GPT2_DIR:-${NVME_ROOT:+$NVME_ROOT/outputs_gpt2}}"
OUTPUTS_GPT2_DIR="${OUTPUTS_GPT2_DIR:-outputs_gpt2}"
MAX_SAMPLES="${MAX_SAMPLES:-5000}"
OUT_PATH="${OUT_PATH:-$OUTPUTS_GPT2_DIR/conf_calibration_hq_med.json}"

python -m evaluation.build_conf_calibration \
  --data-root "$DATA_ROOT" \
  --domains general math code \
  --weights "$OUTPUTS_GPT2_DIR/general_gpt2_confidence.pt" "$OUTPUTS_GPT2_DIR/math_gpt2_confidence.pt" "$OUTPUTS_GPT2_DIR/code_gpt2_confidence.pt" \
  --max-samples "$MAX_SAMPLES" \
  --output "$OUT_PATH"
