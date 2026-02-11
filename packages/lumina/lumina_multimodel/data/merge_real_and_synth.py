#!/usr/bin/env python3
"""
Merge synthetic (datasets_v2) and real (datasets_real) into a unified dataset.

Usage:
  python merge_real_and_synth.py --out datasets_merged
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config_v2 import DATASETS_DIR as SYNTH_DIR

REAL_DIR = Path(__file__).parent.parent / "datasets_real"


def read_jsonl(path: Path):
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(l) for l in f if l.strip()]


def write_jsonl(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for item in data:
            f.write(json.dumps(item) + "\n")


def merge_split(synth_domain: str, real_domain: str, split: str, out_root: Path):
    synth = read_jsonl(SYNTH_DIR / synth_domain / f"{split}.jsonl")
    real = read_jsonl(REAL_DIR / real_domain / f"{split}.jsonl")
    merged = real + synth
    write_jsonl(out_root / synth_domain / f"{split}.jsonl", merged)
    return len(real), len(synth), len(merged)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="datasets_merged", help="Output directory name")
    args = parser.parse_args()

    out_root = Path(__file__).parent.parent / args.out

    domain_map = {
        "prism_specialist": "prism",
        "math_specialist": "math",
        "code_specialist": "code",
        "general_specialist": "general",
        "router": "router",
    }
    for synth_domain, real_domain in domain_map.items():
        print(f"\n{synth_domain}:")
        for split in ["train", "val"]:
            real, synth, merged = merge_split(synth_domain, real_domain, split, out_root)
            print(f"  {split}: real={real} synth={synth} merged={merged}")


if __name__ == "__main__":
    main()
