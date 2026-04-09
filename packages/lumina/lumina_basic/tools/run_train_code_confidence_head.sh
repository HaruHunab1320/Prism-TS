#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PKG_DIR}/.."

python -m lumina_basic.training.train_code_confidence_head \
  --model "${LUMINA_BASIC_CODE_MODEL:?set LUMINA_BASIC_CODE_MODEL}" \
  --benchmark "${LUMINA_BASIC_CODE_BENCHMARK:-both}" \
  --fixture-root "${LUMINA_BASIC_CODE_FIXTURE_ROOT:-lumina_multimodel/benchmarks/code_exec}" \
  --max-train-samples "${LUMINA_BASIC_CODE_TRAIN_SAMPLES:-100}" \
  --max-val-samples "${LUMINA_BASIC_CODE_VAL_SAMPLES:-100}" \
  --max-new-tokens "${LUMINA_BASIC_CODE_MAX_NEW_TOKENS:-128}" \
  --timeout-sec "${LUMINA_BASIC_CODE_TIMEOUT_SEC:-4.0}" \
  --strict-code-contract \
  --output "${LUMINA_BASIC_CODE_CONFIDENCE_HEAD_OUT:-lumina_basic/outputs/code_confidence_probe.pt}" \
  --metrics-json "${LUMINA_BASIC_OUTPUT_JSON:-lumina_basic/notes/code_confidence_probe_latest.json}"
