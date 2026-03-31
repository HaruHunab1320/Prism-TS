#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

python -m lumina_basic.evaluation.select_math_confidence_policy \
  --eval-json "${LUMINA_BASIC_EVAL_JSON:-lumina_basic/notes/math_confidence_latest.json}" \
  --min-coverage "${LUMINA_BASIC_MIN_COVERAGE:-0.25}" \
  --min-gain "${LUMINA_BASIC_MIN_GAIN:-0.02}" \
  --output-json "${LUMINA_BASIC_POLICY_JSON:-lumina_basic/notes/math_confidence_policy_latest.json}"
