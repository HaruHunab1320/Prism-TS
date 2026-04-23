#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

python -m lumina_basic.evaluation.smoke_eval \
  --model "${LUMINA_BASIC_MODEL:-distilgpt2}" \
  --num-conf-heads "${LUMINA_BASIC_CONF_HEADS:-3}" \
  --max-new-tokens "${LUMINA_BASIC_MAX_NEW_TOKENS:-24}" \
  --answer-conf-threshold "${LUMINA_BASIC_ANSWER_CONF:-0.50}" \
  --output-json "${LUMINA_BASIC_OUTPUT_JSON:-lumina_basic/notes/smoke_latest.json}"
