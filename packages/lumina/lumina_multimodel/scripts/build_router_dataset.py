#!/usr/bin/env python3
"""
Build router train/val JSONL from domain specialist datasets.

Expected input layout under --data-root:
  - general_specialist/train.jsonl, val.jsonl
  - math_specialist/train.jsonl, val.jsonl
  - code_specialist/train.jsonl, val.jsonl

Output:
  --data-root/router/train.jsonl
  --data-root/router/val.jsonl
"""

from __future__ import annotations

import argparse
import json
import random
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
            f.write(json.dumps(row) + "\n")


def make_router_rows(rows: List[Dict], domain: str) -> List[Dict]:
    out: List[Dict] = []
    for r in rows:
        q = (r.get("question") or "").strip()
        if not q:
            continue
        out.append(
            {
                "query": q,
                "domain": domain,
                "routing_confidence": 1.0,
            }
        )
    return out


def balance_rows(rows: List[Dict], max_per_domain: int, seed: int) -> List[Dict]:
    by_domain: Dict[str, List[Dict]] = {}
    for r in rows:
        by_domain.setdefault(r["domain"], []).append(r)

    rng = random.Random(seed)
    balanced: List[Dict] = []
    for domain, drows in by_domain.items():
        rng.shuffle(drows)
        take = drows if max_per_domain <= 0 else drows[:max_per_domain]
        balanced.extend(take)
        print(f"{domain}: kept {len(take)} / {len(drows)}")

    rng.shuffle(balanced)
    return balanced


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-root", type=Path, required=True)
    ap.add_argument("--max-train-per-domain", type=int, default=0)
    ap.add_argument("--max-val-per-domain", type=int, default=0)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    domains = ["general", "math", "code"]
    train_rows: List[Dict] = []
    val_rows: List[Dict] = []

    for d in domains:
        t = load_jsonl(args.data_root / f"{d}_specialist" / "train.jsonl")
        v = load_jsonl(args.data_root / f"{d}_specialist" / "val.jsonl")
        train_rows.extend(make_router_rows(t, d))
        val_rows.extend(make_router_rows(v, d))

    if not train_rows:
        raise SystemExit("No router train rows built from domain specialist files.")

    train_rows = balance_rows(train_rows, args.max_train_per_domain, args.seed)
    val_rows = balance_rows(val_rows, args.max_val_per_domain, args.seed + 1)

    out_dir = args.data_root / "router"
    write_jsonl(out_dir / "train.jsonl", train_rows)
    write_jsonl(out_dir / "val.jsonl", val_rows)

    print(f"Wrote {out_dir / 'train.jsonl'} rows={len(train_rows)}")
    print(f"Wrote {out_dir / 'val.jsonl'} rows={len(val_rows)}")


if __name__ == "__main__":
    main()
