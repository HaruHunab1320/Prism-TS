# HQ v2 Dataset Plan

Goal: stop iterating on weak/undersized data and move to a stronger public dataset mix.

## Public dataset mix

### General
- SQuAD v2
- TriviaQA
- Natural Questions / NQ-open when available

### Math
- GSM8K
- MetaMathQA (capped)

### Code
- MBPP
- HumanEval
- CodeAlpaca (optional but enabled in build script)

## Why this is better than current HQ-med
- larger and cleaner validation splits
- stronger general-domain coverage
- stronger math train volume
- code domain no longer relies on extremely tiny validation only
- dedupe + answer-length filtering baked into ingestion

## Build

```bash
cd packages/lumina/lumina_multimodel
source .venv/bin/activate
export LUMINA_NVME_ROOT="/Volumes/ROCKET-nano/lumina_multimodel"

bash tools/build_hq_v2_dataset.sh
```

Result lands on NVMe at:

```text
/Volumes/ROCKET-nano/lumina_multimodel/datasets_hq_v2
```

## Next training target

Use `datasets_hq_v2` for the next specialist run once ingestion succeeds.
