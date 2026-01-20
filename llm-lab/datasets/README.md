# Datasets

Store structured data for training/evaluation here. Suggested formats:

- `*.jsonl` — prompt/response pairs with metadata.
- `*.parquet` — large batches processed offline.
- `catalog.json` — optional manifest describing each dataset (source, size, license).

Keep raw data separate from processed samples if you need reproducibility. For example:

```
raw/
  prism_scrapes.jsonl
processed/
  prism_sft_train.jsonl
  prism_sft_eval.jsonl
```
