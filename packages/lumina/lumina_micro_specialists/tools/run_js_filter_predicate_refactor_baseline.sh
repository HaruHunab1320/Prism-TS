#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
LUMINA_MICRO_SOURCE="${LUMINA_MICRO_SOURCE:-target}"
LUMINA_MICRO_MODEL="${LUMINA_MICRO_MODEL:-Qwen/Qwen2.5-Coder-1.5B-Instruct}"
python -m lumina_micro_specialists.evaluation.eval_js_filter_predicate_refactor \
  --dataset lumina_micro_specialists/data/datasets/js_filter_predicate_refactor_v1/val.jsonl \
  --candidate-source "$LUMINA_MICRO_SOURCE" \
  --model "$LUMINA_MICRO_MODEL" \
  --max-samples 64 \
  --output-json lumina_micro_specialists/notes/js_filter_predicate_refactor_model_baseline_latest.json
