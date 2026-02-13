#!/usr/bin/env python3
"""
Ingest high-quality datasets for H100 pilot runs.
Outputs JSONL in datasets_hq/{domain}_specialist/{train,val}.jsonl

Domains:
  - general: TriviaQA (optionally SQuAD v2)
  - math: GSM8K (+ optional NuminaMath subset)
  - code: MBPP + HumanEval (+ optional CodeAlpaca subset)
"""

import argparse
import json
import re
import random
from pathlib import Path

from datasets import load_dataset


def write_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def keep_answer(ans: str, min_words: int, max_words: int, max_chars: int) -> bool:
    if not ans:
        return False
    if len(ans) > max_chars:
        return False
    words = ans.split()
    if len(words) < min_words or len(words) > max_words:
        return False
    return True


def triviaqa_rows(split, limit, min_words, max_words, max_chars):
    rows = []
    for i, ex in enumerate(split):
        if limit and i >= limit:
            break
        q = normalize(ex.get("question") or "")
        answer = ex.get("answer") or {}
        a = ""
        if isinstance(answer, dict):
            a = answer.get("value") or answer.get("normalized_value") or ""
        elif isinstance(answer, str):
            a = answer
        a = normalize(a)
        if not q or not keep_answer(a, min_words, max_words, max_chars):
            continue
        rows.append({"question": q, "answer": a, "domain": "general"})
    return rows


def squad_rows(split, min_words, max_words, max_chars):
    rows = []
    for ex in split:
        if not ex.get("answers") or not ex["answers"]["text"]:
            continue
        q = normalize(ex["question"])
        a = normalize(ex["answers"]["text"][0])
        if not keep_answer(a, min_words, max_words, max_chars):
            continue
        rows.append({"question": q, "answer": a, "domain": "general"})
    return rows


def gsm8k_rows(split, min_words, max_words, max_chars):
    rows = []
    for ex in split:
        q = normalize(ex.get("question") or "")
        a = ex.get("answer") or ""
        if "####" in a:
            a = a.split("####", 1)[-1]
        a = normalize(a)
        if not q or not keep_answer(a, min_words, max_words, max_chars):
            continue
        rows.append({"question": q, "answer": a, "domain": "math"})
    return rows


def numinamath_rows(split, limit, min_words, max_words, max_chars):
    rows = []
    for i, ex in enumerate(split):
        if limit and i >= limit:
            break
        q = normalize(ex.get("problem") or ex.get("question") or "")
        a = normalize(ex.get("solution") or ex.get("answer") or "")
        if not q or not keep_answer(a, min_words, max_words, max_chars):
            continue
        rows.append({"question": q, "answer": a, "domain": "math"})
    return rows


def mbpp_rows(split, min_words, max_words, max_chars):
    rows = []
    for ex in split:
        q = normalize(ex.get("text") or ex.get("prompt") or "")
        a = normalize(ex.get("code") or "")
        if not q or not keep_answer(a, min_words, max_words, max_chars):
            continue
        rows.append({"question": q, "answer": a, "domain": "code"})
    return rows


def humaneval_rows(split, min_words, max_words, max_chars):
    rows = []
    for ex in split:
        q = normalize(ex.get("prompt") or "")
        a = normalize(ex.get("canonical_solution") or "")
        if not q or not keep_answer(a, min_words, max_words, max_chars):
            continue
        rows.append({"question": q, "answer": a, "domain": "code"})
    return rows


def codealpaca_rows(split, limit, min_words, max_words, max_chars):
    rows = []
    for i, ex in enumerate(split):
        if limit and i >= limit:
            break
        q = normalize(ex.get("instruction") or ex.get("prompt") or "")
        a = normalize(ex.get("output") or "")
        if not q or not keep_answer(a, min_words, max_words, max_chars):
            continue
        rows.append({"question": q, "answer": a, "domain": "code"})
    return rows


def try_load(names, *args, **kwargs):
    last = None
    for name in names:
        try:
            return load_dataset(name, *args, **kwargs)
        except Exception as exc:
            last = exc
    raise last


