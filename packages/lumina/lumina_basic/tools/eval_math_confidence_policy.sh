#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

python -m lumina_basic.evaluation.eval_math_confidence_policy \
  --eval-json "${LUMINA_BASIC_EVAL_JSON:-lumina_basic/notes/math_confidence_latest.json}" \
  --mode "${LUMINA_BASIC_POLICY_MODE:-baseline}" \
  --threshold "${LUMINA_BASIC_POLICY_THRESHOLD:-0.25}" \
  --output-json "${LUMINA_BASIC_POLICY_OUTPUT_JSON:-lumina_basic/notes/math_confidence_policy_eval_latest.json}"
