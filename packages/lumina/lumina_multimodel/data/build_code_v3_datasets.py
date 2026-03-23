#!/usr/bin/env python3
"""
Build a stronger code specialist dataset with more diverse and more verifiable tasks.

Mix:
- OpenCodeInstruct instruction/code generation samples
- CommitPackFT edit-style commit tasks
- Existing MBPP / HumanEval rows from datasets_hq_v2_curated

Output:
  <out_root>/code_specialist/{train,val}.jsonl
"""

from __future__ import annotations

import argparse
import json
import random
import re
from pathlib import Path
from typing import Dict, Iterable, List

from datasets import load_dataset


COMMIT_LANGS = ["python", "javascript", "typescript", "java", "go", "c++"]


def load_jsonl(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def write_jsonl(path: Path, rows: List[Dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def normalize_key(text: str) -> str:
    return normalize_text(text).lower()


def strip_code_fences(text: str) -> str:
    s = (text or "").strip()
    s = re.sub(r"^```[A-Za-z0-9_+-]*\n?", "", s)
    s = re.sub(r"\n?```$", "", s)
    return s.strip()


def looks_like_code(text: str) -> bool:
    s = strip_code_fences(text)
    if not s:
        return False
    markers = (
        "def ",
        "class ",
        "return ",
        "import ",
        "from ",
        "public ",
        "private ",
        "function ",
        "const ",
        "let ",
        "var ",
        "console.log",
        "print(",
        "if __name__",
        "#include",
        "SELECT ",
        "INSERT ",
        "UPDATE ",
        "DELETE ",
    )
    if any(marker in s for marker in markers):
        return True
    if "\n" in s and any(tok in s for tok in ("{", "}", ";", "(", ")", ":")):
        return True
    return False


def keep_question(question: str, min_words: int = 4, max_chars: int = 1600) -> bool:
    q = normalize_text(question)
    if not q:
        return False
    if len(q) > max_chars:
        return False
    if len(q.split()) < min_words:
        return False
    return True


def keep_answer(answer: str, min_chars: int = 8, max_chars: int = 1800) -> bool:
    a = strip_code_fences(answer)
    if not a:
        return False
    if len(a) < min_chars or len(a) > max_chars:
        return False
    if not looks_like_code(a):
        return False
    return True


def dedupe(rows: List[Dict]) -> List[Dict]:
    out: List[Dict] = []
    seen = set()
    for row in rows:
        q = normalize_key(row["question"])
        a = normalize_key(strip_code_fences(row["answer"]))
        key = (q, a)
        if key in seen:
            continue
        seen.add(key)
        clean = dict(row)
        clean["answer"] = strip_code_fences(clean["answer"])
        out.append(clean)
    return out


def source_counts(rows: List[Dict]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for row in rows:
        src = str(row.get("source", "?"))
        counts[src] = counts.get(src, 0) + 1
    return counts


def split_rows(rows: List[Dict], val_count: int, rng: random.Random) -> tuple[List[Dict], List[Dict]]:
    rows = list(rows)
    rng.shuffle(rows)
    val = rows[: min(val_count, len(rows))]
    train = rows[min(val_count, len(rows)) :]
    return train, val


def parse_score(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except Exception:
        return None


def collect_opencode(args, rng: random.Random) -> tuple[List[Dict], List[Dict]]:
    target_total = args.opencode_train + args.opencode_val
    rows: List[Dict] = []
    ds = load_dataset("nvidia/OpenCodeInstruct", split="train", streaming=True)
    for ex in ds:
        q = normalize_text(ex.get("input") or "")
        a = strip_code_fences(ex.get("output") or "")
        if not keep_question(q) or not keep_answer(a):
            continue
        score = parse_score(ex.get("average_test_score"))
        status = normalize_key(str(ex.get("tests_execution_status") or ""))
        if score is not None and score < args.min_opencode_score:
            continue
        if status and "fail" in status and "pass" not in status:
            continue
        rows.append(
            {
                "question": q,
                "answer": a,
                "domain": "code",
                "source": "opencodeinstruct",
                "bucket": "synthesis" if str(ex.get("domain", "")) == "generic" else "algorithmic",
            }
        )
        if len(rows) >= target_total:
            break
    rows = dedupe(rows)
    train, val = split_rows(rows, args.opencode_val, rng)
    return train[: args.opencode_train], val[: args.opencode_val]


def commit_prompt(lang: str, subject: str, old_contents: str) -> str:
    old_trimmed = strip_code_fences(old_contents)
    old_trimmed = old_trimmed[:900]
    return (
        f"Update this {lang} code according to the instruction: {subject}\n"
        f"Old code:\n{old_trimmed}\n"
        "New code:"
    )


def collect_commitpackft(args, rng: random.Random) -> tuple[List[Dict], List[Dict]]:
    train_rows: List[Dict] = []
    val_rows: List[Dict] = []
    for lang in COMMIT_LANGS:
        target_total = args.commitpack_train_per_lang + args.commitpack_val_per_lang
        collected: List[Dict] = []
        ds = load_dataset("bigcode/commitpackft", lang, split="train", streaming=True)
        for ex in ds:
            subject = normalize_text(ex.get("subject") or ex.get("message") or "")
            old_contents = ex.get("old_contents") or ""
            new_contents = strip_code_fences(ex.get("new_contents") or "")
            if not subject or not keep_answer(new_contents, max_chars=1400):
                continue
            if len(normalize_text(old_contents)) > 1200:
                continue
            question = commit_prompt(str(ex.get("lang") or lang), subject, old_contents)
            if not keep_question(question, min_words=6, max_chars=1800):
                continue
            collected.append(
                {
                    "question": question,
                    "answer": new_contents,
                    "domain": "code",
                    "source": "commitpackft",
                    "bucket": "edit",
                    "language": str(ex.get("lang") or lang),
                }
            )
            if len(collected) >= target_total:
                break
        collected = dedupe(collected)
        tr, va = split_rows(collected, args.commitpack_val_per_lang, rng)
        train_rows.extend(tr[: args.commitpack_train_per_lang])
        val_rows.extend(va[: args.commitpack_val_per_lang])
    return train_rows, val_rows


def collect_local_benchmarks(in_root: Path) -> tuple[List[Dict], List[Dict]]:
    train = load_jsonl(in_root / "code_specialist" / "train.jsonl")
    val = load_jsonl(in_root / "code_specialist" / "val.jsonl")
    keep_sources = {"mbpp", "humaneval"}
    train = [r for r in train if r.get("source") in keep_sources and keep_answer(str(r.get("answer", "")), max_chars=1400)]
    val = [r for r in val if r.get("source") in keep_sources and keep_answer(str(r.get("answer", "")), max_chars=1400)]
    for row in train + val:
        row["bucket"] = "benchmark"
    return dedupe(train), dedupe(val)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in-root", type=Path, required=True,
                   help="Existing curated dataset root for MBPP/HumanEval carry-over.")
    p.add_argument("--out-root", type=Path, required=True)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--opencode-train", type=int, default=12000)
    p.add_argument("--opencode-val", type=int, default=600)
    p.add_argument("--min-opencode-score", type=float, default=0.6)
    p.add_argument("--commitpack-train-per-lang", type=int, default=1000)
    p.add_argument("--commitpack-val-per-lang", type=int, default=60)
    args = p.parse_args()

    rng = random.Random(args.seed)
    train_rows: List[Dict] = []
    val_rows: List[Dict] = []

    local_train, local_val = collect_local_benchmarks(args.in_root)
    oc_train, oc_val = collect_opencode(args, rng)
    cp_train, cp_val = collect_commitpackft(args, rng)

    train_rows.extend(local_train)
    train_rows.extend(oc_train)
    train_rows.extend(cp_train)
    val_rows.extend(local_val)
    val_rows.extend(oc_val)
    val_rows.extend(cp_val)

    train_rows = dedupe(train_rows)
    val_rows = dedupe(val_rows)

    write_jsonl(args.out_root / "code_specialist" / "train.jsonl", train_rows)
    write_jsonl(args.out_root / "code_specialist" / "val.jsonl", val_rows)

    print(f"train={len(train_rows)} sources={source_counts(train_rows)}")
    print(f"val={len(val_rows)} sources={source_counts(val_rows)}")


if __name__ == "__main__":
    main()
