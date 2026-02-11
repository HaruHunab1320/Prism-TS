#!/usr/bin/env python3
"""
Ingest real datasets into datasets_real/ in Lumina JSONL format.

This script downloads small/medium datasets and writes train/val JSONL.
It intentionally avoids very large datasets unless explicitly enabled.

Usage:
  python ingest_real_datasets.py --out datasets_real --nq-limit 20000
"""

import argparse
import json
from pathlib import Path

from datasets import load_dataset


def write_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def squad_to_rows(split):
    rows = []
    for ex in split:
        if not ex.get("answers") or not ex["answers"]["text"]:
            continue
        question = ex["question"].strip()
        answer = ex["answers"]["text"][0].strip()
        rows.append({
            "question": question,
            "answer": answer,
            "domain": "general",
            "confidence": {"overall": 0.9, "epistemic": 0.05, "aleatoric": 0.05, "distribution_shift": 0.02},
        })
    return rows


def mbpp_to_rows(split):
    rows = []
    for ex in split:
        question = ex.get("text") or ex.get("prompt") or ""
        answer = ex.get("code") or ""
        if not question or not answer:
            continue
        rows.append({
            "question": question.strip(),
            "answer": answer.strip(),
            "domain": "code",
            "confidence": {"overall": 0.9, "epistemic": 0.05, "aleatoric": 0.05, "distribution_shift": 0.02},
        })
    return rows


def gsm8k_to_rows(split):
    rows = []
    for ex in split:
        question = ex.get("question") or ""
        answer = ex.get("answer") or ""
        if not question or not answer:
            continue
        # GSM8K answers often include "####" final answer
        if "####" in answer:
            answer = answer.split("####", 1)[-1].strip()
        rows.append({
            "question": question.strip(),
            "answer": answer.strip(),
            "domain": "math",
            "confidence": {"overall": 0.9, "epistemic": 0.05, "aleatoric": 0.05, "distribution_shift": 0.02},
        })
    return rows


def metamath_to_rows(split, limit):
    rows = []
    for i, ex in enumerate(split):
        if limit and i >= limit:
            break
        question = ex.get("query") or ex.get("problem") or ""
        answer = ex.get("response") or ex.get("solution") or ""
        if not question or not answer:
            continue
        rows.append({
            "question": question.strip(),
            "answer": answer.strip(),
            "domain": "math",
            "confidence": {"overall": 0.9, "epistemic": 0.05, "aleatoric": 0.05, "distribution_shift": 0.02},
        })
    return rows


def nq_to_rows(split, limit):
    rows = []
    for i, ex in enumerate(split):
        if limit and i >= limit:
            break
        question = ex.get("question") or ""
        # Use short answer when available
        answer = ex.get("short_answer") or ex.get("answer") or ""
        if not question or not answer:
            continue
        rows.append({
            "question": question.strip(),
            "answer": answer.strip(),
            "domain": "general",
            "confidence": {"overall": 0.9, "epistemic": 0.05, "aleatoric": 0.05, "distribution_shift": 0.02},
        })
    return rows


def triviaqa_to_rows(split, limit):
    rows = []
    for i, ex in enumerate(split):
        if limit and i >= limit:
            break
        question = ex.get("question") or ""
        answer = ex.get("answer") or {}
        value = ""
        if isinstance(answer, dict):
            value = answer.get("value") or answer.get("normalized_value") or ""
        elif isinstance(answer, str):
            value = answer
        if not question or not value:
            continue
        rows.append({
            "question": question.strip(),
            "answer": value.strip(),
            "domain": "general",
            "confidence": {"overall": 0.9, "epistemic": 0.05, "aleatoric": 0.05, "distribution_shift": 0.02},
        })
    return rows


def try_load_dataset(names, **kwargs):
    last_error = None
    for name in names:
        try:
            return load_dataset(name, **kwargs)
        except Exception as exc:
            last_error = exc
    raise last_error


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="datasets_real")
    parser.add_argument("--nq-limit", type=int, default=20000)
    parser.add_argument("--metamath-limit", type=int, default=50000)
    parser.add_argument("--triviaqa-limit", type=int, default=50000)
    args = parser.parse_args()

    out_root = Path(__file__).parent.parent / args.out

    # SQuAD v2 -> general
    squad = try_load_dataset(["rajpurkar/squad_v2", "GEM/squad_v2"])
    write_jsonl(out_root / "general" / "train.jsonl", squad_to_rows(squad["train"]))
    write_jsonl(out_root / "general" / "val.jsonl", squad_to_rows(squad["validation"]))

    # MBPP -> code (some distributions only provide test split)
    mbpp = try_load_dataset(["Muennighoff/mbpp"])
    if "train" in mbpp:
        write_jsonl(out_root / "code" / "train.jsonl", mbpp_to_rows(mbpp["train"]))
        write_jsonl(out_root / "code" / "val.jsonl", mbpp_to_rows(mbpp["test"]))
    else:
        test_rows = mbpp_to_rows(mbpp["test"])
        split_idx = int(len(test_rows) * 0.8)
        write_jsonl(out_root / "code" / "train.jsonl", test_rows[:split_idx])
        write_jsonl(out_root / "code" / "val.jsonl", test_rows[split_idx:])

    # GSM8K -> math (small, reliable download)
    gsm8k = try_load_dataset(["openai/gsm8k", "epfl-dlab/gsm8k"])
    write_jsonl(out_root / "math" / "train.jsonl", gsm8k_to_rows(gsm8k["train"]))
    write_jsonl(out_root / "math" / "val.jsonl", gsm8k_to_rows(gsm8k["test"]))

    # MetaMathQA -> math (large; cap for local)
    try:
        metamath = load_dataset("meta-math/MetaMathQA")
        meta_rows = metamath_to_rows(metamath["train"], args.metamath_limit)
        # Append to train set
        with (out_root / "math" / "train.jsonl").open("a") as f:
            for row in meta_rows:
                f.write(json.dumps(row) + "\n")
    except Exception:
        pass

    # Natural Questions (lightweight subset)
    try:
        nq = try_load_dataset([
            "natural_questions",
            "google/natural_questions",
            "irds/natural-questions",
        ])
        write_jsonl(out_root / "general" / "nq_train.jsonl", nq_to_rows(nq["train"], args.nq_limit))
    except Exception:
        # Some NQ variants are huge; skip if not available
        pass

    # TriviaQA (rc.nocontext)
    try:
        trivia = load_dataset("mandarjoshi/trivia_qa", "rc.nocontext")
        trivia_train = triviaqa_to_rows(trivia["train"], args.triviaqa_limit)
        trivia_val = triviaqa_to_rows(trivia["validation"], max(1, args.triviaqa_limit // 5))
        # Append to general set
        with (out_root / "general" / "train.jsonl").open("a") as f:
            for row in trivia_train:
                f.write(json.dumps(row) + "\n")
        with (out_root / "general" / "val.jsonl").open("a") as f:
            for row in trivia_val:
                f.write(json.dumps(row) + "\n")
    except Exception:
        pass

    print(f"Real datasets written to {out_root}")


if __name__ == "__main__":
    main()
