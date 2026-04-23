#!/usr/bin/env bash
set -euo pipefail

PROMPT=${LUMINA_MICRO_PROMPT:-"Refactor this JavaScript into more idiomatic functional code."}
INPUT=${LUMINA_MICRO_INPUT:-"examples/multi_transform_input.js"}
BACKEND=${LUMINA_MICRO_BACKEND:-mock}
OLLAMA_MODEL=${LUMINA_MICRO_OLLAMA_MODEL:-llama3.1:latest}
OLLAMA_KEEPALIVE=${LUMINA_MICRO_OLLAMA_KEEPALIVE:-5m}
ITERATIONS=${LUMINA_MICRO_ITERATIONS:-3}
OUTPUT=${LUMINA_MICRO_OUTPUT:-""}
COLD_FIRST=${LUMINA_MICRO_COLD_FIRST:-0}
COLD_EACH=${LUMINA_MICRO_COLD_EACH:-0}

cmd=(python -m lumina_micro.demo.bench_demo --prompt "$PROMPT" --input "$INPUT" --backend "$BACKEND" --ollama-model "$OLLAMA_MODEL" --ollama-keepalive "$OLLAMA_KEEPALIVE" --iterations "$ITERATIONS")
if [[ "$COLD_FIRST" == "1" ]]; then
  cmd+=(--cold-stop-first)
fi
if [[ "$COLD_EACH" == "1" ]]; then
  cmd+=(--cold-stop-each-run)
fi
if [[ -n "$OUTPUT" ]]; then
  cmd+=(--output "$OUTPUT")
fi
"${cmd[@]}"
