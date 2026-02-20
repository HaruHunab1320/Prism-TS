# Local Script Usage

Run these from `lumina_multimodel/` (not from `scripts/`):

```bash
cd /Users/jakobgrant/Workspaces/Prism-TS/packages/lumina/lumina_multimodel
source .venv/bin/activate
```

## Calibration (HQ-med)

```bash
bash scripts/build_conf_calibration_hq_med_local.sh
```

## Aggregator eval (HQ-med, 5k)

Online HF fetch if needed:

```bash
TRANSFORMERS_OFFLINE=0 HF_DATASETS_OFFLINE=0 \
bash scripts/run_eval_hq_med_5000_local.sh
```

Strict offline mode (only if cache is already present):

```bash
TRANSFORMERS_OFFLINE=1 HF_DATASETS_OFFLINE=1 \
bash scripts/run_eval_hq_med_5000_local.sh
```
