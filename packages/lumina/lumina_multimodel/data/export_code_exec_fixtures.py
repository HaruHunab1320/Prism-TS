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
from huggingface_hub import HfApi, hf_hub_download


MBPP_REPO = "Muennighoff/mbpp"
HUMANEVAL_REPO = "openai/openai_humaneval"
API = HfApi()


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


def export_mbpp(out_root: Path) -> int:
    parquet_file = resolve_repo_parquet(MBPP_REPO, ["mbpp", "test"])
    parquet_path = hf_hub_download(
        repo_id=MBPP_REPO,
        filename=parquet_file,
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
    parquet_file = resolve_repo_parquet(HUMANEVAL_REPO, ["test", "humaneval"])
    parquet_path = hf_hub_download(
        repo_id=HUMANEVAL_REPO,
        filename=parquet_file,
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
