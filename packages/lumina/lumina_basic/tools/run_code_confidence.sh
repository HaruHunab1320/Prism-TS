#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

STRICT_FLAG=()
if [[ "${LUMINA_BASIC_STRICT_CODE_CONTRACT:-1}" != "0" ]]; then
  STRICT_FLAG+=(--strict-code-contract)
fi

python -m lumina_basic.evaluation.eval_code_confidence \
  --model "${LUMINA_BASIC_CODE_MODEL:?set LUMINA_BASIC_CODE_MODEL}" \
  --benchmark "${LUMINA_BASIC_CODE_BENCHMARK:-both}" \
  --fixture-root "${LUMINA_BASIC_CODE_FIXTURE_ROOT:-lumina_multimodel/benchmarks/code_exec}" \
  --max-samples "${LUMINA_BASIC_CODE_MAX_SAMPLES:-100}" \
  --max-new-tokens "${LUMINA_BASIC_CODE_MAX_NEW_TOKENS:-128}" \
  --timeout-sec "${LUMINA_BASIC_CODE_TIMEOUT_SEC:-4.0}" \
  "${STRICT_FLAG[@]}" \
  --output-json "${LUMINA_BASIC_OUTPUT_JSON:-lumina_basic/notes/code_confidence_latest.json}"
