#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NVME_ROOT="${LUMINA_NVME_ROOT:-}"
DATA_ROOT="${DATA_ROOT:-${NVME_ROOT:+$NVME_ROOT/datasets_hq_med}}"
DATA_ROOT="${DATA_ROOT:-datasets_hq_med}"
OUTPUTS_GPT2_DIR="${OUTPUTS_GPT2_DIR:-${NVME_ROOT:+$NVME_ROOT/outputs_gpt2}}"
OUTPUTS_GPT2_DIR="${OUTPUTS_GPT2_DIR:-outputs_gpt2}"
OUTPUTS_ROUTER_DIR="${OUTPUTS_ROUTER_DIR:-${NVME_ROOT:+$NVME_ROOT/outputs_router}}"
OUTPUTS_ROUTER_DIR="${OUTPUTS_ROUTER_DIR:-outputs_router}"
LOG_DIR="${LOG_DIR:-${NVME_ROOT:+$NVME_ROOT/logs}}"
LOG_DIR="${LOG_DIR:-logs}"
MAX_SAMPLES="${MAX_SAMPLES:-5000}"
GEN_MODEL="${GENERATOR_MODEL:-gpt2-medium}"
CONF_CALIB="${CONF_CALIB:-$OUTPUTS_GPT2_DIR/conf_calibration_hq_med.json}"
WEIGHT_GENERAL="${WEIGHT_GENERAL:-$OUTPUTS_GPT2_DIR/general_gpt2_confidence.pt}"
WEIGHT_MATH="${WEIGHT_MATH:-$OUTPUTS_GPT2_DIR/math_gpt2_confidence.pt}"
WEIGHT_CODE="${WEIGHT_CODE:-$OUTPUTS_GPT2_DIR/code_gpt2_confidence.pt}"
ROUTER_WEIGHTS="${ROUTER_WEIGHTS:-$OUTPUTS_ROUTER_DIR/router.pt}"
ROUTER_LABELS="${ROUTER_LABELS:-$OUTPUTS_ROUTER_DIR/labels.json}"

BASE_GEN_DIR="${BASE_GEN_DIR:-outputs_gen_filtered}"
CAND_GEN_DIR="${CAND_GEN_DIR:-outputs_gen_stagea}"
BASE_LABEL="${BASE_LABEL:-filtered}"
CAND_LABEL="${CAND_LABEL:-hq_stagea}"

TRANSFORMERS_OFFLINE_VALUE="${TRANSFORMERS_OFFLINE:-0}"
HF_DATASETS_OFFLINE_VALUE="${HF_DATASETS_OFFLINE:-0}"

mkdir -p "$LOG_DIR"

COMMON_ARGS=(
  --data-root "$DATA_ROOT"
  --domains general math code
  --weights "$WEIGHT_GENERAL" "$WEIGHT_MATH" "$WEIGHT_CODE"
  --router-weights "$ROUTER_WEIGHTS"
  --router-labels "$ROUTER_LABELS"
  --max-samples "$MAX_SAMPLES"
  --max-new-tokens 40
  --alpha 0.5
  --top-k 2
  --abstain-threshold 0.55
  --conflict-margin 0.05
)

if [ -f "$CONF_CALIB" ]; then
  COMMON_ARGS+=(--conf-calibration "$CONF_CALIB")
fi

run_eval() {
  local label="$1"
  local gen_dir="$2"
  local out="$LOG_DIR/agg_hq_med_ab_${label}.txt"

  if [ ! -d "$gen_dir" ]; then
    echo "Missing generator dir: $gen_dir"
    exit 1
  fi

  echo "=== HQ-MED A/B | ${label} | ${gen_dir} ===" | tee "$out"
  TRANSFORMERS_OFFLINE="$TRANSFORMERS_OFFLINE_VALUE" HF_DATASETS_OFFLINE="$HF_DATASETS_OFFLINE_VALUE" \
    python -u -m evaluation.eval_aggregator_minimal \
      "${COMMON_ARGS[@]}" \
      --generator-model "$GEN_MODEL" \
      --generator-domain-weights \
        "$gen_dir/general_${GEN_MODEL}_gen" \
        "$gen_dir/math_${GEN_MODEL}_gen" \
        "$gen_dir/code_${GEN_MODEL}_gen" \
      2>&1 | tee -a "$out"
}

run_eval "$BASE_LABEL" "$BASE_GEN_DIR"
run_eval "$CAND_LABEL" "$CAND_GEN_DIR"

echo
echo "=== Summary ==="
for f in "$LOG_DIR"/agg_hq_med_ab_"$BASE_LABEL".txt "$LOG_DIR"/agg_hq_med_ab_"$CAND_LABEL".txt; do
  echo "--- $(basename "$f") ---"
  grep -E '^(Samples:|Route accuracy:|Aggregation EM|Aggregation F1|Aggregation task score|Task success@0.7|Abstain rate:|Agreement rate)' "$f" || true
done
