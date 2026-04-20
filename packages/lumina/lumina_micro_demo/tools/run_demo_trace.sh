#!/usr/bin/env bash
set -euo pipefail

PROMPT=${LUMINA_MICRO_DEMO_PROMPT:-"Refactor this JavaScript into more idiomatic functional code."}
INPUT=${LUMINA_MICRO_DEMO_INPUT:-"lumina_micro_demo/examples/multi_transform_input.js"}
OUTPUT=${LUMINA_MICRO_DEMO_OUTPUT:-""}

cmd=(python -m lumina_micro_demo.run_demo_trace --prompt "$PROMPT" --input "$INPUT")
if [[ -n "$OUTPUT" ]]; then
  cmd+=(--output "$OUTPUT")
fi
"${cmd[@]}"
