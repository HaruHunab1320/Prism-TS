# Scripts

Place data-prep, training, and evaluation scripts here. A few ideas:

- `prepare_dataset.py` — turns repo fixtures/tests into jsonl examples.
- `train_lora.py` — wraps PEFT/QLoRA fine-tuning on a base model.
- `eval_prism.py` — runs generated code through `pnpm --filter @prism-lang/core test` or validator streaming checks.

These scripts are intentionally outside the pnpm/turbo pipelines, so use standard Python tooling (venv, poetry, etc.) as needed.
