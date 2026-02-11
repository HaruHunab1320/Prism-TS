#!/usr/bin/env python3
"""
Inject hard OOD examples into general (using other domains' questions).
"""

import argparse
import json
import random
from pathlib import Path


def load_questions(path: Path):
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(l).get("question") for l in f if l.strip()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    parser.add_argument("--n", type=int, default=1000)
    parser.add_argument("--split", type=str, default="train", choices=["train", "val"])
    args = parser.parse_args()

    # Pull from math/code/prism as OOD for general
    sources = ["math_specialist", "code_specialist", "prism_specialist"]
    questions = []
    for src in sources:
        qpath = args.data_root / src / f"{args.split}.jsonl"
        questions.extend([q for q in load_questions(qpath) if q])

    random.shuffle(questions)
    selected = questions[: args.n]

    out_path = Path(__file__).parent.parent / "datasets_real" / "general" / f"{args.split}.jsonl"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for q in selected:
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

    with out_path.open("a") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")

    print(f"Appended {len(rows)} hard OOD rows to {out_path}")


if __name__ == "__main__":
    main()
