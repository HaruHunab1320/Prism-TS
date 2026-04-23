#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

python -m lumina_basic.evaluation.eval_disagreement_signal \
  --model "${LUMINA_BASIC_MODEL:-distilgpt2}" \
  --num-conf-heads "${LUMINA_BASIC_CONF_HEADS:-3}" \
  --max-new-tokens "${LUMINA_BASIC_MAX_NEW_TOKENS:-24}" \
  --seed "${LUMINA_BASIC_SEED:-7}" \
  --initial-branches "${LUMINA_BASIC_INIT_BRANCHES:-2}" \
  --max-branches "${LUMINA_BASIC_MAX_BRANCHES:-8}" \
  --high-conf-threshold "${LUMINA_BASIC_HIGH_CONF:-0.65}" \
  --answer-conf-threshold "${LUMINA_BASIC_ANSWER_CONF:-0.50}" \
  --output-json "${LUMINA_BASIC_OUTPUT_JSON:-lumina_basic/notes/disagreement_signal_latest.json}"
