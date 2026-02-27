#!/usr/bin/env python3
"""
Build a stronger curated dataset pack for specialist generator training.

Outputs:
  <out>/<domain>_specialist/{train,val}.jsonl

Design goals:
- pull from stronger public datasets
- normalize + dedupe aggressively
- create larger validation splits where source val is tiny
- keep answers short enough for small-model generation training
"""

import argparse
import json
import random
import re
from pathlib import Path

from datasets import load_dataset


def write_jsonl(path: Path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def normkey(text: str) -> str:
    return normalize(text).lower()


def keep_answer(ans: str, min_words: int, max_words: int, max_chars: int) -> bool:
    if not ans:
        return False
    if len(ans) > max_chars:
        return False
    words = ans.split()
    if len(words) < min_words or len(words) > max_words:
        return False
    bad = normkey(ans)
    if "question:" in bad or "answer:" in bad:
        return False
    return True


def keep_question(q: str, min_words: int = 3, max_chars: int = 320) -> bool:
    if not q:
        return False
    if len(q) > max_chars:
        return False
    if len(q.split()) < min_words:
        return False
    bad = normkey(q)
    if bad.count("?") > 1:
        return False
    if "the answer is" in bad:
        return False
    return True


def looks_time_sensitive(q: str) -> bool:
    bad = normkey(q)
    markers = (
        "currently",
        "current ",
        "who is the president",
        "who is the prime minister",
        "today",
        "as of ",
        "at present",
    )
    return any(marker in bad for marker in markers)


def looks_corrupt_math(q: str, a: str) -> bool:
    qn = normalize(q)
    an = normalize(a)
    bad_q = normkey(qn)
    bad_a = normkey(an)
    if "the answer to 8 and 9 is 2521" in bad_q:
        return True
    if bad_a.startswith("ariable "):
        return True
    if "unknown\n" in qn.lower():
        return True
    if qn.count("X") > 0 and "unknown" in bad_q:
        return True
    if len(an) < 2:
        return True
    return False


def clean_metamath_answer(ans: str) -> str:
    a = normalize(ans)
    if not a:
        return ""
    markers = [
        "the answer is:",
        "final answer:",
        "answer:",
        "####",
        "\\boxed{",
    ]
    lower = a.lower()
    for marker in markers:
        idx = lower.rfind(marker.lower())
        if idx != -1:
            if marker == "\\boxed{":
                tail = a[idx + len(marker):]
                end = tail.find("}")
                return normalize(tail[:end] if end != -1 else tail)
            return normalize(a[idx + len(marker):])
    return a


def dedupe_rows(rows):
    out = []
    seen = set()
    for r in rows:
        key = (normkey(r["question"]), normkey(r["answer"]))
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def split_rows(rows, max_val, rng):
    rows = list(rows)
    rng.shuffle(rows)
    val_n = min(max_val, max(1, int(len(rows) * 0.05)))
    if len(rows) < val_n + 10:
        val_n = max(1, min(max_val, len(rows) // 10))
    return rows[val_n:], rows[:val_n]


def limit_rows(rows, limit, rng):
    if limit <= 0 or len(rows) <= limit:
        return rows
    rows = list(rows)
    rng.shuffle(rows)
    return rows[:limit]


def try_load(candidates, *args, **kwargs):
    last = None
    for name in candidates:
        try:
            return load_dataset(name, *args, **kwargs)
        except Exception as exc:
            last = exc
    raise last


def general_rows(args):
    rows = []

    squad = try_load(["rajpurkar/squad_v2", "GEM/squad_v2"])
    for split_name in ("train", "validation"):
        for ex in squad[split_name]:
            answers = (ex.get("answers") or {}).get("text") or []
            if not answers:
                continue
            q = normalize(ex.get("question") or "")
            a = normalize(answers[0])
            if keep_question(q) and keep_answer(a, 2, 40, 280):
                rows.append(
                    {"question": q, "answer": a, "domain": "general", "source": "squad_v2"}
                )

    trivia = try_load(["trivia_qa", "mandarjoshi/trivia_qa"], "rc")
    for split_name in ("train", "validation"):
        for i, ex in enumerate(trivia[split_name]):
            if args.trivia_limit and i >= args.trivia_limit:
                break
            q = normalize(ex.get("question") or "")
            ans = ex.get("answer") or {}
            a = ""
            if isinstance(ans, dict):
                a = normalize(ans.get("value") or ans.get("normalized_value") or "")
            elif isinstance(ans, str):
                a = normalize(ans)
            if keep_question(q) and not looks_time_sensitive(q) and keep_answer(a, 1, 20, 140):
                rows.append(
                    {"question": q, "answer": a, "domain": "general", "source": "trivia_qa"}
                )

    # Optional NQ variants. Skip cleanly if unavailable.
    try:
        nq = try_load([
            "natural_questions",
            "google/natural_questions",
            "google-research-datasets/natural_questions_open",
        ])
        split_name = "train" if "train" in nq else list(nq.keys())[0]
        for i, ex in enumerate(nq[split_name]):
            if args.nq_limit and i >= args.nq_limit:
                break
            q = normalize(ex.get("question") or "")
            a = normalize(ex.get("short_answer") or ex.get("answer") or "")
            if keep_question(q) and not looks_time_sensitive(q) and keep_answer(a, 1, 18, 140):
                rows.append(
                    {
                        "question": q,
                        "answer": a,
                        "domain": "general",
                        "source": "natural_questions",
                    }
                )
    except Exception:
        pass

    return dedupe_rows(rows)


def math_rows(args):
    rows = []

    gsm8k = try_load(["openai/gsm8k", "epfl-dlab/gsm8k"])
    for split_name in ("train", "test"):
        for ex in gsm8k[split_name]:
            q = normalize(ex.get("question") or "")
            a = normalize(ex.get("answer") or "")
            if "####" in a:
                a = normalize(a.split("####", 1)[-1])
            if keep_question(q) and keep_answer(a, 1, 12, 120):
                rows.append({"question": q, "answer": a, "domain": "math", "source": "gsm8k"})

    if args.with_metamath:
        try:
            metamath = try_load(["meta-math/MetaMathQA"])
            split_name = "train" if "train" in metamath else list(metamath.keys())[0]
            for i, ex in enumerate(metamath[split_name]):
                if args.metamath_limit and i >= args.metamath_limit:
                    break
                q = normalize(ex.get("query") or ex.get("problem") or "")
                a = clean_metamath_answer(ex.get("response") or ex.get("solution") or "")
                if (
                    keep_question(q)
                    and keep_answer(a, 1, 10, 80)
                    and not looks_corrupt_math(q, a)
                    and not any(tok in normkey(a) for tok in ("therefore", "let us", "we have", "first,"))
                ):
                    rows.append(
                        {"question": q, "answer": a, "domain": "math", "source": "metamathqa"}
                    )
        except Exception:
            pass

    return dedupe_rows(rows)


def code_rows(args):
    rows = []

    mbpp = try_load(["Muennighoff/mbpp", "mbpp"])
    for split_name in mbpp.keys():
        for ex in mbpp[split_name]:
            q = normalize(ex.get("text") or ex.get("prompt") or "")
            a = normalize(ex.get("code") or "")
            if keep_question(q, min_words=4, max_chars=700) and keep_answer(a, 2, 90, 700):
                rows.append({"question": q, "answer": a, "domain": "code", "source": "mbpp"})

    humaneval = try_load(["openai_humaneval", "openai/openai_humaneval"])
    split_name = "test" if "test" in humaneval else list(humaneval.keys())[0]
    for ex in humaneval[split_name]:
        q = normalize(ex.get("prompt") or "")
        a = normalize(ex.get("canonical_solution") or "")
        if keep_question(q, min_words=4, max_chars=900) and keep_answer(a, 2, 100, 800):
            rows.append(
                {"question": q, "answer": a, "domain": "code", "source": "humaneval"}
            )

    if args.with_codealpaca:
        try:
            alpaca = try_load(["sahil2801/CodeAlpaca-20k", "codealpaca"])
            split_name = "train" if "train" in alpaca else list(alpaca.keys())[0]
            for i, ex in enumerate(alpaca[split_name]):
                if args.codealpaca_limit and i >= args.codealpaca_limit:
                    break
                q = normalize(ex.get("instruction") or ex.get("prompt") or "")
                a = normalize(ex.get("output") or "")
                if keep_question(q, min_words=4, max_chars=700) and keep_answer(a, 2, 100, 800):
                    rows.append(
                        {
                            "question": q,
                            "answer": a,
                            "domain": "code",
                            "source": "codealpaca",
                        }
                    )
        except Exception:
            pass

    return dedupe_rows(rows)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="datasets_hq_v2")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--trivia-limit", type=int, default=150000)
    p.add_argument("--nq-limit", type=int, default=50000)
    p.add_argument("--metamath-limit", type=int, default=80000)
    p.add_argument("--with-metamath", action="store_true")
    p.add_argument("--with-codealpaca", action="store_true")
    p.add_argument("--codealpaca-limit", type=int, default=20000)
    p.add_argument("--max-train-general", type=int, default=120000)
    p.add_argument("--max-val-general", type=int, default=5000)
    p.add_argument("--max-train-math", type=int, default=60000)
    p.add_argument("--max-val-math", type=int, default=5000)
    p.add_argument("--max-train-code", type=int, default=30000)
    p.add_argument("--max-val-code", type=int, default=2000)
    args = p.parse_args()

    out_root = Path(__file__).parent.parent / args.out
    rng = random.Random(args.seed)

    general_all = general_rows(args)
    general_train, general_val = split_rows(general_all, args.max_val_general, rng)
    general_train = limit_rows(general_train, args.max_train_general, rng)
    general_val = limit_rows(general_val, args.max_val_general, rng)

    math_all = math_rows(args)
    math_train, math_val = split_rows(math_all, args.max_val_math, rng)
    math_train = limit_rows(math_train, args.max_train_math, rng)
    math_val = limit_rows(math_val, args.max_val_math, rng)

    code_all = code_rows(args)
    code_train, code_val = split_rows(code_all, args.max_val_code, rng)
    code_train = limit_rows(code_train, args.max_train_code, rng)
    code_val = limit_rows(code_val, args.max_val_code, rng)

    write_jsonl(out_root / "general_specialist" / "train.jsonl", general_train)
    write_jsonl(out_root / "general_specialist" / "val.jsonl", general_val)
    write_jsonl(out_root / "math_specialist" / "train.jsonl", math_train)
    write_jsonl(out_root / "math_specialist" / "val.jsonl", math_val)
    write_jsonl(out_root / "code_specialist" / "train.jsonl", code_train)
    write_jsonl(out_root / "code_specialist" / "val.jsonl", code_val)

    print(f"general train={len(general_train)} val={len(general_val)}")
    print(f"math train={len(math_train)} val={len(math_val)}")
    print(f"code train={len(code_train)} val={len(code_val)}")


if __name__ == "__main__":
    main()
