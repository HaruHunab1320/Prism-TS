# Local Script Usage

Run these from `lumina_multimodel/` (not from `scripts/`):

```bash
cd /Users/jakobgrant/Workspaces/Prism-TS/packages/lumina/lumina_multimodel
source .venv/bin/activate
```

## Put heavy data on ROCKET-nano (recommended)

```bash
export LUMINA_NVME_ROOT="/Volumes/ROCKET-nano/lumina_multimodel"
mkdir -p "$LUMINA_NVME_ROOT"/{datasets_hq_med,outputs_gen,outputs_gpt2,outputs_router,logs,hf_cache}
```

All local scripts below will use `LUMINA_NVME_ROOT` automatically when set.

## Active local helpers

### Calibration (HQ-med)

```bash
bash scripts/build_conf_calibration_hq_med_local.sh
```

### Aggregator eval (HQ-med, 5k)

Online HF fetch if needed:

```bash
TRANSFORMERS_OFFLINE=0 HF_DATASETS_OFFLINE=0 \
bash scripts/run_eval_hq_med_5000_local.sh
```

By default this script sets `DEVICE=mps` and fails fast if MPS is unavailable.
Override explicitly if needed:

```bash
DEVICE=cpu bash scripts/run_eval_hq_med_5000_local.sh
```

Strict offline mode (only if cache is already present):

```bash
TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 \
bash scripts/run_eval_hq_med_5000_local.sh
```

### Router dataset rebuild

```bash
python scripts/build_router_dataset.py --data-root datasets_hq_med \
  --max-train-per-domain 30000 --max-val-per-domain 3000
```

### Gate helpers

- `scripts/run_domain_qa_gate.sh`
- `scripts/run_agg_gate_if_pass.sh`

### General uplift trainer

- `scripts/train_general_v2.sh`

## Archived local probes

Older distill/oracle probe wrappers were moved to `archive/legacy_2026-03/scripts/`.
