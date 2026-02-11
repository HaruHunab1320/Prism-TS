#!/usr/bin/env python3
"""
Dataset audit for Lumina (v2).

Checks:
- Train/val exact overlap (question + answer)
- Train/val normalized overlap (template-level)
- Cross-domain overlap (question-only)
- Size vs configured targets
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, Set, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config_v2 import DATASETS_DIR, DATASET_CONFIG, DOMAINS
except ImportError:
    from pathlib import Path
    DATASETS_DIR = Path("../datasets_v2").resolve()
    DATASET_CONFIG = None
    DOMAINS = ["prism", "math", "code", "general", "router"]


def normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"\d+(\.\d+)?", "<num>", text)
    text = re.sub(r"'[^']*'|\"[^\"]*\"", "<str>", text)
    text = re.sub(r"\s+", " ", text)
    return text


def load_jsonl(path: Path):
    with path.open() as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def hash_example(obj: Dict) -> Tuple[str, str]:
    q = obj.get("question") or obj.get("query") or ""
    a = obj.get("answer") or ""
    return q.strip(), a.strip()


def audit_domain(domain_dir: Path):
    train_path = domain_dir / "train.jsonl"
    val_path = domain_dir / "val.jsonl"
    if not train_path.exists() or not val_path.exists():
        return None

    train = list(load_jsonl(train_path))
    val = list(load_jsonl(val_path))

    train_exact = {hash_example(x) for x in train}
    val_exact = {hash_example(x) for x in val}

    train_norm = {(normalize_text(q), normalize_text(a)) for q, a in train_exact}
    val_norm = {(normalize_text(q), normalize_text(a)) for q, a in val_exact}

    exact_overlap = len(train_exact & val_exact)
    norm_overlap = len(train_norm & val_norm)

    diversity = 1.0
    train_count = len(train)
    if train_count > 0:
        diversity = 1.0 - (norm_overlap / max(len(train_norm), 1))

    return {
        "train_count": len(train),
        "val_count": len(val),
        "exact_overlap": exact_overlap,
        "norm_overlap": norm_overlap,
        "diversity": diversity,
    }


def cross_domain_overlap(root: Path) -> Dict[str, Dict[str, int]]:
    questions = {}
    for d in root.iterdir():
        if not d.is_dir():
            continue
        qset = set()
        for split in ["train.jsonl", "val.jsonl"]:
            p = d / split
            if not p.exists():
                continue
            for obj in load_jsonl(p):
                q = obj.get("question") or obj.get("query")
                if q:
                    qset.add(q.strip())
        questions[d.name] = qset

    overlap = {}
    names = sorted(questions.keys())
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            key = f"{a} vs {b}"
            overlap[key] = len(questions[a] & questions[b])
    return overlap


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=None,
                        help="Override dataset root (e.g., datasets_merged)")
    args = parser.parse_args()

    if args.data_root:
        root = args.data_root
    else:
        merged = DATASETS_DIR.parent / "datasets_merged"
        root = merged if merged.exists() else DATASETS_DIR
    print(f"Auditing datasets in: {root}")

    # Per-domain audit
    for domain_dir in sorted(d for d in root.iterdir() if d.is_dir()):
        result = audit_domain(domain_dir)
        if not result:
            continue
        name = domain_dir.name
        train_count = result["train_count"]
        val_count = result["val_count"]
        print(f"\n{name}:")
        print(f"  train={train_count} val={val_count}")
        print(f"  exact_overlap={result['exact_overlap']}")
        print(f"  normalized_overlap={result['norm_overlap']}")
        print(f"  diversity≈{result['diversity']:.3f}")

        if DATASET_CONFIG and name.endswith("_specialist"):
            target_train = DATASET_CONFIG.specialist_train
            target_val = DATASET_CONFIG.specialist_val
            if train_count < target_train or val_count < target_val:
                print(f"  ⚠ size below target ({target_train}/{target_val})")

    # Cross-domain overlaps
    print("\nCross-domain overlaps (question-only):")
    overlap = cross_domain_overlap(root)
    for k, v in sorted(overlap.items(), key=lambda x: x[1], reverse=True):
        if v > 0:
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
