#!/usr/bin/env python3
"""
Ingest Prism .prism files from the repo into datasets_real/prism.

This creates Q/A pairs where the answer includes the source Prism code.
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
OUT_ROOT = Path(__file__).resolve().parents[1] / "datasets_real" / "prism"

SEARCH_DIRS = [
    REPO_ROOT / "examples",
    REPO_ROOT / "packages" / "prism-examples",
]


def find_prism_files():
    files = []
    for d in SEARCH_DIRS:
        if not d.exists():
            continue
        files.extend(d.rglob("*.prism"))
    return sorted(set(files))


def to_row(path: Path):
    code = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not code:
        return None
    rel = path.relative_to(REPO_ROOT)
    question = f"Explain this Prism program: {rel.name}"
    answer = f"Source: {rel}\n```prism\n{code}\n```"
    return {
        "question": question,
        "answer": answer,
        "domain": "prism",
        "confidence": {
            "overall": 0.92,
            "epistemic": 0.05,
            "aleatoric": 0.04,
            "distribution_shift": 0.02,
        },
    }


def write_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")


def main():
    files = find_prism_files()
    rows = [r for r in (to_row(p) for p in files) if r is not None]

    if not rows:
        print("No Prism files found.")
        return

    split_idx = max(1, int(len(rows) * 0.8))
    train_rows = rows[:split_idx]
    val_rows = rows[split_idx:]

    write_jsonl(OUT_ROOT / "train.jsonl", train_rows)
    write_jsonl(OUT_ROOT / "val.jsonl", val_rows)

    print(f"Prism rows: total={len(rows)} train={len(train_rows)} val={len(val_rows)}")
    print(f"Wrote to: {OUT_ROOT}")


if __name__ == "__main__":
    main()
