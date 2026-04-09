#!/usr/bin/env python3
"""
Build a Python-only code dataset aligned to the lumina_basic strict code contract.

Input:
  <in_root>/code_specialist/{train,val}.jsonl

Output:
  <out_root>/code_specialist/{train,val}.jsonl
"""

from __future__ import annotations

import argparse
import json
import random
import re
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


def looks_like_python(answer: str) -> bool:
    a = strip_code_fences(answer)
    if not a:
        return False
    if "function " in a or "console.log" in a or "{" in a or "};" in a:
        return False
    markers = ("def ", "return ", "import ", "from ", "class ", "print(", "lambda ")
    return any(marker in a for marker in markers)


def expand_inline_body(body: str) -> List[str]:
    body = (body or "").strip()
    if not body:
        return ["pass"]
    chunks: List[str] = []
    while body:
        body = body.strip()
        if not body:
            break
        if body.startswith(("import ", "from ")):
            return_idx = body.find(" return ")
            if return_idx > 0:
                maybe_import = body[:return_idx].strip()
                if maybe_import.startswith(("import ", "from ")):
                    chunks.append(maybe_import)
                    body = body[return_idx + 1 :].strip()
                    continue
        import_match = re.match(
            r"^(from\s+[A-Za-z0-9_.]+\s+import\s+[A-Za-z0-9_, *]+|import\s+[A-Za-z0-9_, ]+)(?:\s+|$)(.*)$",
            body,
        )
        if import_match:
            stmt = import_match.group(1).strip()
            rest = import_match.group(2).strip()
            chunks.append(stmt)
            body = rest
            continue
        return_idx = body.find(" return ")
        if return_idx > 0:
            prefix = body[:return_idx].strip()
            if prefix:
                chunks.append(prefix)
            body = body[return_idx + 1 :].strip()
            continue
        chunks.append(body)
        break
    out: List[str] = []
    for chunk in chunks:
        out.extend([part.strip() for part in chunk.split(";") if part.strip()])
    return out or ["pass"]


def normalize_compact_function_bodies(text: str) -> str:
    lines = (text or "").splitlines()
    if not lines:
        return ""
    out: List[str] = []
    pat = re.compile(r"^(\s*)def\s+([A-Za-z_][A-Za-z0-9_]*)\s*(\([^)]*\))\s*:\s*(.+)$")
    for line in lines:
        m = pat.match(line.rstrip())
        if not m:
            out.append(line)
            continue
        indent, name, sig, body = m.groups()
        out.append(f"{indent}def {name}{sig}:")
        stmt_indent = indent + "    "
        for stmt in expand_inline_body(body):
            out.append(f"{stmt_indent}{stmt}")
    return "\n".join(out).strip()


def expected_entry_point(question: str, answer: str) -> str:
    q = question or ""
    a = answer or ""
    # HumanEval-style question already contains the signature.
    m = re.search(r"def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", q)
    if m:
        return m.group(1)
    matches = re.findall(r"^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", a, flags=re.M)
    return matches[-1] if matches else ""


def extract_signature(text: str) -> str:
    m = re.search(
        r"def\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\)(?:\s*->\s*[^:\n]+)?\s*:",
        text or "",
        flags=re.S,
    )
    return m.group(0).strip() if m else ""


def expected_signature(question: str, answer: str) -> str:
    return extract_signature(question or "") or extract_signature(answer or "")


def benchmark_contract_question(question: str, answer: str) -> str:
    q = normalize_text(question)
    entry = expected_entry_point(question, answer)
    sig = expected_signature(question, answer)
    parts = [
        "Write valid Python code only.",
        "Return only the function implementation with no explanation or markdown.",
    ]
    if entry:
        parts.append(f"Define the top-level callable exactly as `{entry}`.")
    if sig:
        parts.append(f"Use this signature: `{sig}`.")
    parts.append(f"Task: {q}")
    return " ".join(parts)


def codealpaca_python_question(question: str) -> str:
    q = normalize_text(question)
    if "python" not in q.lower():
        q = f"Write Python code only. {q}"
    return (
        "Write valid Python code only. Return only code with no explanation or markdown. "
        + q
    )


def keep_python_codealpaca(row: Dict) -> bool:
    q = normalize_text(str(row.get("question", "")))
    a = str(row.get("answer", ""))
    if not q or not a:
        return False
    if "python" not in q.lower():
        return False
    if not looks_like_python(a):
        return False
    prose_only_markers = (
        "how do you",
        "what is the difference",
        "explain ",
        "describe ",
        "why ",
        "when would you",
    )
    if any(marker in q.lower() for marker in prose_only_markers):
        return False
    return True


def clean_answer(answer: str) -> str:
    return normalize_compact_function_bodies(strip_code_fences(answer))


def humaneval_full_answer(question: str, answer: str) -> str:
    q = strip_code_fences(question)
    a = strip_code_fences(answer)
    if "def " in a:
        return clean_answer(a)
    return clean_answer(f"{q}{a}")


def dedupe(rows: List[Dict]) -> List[Dict]:
    out: List[Dict] = []
    seen = set()
    for row in rows:
        q = normalize_key(row["question"])
        a = normalize_key(clean_answer(row["answer"]))
        key = (q, a)
        if key in seen:
            continue
        seen.add(key)
        clean = dict(row)
        clean["answer"] = clean_answer(clean["answer"])
        out.append(clean)
    return out


def source_counts(rows: List[Dict]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for row in rows:
        src = str(row.get("source", "?"))
        counts[src] = counts.get(src, 0) + 1
    return counts


def build_split(rows: List[Dict], max_codealpaca: int, rng: random.Random) -> List[Dict]:
    kept: List[Dict] = []
    alpaca: List[Dict] = []
    for row in rows:
        src = str(row.get("source", ""))
        q = str(row.get("question", ""))
        a = str(row.get("answer", ""))
        if src in {"mbpp", "humaneval"} and looks_like_python(a):
            clean = humaneval_full_answer(q, a) if src == "humaneval" else clean_answer(a)
            kept.append(
                {
                    "question": benchmark_contract_question(q, a),
                    "answer": clean,
                    "domain": "code",
                    "source": src,
                    "bucket": "benchmark",
                }
            )
        elif src == "codealpaca" and keep_python_codealpaca(row):
            alpaca.append(
                {
                    "question": codealpaca_python_question(q),
                    "answer": clean_answer(a),
                    "domain": "code",
                    "source": src,
                    "bucket": "python_instruction",
                }
            )
    rng.shuffle(alpaca)
    if max_codealpaca > 0:
        alpaca = alpaca[:max_codealpaca]
    return dedupe(kept + alpaca)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in-root", type=Path, required=True)
    p.add_argument("--out-root", type=Path, required=True)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--max-train-codealpaca", type=int, default=2000)
    p.add_argument("--max-val-codealpaca", type=int, default=100)
    args = p.parse_args()

    rng = random.Random(args.seed)
    train_in = load_jsonl(args.in_root / "code_specialist" / "train.jsonl")
    val_in = load_jsonl(args.in_root / "code_specialist" / "val.jsonl")

    train_out = build_split(train_in, args.max_train_codealpaca, rng)
    val_out = build_split(val_in, args.max_val_codealpaca, rng)

    write_jsonl(args.out_root / "code_specialist" / "train.jsonl", train_out)
    write_jsonl(args.out_root / "code_specialist" / "val.jsonl", val_out)

    print(f"train={len(train_out)} sources={source_counts(train_out)}")
    print(f"val={len(val_out)} sources={source_counts(val_out)}")


if __name__ == "__main__":
    main()
