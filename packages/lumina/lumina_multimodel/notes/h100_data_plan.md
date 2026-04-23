# H100 Pilot Data Plan (HQ)

## Goal
Use high‑quality, short‑answer datasets to lift generator quality and show
larger end‑to‑end gains with the Lumina orchestration stack.

## Datasets
General QA:
- TriviaQA (primary)
- Optional: SQuAD v2 (answerable)

Math:
- GSM8K (primary)
- Optional: NuminaMath subset (short answers)

Code:
- MBPP + HumanEval (primary)
- Optional: CodeAlpaca subset (short outputs)

## Ingestion
Script:
`data/ingest_hq_datasets.py`

Defaults:
- answer length 2–40 words (<=300 chars)
- TriviaQA limit 300k
- NuminaMath limit 100k (optional)
- CodeAlpaca limit 100k (optional)

## Output
`datasets_hq/{domain}_specialist/{train,val}.jsonl`

## Next Steps
1) Run ingestion locally, upload `datasets_hq` to GCS.
2) Run H100 generators on `datasets_hq`.
3) Evaluate with best routing config:
   alpha=0.5, abstain=0.55, margin=0.05
