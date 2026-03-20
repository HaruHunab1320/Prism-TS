#!/usr/bin/env python3
"""
Build a code-focused training slice with more executable/code-native targets.

Input layout:
  <in_root>/code_specialist/{train,val}.jsonl

Output layout:
  <out_root>/code_specialist/{train,val}.jsonl
"""

from __future__ import annotations

import argparse
import json
import random
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
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def strip_code_fences(text: str) -> str:
    s = (text or "").strip()
    s = re.sub(r"^```[a-zA-Z0-9_+-]*\n?", "", s)
    s = re.sub(r"\n?```$", "", s)
    return s.strip()


def looks_like_code(answer: str) -> bool:
    a = strip_code_fences(answer)
    if not a:
        return False
    markers = (
        "def ",
        "class ",
        "return ",
        "import ",
        "from ",
        "public ",
        "private ",
        "function ",
        "const ",
        "let ",
        "var ",
        "console.log",
        "print(",
        "if __name__",
        "SELECT ",
        "INSERT ",
        "UPDATE ",
        "DELETE ",
        "#include",
    )
    if any(marker in a for marker in markers):
        return True
    if "\n" in a and any(tok in a for tok in ("{", "}", ":", ";", "(", ")")):
        return True
    if a.count("{") >= 1 and a.count("}") >= 1:
        return True
    if a.count("(") >= 1 and a.count(")") >= 1 and len(a.split()) <= 160:
        return True
    return False


def keep_codealpaca(row: Dict) -> bool:
    q = normalize_text(str(row.get("question", "")))
    a = str(row.get("answer", ""))
    if not q or not a:
        return False
    if not looks_like_code(a):
        return False
    prose_only_markers = (
        "how do you",
        "what is the difference",
        "explain ",
        "describe ",
        "why ",
        "when would you",
    )
    if any(marker in q for marker in prose_only_markers):
        return False
    return True


def dedupe(rows: List[Dict]) -> List[Dict]:
    out: List[Dict] = []
    seen = set()
    for row in rows:
        q = normalize_text(str(row.get("question", "")))
        a = normalize_text(strip_code_fences(str(row.get("answer", ""))))
        key = (q, a)
        if key in seen:
            continue
        seen.add(key)
        clean = dict(row)
        clean["answer"] = strip_code_fences(str(clean.get("answer", "")))
        out.append(clean)
    return out


def source_counts(rows: List[Dict]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for row in rows:
        src = str(row.get("source", "?"))
        counts[src] = counts.get(src, 0) + 1
    return counts


def build_split(rows: List[Dict], max_codealpaca: int, rng: random.Random) -> List[Dict]:
    kept: List[Dict] = []
    alpaca: List[Dict] = []
    for row in rows:
        src = str(row.get("source", ""))
        if src in {"mbpp", "humaneval"}:
            kept.append(row)
        elif src == "codealpaca" and keep_codealpaca(row):
            alpaca.append(row)
    rng.shuffle(alpaca)
    if max_codealpaca > 0:
        alpaca = alpaca[:max_codealpaca]
    return dedupe(kept + alpaca)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in-root", type=Path, required=True)
    p.add_argument("--out-root", type=Path, required=True)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--max-train-codealpaca", type=int, default=8000)
    p.add_argument("--max-val-codealpaca", type=int, default=400)
    args = p.parse_args()

    rng = random.Random(args.seed)
    train_in = load_jsonl(args.in_root / "code_specialist" / "train.jsonl")
    val_in = load_jsonl(args.in_root / "code_specialist" / "val.jsonl")

    train_out = build_split(train_in, args.max_train_codealpaca, rng)
    val_out = build_split(val_in, args.max_val_codealpaca, rng)

    write_jsonl(args.out_root / "code_specialist" / "train.jsonl", train_out)
    write_jsonl(args.out_root / "code_specialist" / "val.jsonl", val_out)

    print(f"train={len(train_out)} sources={source_counts(train_out)}")
    print(f"val={len(val_out)} sources={source_counts(val_out)}")


if __name__ == "__main__":
    main()
