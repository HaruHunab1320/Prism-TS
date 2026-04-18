#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python -m lumina_micro_specialists.data.build_js_reduce_object_index_builder_dataset "$@"
