#!/usr/bin/env bash
set -euo pipefail

PROMPT=${LUMINA_MICRO_PROMPT:-"Refactor this JavaScript into more idiomatic functional code."}
INPUT=${LUMINA_MICRO_INPUT:-"examples/multi_transform_input.js"}
BACKEND=${LUMINA_MICRO_BACKEND:-mock}
OLLAMA_MODEL=${LUMINA_MICRO_OLLAMA_MODEL:-llama3.1:latest}
OLLAMA_KEEPALIVE=${LUMINA_MICRO_OLLAMA_KEEPALIVE:-5m}
OUTPUT=${LUMINA_MICRO_OUTPUT:-""}

cmd=(python -m lumina_micro.demo.run_demo_trace --prompt "$PROMPT" --input "$INPUT" --backend "$BACKEND" --ollama-model "$OLLAMA_MODEL" --ollama-keepalive "$OLLAMA_KEEPALIVE")
if [[ -n "$OUTPUT" ]]; then
  cmd+=(--output "$OUTPUT")
fi
"${cmd[@]}"
