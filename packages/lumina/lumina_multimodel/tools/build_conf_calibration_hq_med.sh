#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DATA_ROOT="${DATA_ROOT:-datasets_hq_med}"
MAX_SAMPLES="${MAX_SAMPLES:-5000}"
OUT_PATH="${OUT_PATH:-outputs_gpt2/conf_calibration_hq_med.json}"

python -m evaluation.build_conf_calibration \
  --data-root "$DATA_ROOT" \
  --domains general math code \
  --weights outputs_gpt2/general_gpt2_confidence.pt outputs_gpt2/math_gpt2_confidence.pt outputs_gpt2/code_gpt2_confidence.pt \
  --max-samples "$MAX_SAMPLES" \
  --output "$OUT_PATH"
