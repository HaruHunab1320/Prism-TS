#!/usr/bin/env python3
"""
Export stable local JSONL fixtures for code execution benchmarks.

Preferred source is the local Hugging Face dataset cache, which is stable and
avoids dataset-script/parquet repo drift. Remote parquet download remains as a
fallback for environments where the cache is unavailable.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from datasets import load_dataset
from huggingface_hub import HfApi, hf_hub_download


MBPP_REPO = "Muennighoff/mbpp"
HUMANEVAL_REPO = "openai/openai_humaneval"
API = HfApi()
LOCAL_MBPP_ARROW = Path.home() / ".cache/huggingface/datasets/Muennighoff___mbpp/full/1.0.0/96ea6fd86d7c288cc4e1983d030d02a1159753a4dbb9891d5cb3cd5b502e929c/mbpp-test.arrow"
LOCAL_HUMANEVAL_ARROW = Path.home() / ".cache/huggingface/datasets/openai_humaneval/openai_humaneval/0.0.0/cef7a031cbe4ef77/openai_humaneval-test.arrow"


def write_jsonl(path: Path, rows) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def resolve_repo_parquet(repo_id: str, required_terms: list[str]) -> str:
    files = API.list_repo_files(repo_id=repo_id, repo_type="dataset")
    parquet_files = [f for f in files if f.endswith(".parquet")]
    if not parquet_files:
        raise RuntimeError(f"No parquet files found in dataset repo {repo_id}")

    lowered_terms = [t.lower() for t in required_terms]
    ranked = []
    for path in parquet_files:
        score = 0
        lowered = path.lower()
        for term in lowered_terms:
            if term in lowered:
                score += 1
        ranked.append((score, path))
    ranked.sort(key=lambda x: (-x[0], x[1]))
    best_score, best_path = ranked[0]
    if best_score == 0:
        raise RuntimeError(
            f"Could not resolve parquet path in {repo_id}; parquet files were: {parquet_files}"
        )
    return best_path


def load_arrow_or_parquet(local_arrow: Path, repo_id: str, required_terms: list[str]):
    if local_arrow.exists():
        from datasets import Dataset

        return Dataset.from_file(str(local_arrow))

    parquet_file = resolve_repo_parquet(repo_id, required_terms)
    parquet_path = hf_hub_download(
        repo_id=repo_id,
        filename=parquet_file,
        repo_type="dataset",
    )
    return load_dataset("parquet", data_files=parquet_path, split="train")


def export_mbpp(out_root: Path) -> int:
    ds = load_arrow_or_parquet(LOCAL_MBPP_ARROW, MBPP_REPO, ["mbpp", "test"])
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
    ds = load_arrow_or_parquet(LOCAL_HUMANEVAL_ARROW, HUMANEVAL_REPO, ["test", "humaneval"])
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
