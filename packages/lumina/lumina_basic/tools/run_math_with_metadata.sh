#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

python -m lumina_basic.inference.run_math_with_metadata \
  --question "${LUMINA_BASIC_QUESTION:?set LUMINA_BASIC_QUESTION}" \
  --num-conf-heads "${LUMINA_BASIC_CONF_HEADS:-3}" \
  --max-new-tokens "${LUMINA_BASIC_MAX_NEW_TOKENS:-24}" \
  --answer-conf-threshold "${LUMINA_BASIC_ANSWER_CONF:-0.20}" \
  --escalate-threshold "${LUMINA_BASIC_ESCALATE_CONF:-0.35}" \
  --seed "${LUMINA_BASIC_SEED:-7}" \
  --output-json "${LUMINA_BASIC_OUTPUT_JSON:-lumina_basic/notes/math_runtime_latest.json}"
