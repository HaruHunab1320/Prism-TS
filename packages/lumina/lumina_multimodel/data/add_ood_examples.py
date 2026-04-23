#!/usr/bin/env python3
"""
Append OOD examples to datasets_real/general/val.jsonl for calibration checks.
"""

import argparse
import json
import random
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from config_v2 import OOD_EXAMPLES


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=100, help="Number of OOD examples to append")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--split", type=str, default="val", choices=["train", "val"])
    parser.add_argument("--allow-duplicates", action="store_true",
                        help="Allow duplicate OOD questions to reach target count")
    args = parser.parse_args()

    random.seed(args.seed)

    out_path = Path(__file__).parent.parent / "datasets_real" / "general" / f"{args.split}.jsonl"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Load existing to avoid dupes
    existing_questions = set()
    if out_path.exists():
        with out_path.open() as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    q = obj.get("question")
                    if q:
                        existing_questions.add(q)
                except Exception:
                    pass

    rows = []
    attempts = 0
    while len(rows) < args.n and attempts < args.n * 5:
        attempts += 1
        q = random.choice(OOD_EXAMPLES)
        if not args.allow_duplicates and q in existing_questions:
            continue
        rows.append({
            "question": q,
            "answer": "I'm not confident I can answer this question accurately.",
            "domain": "general",
            "category": "ood",
            "confidence": {
                "overall": 0.2,
                "epistemic": 0.7,
                "aleatoric": 0.2,
                "distribution_shift": 0.8,
            }
        })

    if not rows:
        print("No new OOD rows added.")
        return

    with out_path.open("a") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")

    print(f"Appended {len(rows)} OOD rows to {out_path}")


if __name__ == "__main__":
    main()
