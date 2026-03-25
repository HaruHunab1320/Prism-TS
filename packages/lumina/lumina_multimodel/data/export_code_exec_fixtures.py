#!/usr/bin/env python3
"""
Export stable local JSONL fixtures for code execution benchmarks.

This avoids deprecated Hugging Face dataset-script loaders by downloading
known parquet files directly from dataset repos.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from datasets import load_dataset
from huggingface_hub import hf_hub_download


MBPP_REPO = "Muennighoff/mbpp"
MBPP_FILE = "sanitized/mbpp-test.parquet"
HUMANEVAL_REPO = "openai/openai_humaneval"
HUMANEVAL_FILE = "openai_humaneval/test-00000-of-00001.parquet"


def write_jsonl(path: Path, rows) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def export_mbpp(out_root: Path) -> int:
    parquet_path = hf_hub_download(
        repo_id=MBPP_REPO,
        filename=MBPP_FILE,
        repo_type="dataset",
    )
    ds = load_dataset("parquet", data_files=parquet_path, split="train")
    rows = []
    for ex in ds:
        rows.append(
            {
                "benchmark": "mbpp",
                "task_id": str(ex.get("task_id")),
                "question": ex.get("text") or ex.get("prompt") or "",
                "prompt": "",
                "reference": ex.get("code") or "",
                "test_setup_code": ex.get("test_setup_code") or "",
                "tests": list(ex.get("test_list") or []),
            }
        )
    write_jsonl(out_root / "mbpp_test.jsonl", rows)
    return len(rows)


def export_humaneval(out_root: Path) -> int:
    parquet_path = hf_hub_download(
        repo_id=HUMANEVAL_REPO,
        filename=HUMANEVAL_FILE,
        repo_type="dataset",
    )
    ds = load_dataset("parquet", data_files=parquet_path, split="train")
    rows = []
    for ex in ds:
        rows.append(
            {
                "benchmark": "humaneval",
                "task_id": str(ex.get("task_id")),
                "question": ex.get("prompt") or "",
                "prompt": ex.get("prompt") or "",
                "reference": ex.get("canonical_solution") or "",
                "test": ex.get("test") or "",
                "entry_point": ex.get("entry_point") or "",
            }
        )
    write_jsonl(out_root / "humaneval_test.jsonl", rows)
    return len(rows)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out-root", type=Path, default=Path("benchmarks/code_exec"))
    args = p.parse_args()

    args.out_root.mkdir(parents=True, exist_ok=True)
    mbpp_n = export_mbpp(args.out_root)
    humaneval_n = export_humaneval(args.out_root)
    print(f"exported mbpp={mbpp_n} humaneval={humaneval_n} to {args.out_root}")


if __name__ == "__main__":
    main()
