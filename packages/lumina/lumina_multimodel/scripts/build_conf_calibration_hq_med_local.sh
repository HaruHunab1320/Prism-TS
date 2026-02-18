#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 \
python -m evaluation.build_conf_calibration \
  --data-root datasets_hq_med \
  --domains general math code \
  --weights "outputs_gpt2/general_gpt2_confidence.pt" "outputs_gpt2/math_gpt2_confidence.pt" "outputs_gpt2/code_gpt2_confidence.pt" \
  --max-samples 5000 \
  --output outputs_gpt2/conf_calibration_hq_med.json
