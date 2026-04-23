#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

: "${LUMINA_MICRO_MODEL:=Qwen/Qwen2.5-Coder-1.5B-Instruct}"
: "${LUMINA_MICRO_SOURCE:=target}"

python -m lumina_micro_specialists.evaluation.eval_js_reduce_accumulator_refactor \
  --dataset lumina_micro_specialists/data/datasets/js_reduce_accumulator_refactor_v1/val.jsonl \
  --candidate-source "${LUMINA_MICRO_SOURCE}" \
  --model "${LUMINA_MICRO_MODEL}" \
  --max-samples 32 \
  --output-json lumina_micro_specialists/notes/js_reduce_accumulator_refactor_baseline_latest.json
