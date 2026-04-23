#!/usr/bin/env python3
"""
Filter merged datasets into a higher-quality subset for generator training.
Creates datasets_filtered/<domain>_specialist/{train,val}.jsonl
"""

import argparse
import json
import re
from pathlib import Path


def load_jsonl(path: Path):
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def write_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def good_sample(q: str, a: str, min_words: int, max_words: int, max_chars: int) -> bool:
    if not q or not a:
        return False
    qn = normalize(q)
    an = normalize(a)
    if not an:
        return False
    if an == qn:
        return False
    if "question:" in an or "answer:" in an:
        return False
    if len(an) > max_chars:
        return False
    words = an.split()
    if len(words) < min_words or len(words) > max_words:
        return False
    return True


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input-root", type=Path, default=Path("datasets_merged"))
    p.add_argument("--output-root", type=Path, default=Path("datasets_filtered"))
    p.add_argument("--domains", nargs="+", default=["general", "math", "code"])
    p.add_argument("--min-words", type=int, default=2)
    p.add_argument("--max-words", type=int, default=40)
    p.add_argument("--max-chars", type=int, default=300)
    p.add_argument("--max-train", type=int, default=30000)
    p.add_argument("--max-val", type=int, default=5000)
    args = p.parse_args()

    for domain in args.domains:
        in_dir = args.input_root / f"{domain}_specialist"
        train_rows = load_jsonl(in_dir / "train.jsonl")
        val_rows = load_jsonl(in_dir / "val.jsonl")

        train_f = [r for r in train_rows if good_sample(r.get("question", ""), r.get("answer", ""),
                                                      args.min_words, args.max_words, args.max_chars)]
        val_f = [r for r in val_rows if good_sample(r.get("question", ""), r.get("answer", ""),
                                                    args.min_words, args.max_words, args.max_chars)]

        train_f = train_f[: args.max_train]
        val_f = val_f[: args.max_val]

        out_dir = args.output_root / f"{domain}_specialist"
        write_jsonl(out_dir / "train.jsonl", train_f)
        write_jsonl(out_dir / "val.jsonl", val_f)

        print(f"{domain}: train {len(train_f)}/{len(train_rows)} val {len(val_f)}/{len(val_rows)}")


if __name__ == "__main__":
    main()