def limit_rows(rows, limit, rng: random.Random):
    if not limit or limit <= 0 or len(rows) <= limit:
        return rows
    rows = list(rows)
    rng.shuffle(rows)
    return rows[:limit]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="datasets_hq")
    p.add_argument("--triviaqa-limit", type=int, default=300000)
    p.add_argument("--numinamath-limit", type=int, default=100000)
    p.add_argument("--codealpaca-limit", type=int, default=100000)
    p.add_argument("--min-words", type=int, default=2)
    p.add_argument("--min-words-math", type=int, default=1)
    p.add_argument("--max-words", type=int, default=40)
    p.add_argument("--max-chars", type=int, default=300)
    p.add_argument("--with-squad", action="store_true")
    p.add_argument("--with-numinamath", action="store_true")
    p.add_argument("--with-codealpaca", action="store_true")
    p.add_argument("--max-train-per-domain", type=int, default=0,
                   help="If >0, cap train rows per domain after ingestion.")
    p.add_argument("--max-val-per-domain", type=int, default=0,
                   help="If >0, cap val rows per domain after ingestion.")
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    out_root = Path(__file__).parent.parent / args.out
    rng = random.Random(args.seed)

    # General: TriviaQA
    trivia = try_load(["trivia_qa", "mandarjoshi/trivia_qa"], "rc")
    train_rows = triviaqa_rows(trivia["train"], args.triviaqa_limit, args.min_words, args.max_words, args.max_chars)
    val_rows = triviaqa_rows(trivia["validation"], 0, args.min_words, args.max_words, args.max_chars)
    if args.with_squad:
        squad = try_load(["rajpurkar/squad_v2", "GEM/squad_v2"])
        train_rows += squad_rows(squad["train"], args.min_words, args.max_words, args.max_chars)
        val_rows += squad_rows(squad["validation"], args.min_words, args.max_words, args.max_chars)
    train_rows = limit_rows(train_rows, args.max_train_per_domain, rng)
    val_rows = limit_rows(val_rows, args.max_val_per_domain, rng)
    write_jsonl(out_root / "general_specialist" / "train.jsonl", train_rows)
    write_jsonl(out_root / "general_specialist" / "val.jsonl", val_rows)

    # Math: GSM8K (+ optional NuminaMath subset)
    gsm8k = try_load(["openai/gsm8k", "epfl-dlab/gsm8k"])
    math_min_words = args.min_words_math
    math_train = gsm8k_rows(gsm8k["train"], math_min_words, args.max_words, args.max_chars)
    math_val = gsm8k_rows(gsm8k["test"], math_min_words, args.max_words, args.max_chars)
    if args.with_numinamath:
        try:
            numina = try_load([
                "AI-MO/NuminaMath-CoT",
                "yentinglin/NuminaMath-1.5-Verifiable",
                "weijiezz/NuminaMath-full",
                "weijiezz/NuminaMath-100k",
                "numina/NuminaMath",
                "NuminaMath",
                "numina/numinamath",
            ])
            if "train" in numina:
                numina_split = numina["train"]
            else:
                # Fallback: use the first available split.
                first_key = list(numina.keys())[0]
                numina_split = numina[first_key]
            math_train += numinamath_rows(numina_split, args.numinamath_limit,
                                          math_min_words, args.max_words, args.max_chars)
        except Exception as exc:
            print(f"NuminaMath unavailable; skipping. ({exc})")
    math_train = limit_rows(math_train, args.max_train_per_domain, rng)
    math_val = limit_rows(math_val, args.max_val_per_domain, rng)
    write_jsonl(out_root / "math_specialist" / "train.jsonl", math_train)
    write_jsonl(out_root / "math_specialist" / "val.jsonl", math_val)

    # Code: MBPP + HumanEval (+ optional CodeAlpaca subset)
    mbpp = try_load(["Muennighoff/mbpp", "mbpp"])
    if "train" in mbpp:
        code_train = mbpp_rows(mbpp["train"], args.min_words, args.max_words, args.max_chars)
        code_val = mbpp_rows(mbpp["test"], args.min_words, args.max_words, args.max_chars)
    else:
        test_rows = mbpp_rows(mbpp["test"], args.min_words, args.max_words, args.max_chars)
        split_idx = int(len(test_rows) * 0.8)
        code_train = test_rows[:split_idx]
        code_val = test_rows[split_idx:]

    humaneval = try_load(["openai_humaneval", "openai/openai_humaneval"])
    if "train" in humaneval:
        code_train += humaneval_rows(humaneval["train"], args.min_words, args.max_words, args.max_chars)
        code_val += humaneval_rows(humaneval["test"], args.min_words, args.max_words, args.max_chars)
    else:
        he_rows = humaneval_rows(humaneval["test"], args.min_words, args.max_words, args.max_chars)
        split_idx = int(len(he_rows) * 0.8)
        code_train += he_rows[:split_idx]
        code_val += he_rows[split_idx:]

    if args.with_codealpaca:
        alpaca = try_load(["sahil2801/CodeAlpaca-20k", "codealpaca"])
        code_train += codealpaca_rows(alpaca["train"], args.codealpaca_limit,
                                      args.min_words, args.max_words, args.max_chars)

    code_train = limit_rows(code_train, args.max_train_per_domain, rng)
    code_val = limit_rows(code_val, args.max_val_per_domain, rng)
    write_jsonl(out_root / "code_specialist" / "train.jsonl", code_train)
    write_jsonl(out_root / "code_specialist" / "val.jsonl", code_val)

    print(f"general train={len(train_rows)} val={len(val_rows)}")
    print(f"math train={len(math_train)} val={len(math_val)}")
    print(f"code train={len(code_train)} val={len(code_val)}")


if __name__ == "__main__":
    main()
