#!/usr/bin/env python3
"""
Build a distilled training dataset by merging teacher JSONL data into a base dataset.

Expected input layout:
  <root>/<domain>_specialist/{train,val}.jsonl

Output layout:
  <out>/<domain>_specialist/{train,val}.jsonl
"""

import argparse
import json
import random
import re
from pathlib import Path


def load_jsonl(path: Path):
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def write_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def keep(domain: str, q: str, a: str) -> bool:
    qn = normalize(q)
    an = normalize(a)
    if not qn or not an:
        return False
    if an == qn:
        return False
    if "question:" in an or "answer:" in an:
        return False
    words = an.split()
    if domain == "math":
        return len(an) <= 220 and 1 <= len(words) <= 28
    if domain == "code":
        return len(an) <= 600 and 2 <= len(words) <= 100
    return len(an) <= 320 and 2 <= len(words) <= 48


def dedupe(rows):
    out = []
    seen = set()
    for r in rows:
        key = (normalize(r.get("question", "")), normalize(r.get("answer", "")))
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def normalize_rows(rows, domain):
    cleaned = []
    for r in rows:
        q = (r.get("question") or "").strip()
        a = (r.get("answer") or "").strip()
        if not keep(domain, q, a):
            continue
        cleaned.append({"question": q, "answer": a, "domain": domain})
    return cleaned


def sample_rows(rows, limit, rng: random.Random):
    if limit <= 0 or len(rows) <= limit:
        return rows
    rows = list(rows)
    rng.shuffle(rows)
    return rows[:limit]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base-root", type=Path, required=True)
    p.add_argument("--teacher-root", type=Path, required=True)
    p.add_argument("--out-root", type=Path, required=True)
    p.add_argument("--domains", nargs="+", default=["general", "math", "code"])
    p.add_argument("--max-teacher-train", type=int, default=0,
                   help="Cap teacher train rows per domain (0 = no cap).")
    p.add_argument("--max-base-train", type=int, default=0,
                   help="Optional cap for base train rows per domain (0 = no cap).")
    p.add_argument("--teacher-weight", type=float, default=1.0,
                   help="Multiplier for teacher train rows by simple resampling (>=1.0).")
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    rng = random.Random(args.seed)
    tw = max(1.0, args.teacher_weight)

    for domain in args.domains:
        base_train = load_jsonl(args.base_root / f"{domain}_specialist" / "train.jsonl")
        base_val = load_jsonl(args.base_root / f"{domain}_specialist" / "val.jsonl")
        teacher_train = load_jsonl(args.teacher_root / f"{domain}_specialist" / "train.jsonl")
        teacher_val = load_jsonl(args.teacher_root / f"{domain}_specialist" / "val.jsonl")

        base_train = normalize_rows(base_train, domain)
        base_val = normalize_rows(base_val, domain)
        teacher_train = normalize_rows(teacher_train, domain)
        teacher_val = normalize_rows(teacher_val, domain)

        if args.max_base_train > 0:
            base_train = sample_rows(base_train, args.max_base_train, rng)
        if args.max_teacher_train > 0:
            teacher_train = sample_rows(teacher_train, args.max_teacher_train, rng)

        # Lightweight upweighting by repetition + tail sampling.
        full_repeats = int(tw)
        rem = tw - full_repeats
        mixed_teacher = []
        for _ in range(full_repeats):
            mixed_teacher.extend(teacher_train)
        if rem > 0 and teacher_train:
            take = int(len(teacher_train) * rem)
            mixed_teacher.extend(sample_rows(teacher_train, take, rng))

        out_train = dedupe(base_train + mixed_teacher)
        out_val = dedupe(base_val + teacher_val)

        write_jsonl(args.out_root / f"{domain}_specialist" / "train.jsonl", out_train)
        write_jsonl(args.out_root / f"{domain}_specialist" / "val.jsonl", out_val)

        print(
            f"{domain}: base_train={len(base_train)} teacher_train={len(teacher_train)} "
            f"out_train={len(out_train)} | base_val={len(base_val)} teacher_val={len(teacher_val)} out_val={len(out_val)}"
        )


if __name__ == "__main__":
    main()
