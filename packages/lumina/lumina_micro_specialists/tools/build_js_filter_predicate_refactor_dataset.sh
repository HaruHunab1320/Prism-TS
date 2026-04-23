#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python -m lumina_micro_specialists.data.build_js_filter_predicate_refactor_dataset "$@"
