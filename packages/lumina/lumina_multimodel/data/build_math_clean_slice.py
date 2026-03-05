#!/usr/bin/env python3
"""
Build a math-only clean dataset slice with canonical numeric answers.

Input layout:
  <in_root>/math_specialist/{train,val}.jsonl

Output layout:
  <out_root>/math_specialist/{train,val}.jsonl
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List


def load_jsonl(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def write_jsonl(path: Path, rows: List[Dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def canonical_numeric_answer(answer: str) -> str | None:
    s = (answer or "").strip()
    if not s:
        return None
    # Prefer explicit final-answer style.
    m = re.search(r"(?:final answer|answer)\s*[:=]\s*([^\n]+)", s, flags=re.IGNORECASE)
    if m:
        s = m.group(1).strip()
    nums = re.findall(r"[-+]?\d+(?:\.\d+)?", s)
    if not nums:
        return None
    n = nums[-1]
    if len(n) > 8:
        return None
    return n


def clean_rows(rows: List[Dict]) -> List[Dict]:
    out: List[Dict] = []
    seen = set()
    for r in rows:
        q = str(r.get("question", "")).strip()
        a = str(r.get("answer", "")).strip()
        if not q or not a:
            continue
        canon = canonical_numeric_answer(a)
        if canon is None:
            continue
        key = (normalize_text(q), canon)
        if key in seen:
            continue
        seen.add(key)
        out.append({"question": q, "answer": canon, "domain": "math"})
    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in-root", type=Path, required=True)
    p.add_argument("--out-root", type=Path, required=True)
    p.add_argument("--max-train", type=int, default=0)
    p.add_argument("--max-val", type=int, default=0)
    args = p.parse_args()

    train = clean_rows(load_jsonl(args.in_root / "math_specialist" / "train.jsonl"))
    val = clean_rows(load_jsonl(args.in_root / "math_specialist" / "val.jsonl"))

    if args.max_train > 0:
        train = train[: args.max_train]
    if args.max_val > 0:
        val = val[: args.max_val]

    write_jsonl(args.out_root / "math_specialist" / "train.jsonl", train)
    write_jsonl(args.out_root / "math_specialist" / "val.jsonl", val)
    print(f"math_clean train={len(train)} val={len(val)} -> {args.out_root}")


if __name__ == "__main__":
    main()
