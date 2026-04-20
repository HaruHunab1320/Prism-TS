#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

python -m lumina_micro_specialists.training.train_js_reduce_object_index_builder_confidence_head \
  --model "${LUMINA_MICRO_JS_INDEX_MODEL:-Qwen/Qwen2.5-Coder-1.5B-Instruct}" \
  "$@"
