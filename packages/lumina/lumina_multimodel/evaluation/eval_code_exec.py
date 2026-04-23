#!/usr/bin/env python3
"""
Execution-aware evaluation for code-generation specialists.

Benchmarks:
- MBPP (`Muennighoff/mbpp`)
- HumanEval (`openai/openai_humaneval`)

This script is intentionally simple:
- generate one answer per prompt
- normalize it into executable code
- run trusted benchmark tests in a subprocess with a timeout
- report pass rate and syntax-valid rate
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def resolve_device(requested: str | None) -> torch.device:
    req = (requested or "").strip().lower()
    if req == "cuda":
        return torch.device("cuda")
    if req == "mps":
        return torch.device("mps")
    if req == "cpu":
        return torch.device("cpu")
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def strip_code_fences(text: str) -> str:
    s = (text or "").strip()
    s = re.sub(r"^```[A-Za-z0-9_+-]*\n?", "", s)
    s = re.sub(r"\n?```$", "", s)
    return s.strip()


def extract_answer(text: str) -> str:
    if "Answer:" in text:
        text = text.split("Answer:", 1)[-1]
    text = re.split(r"\n(?:Question:|Q:|User:|Assistant:)", text, maxsplit=1)[0]
    return strip_code_fences(text)


def load_model(model_path: Path):
    try:
        tok = AutoTokenizer.from_pretrained(model_path)
    except Exception:
        tok = AutoTokenizer.from_pretrained(model_path, use_fast=False)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    model = AutoModelForCausalLM.from_pretrained(model_path)
    return model, tok


def generate_code(model, tokenizer, question: str, device: torch.device, max_new_tokens: int) -> str:
    prompt = f"Question: {question}\nAnswer:"
    enc = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
    input_ids = enc["input_ids"].to(device)
    attention_mask = enc["attention_mask"].to(device)
    with torch.no_grad():
        out = model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            do_sample=False,
            max_new_tokens=max_new_tokens,
            pad_token_id=tokenizer.eos_token_id,
        )
    gen_ids = out[0, input_ids.shape[1]:]
    return extract_answer(tokenizer.decode(gen_ids, skip_special_tokens=True))


def load_jsonl(path: Path) -> List[Dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def load_mbpp_rows(fixture_root: Path, max_samples: int) -> List[Dict]:
    return load_jsonl(fixture_root / "mbpp_test.jsonl")[:max_samples]


def load_humaneval_rows(fixture_root: Path, max_samples: int) -> List[Dict]:
    return load_jsonl(fixture_root / "humaneval_test.jsonl")[:max_samples]


def syntax_valid(code: str) -> bool:
    try:
        compile(code, "<candidate>", "exec")
        return True
    except Exception:
        return False


def assemble_candidate(row: Dict, pred: str) -> str:
    pred = strip_code_fences(pred)
    if row["benchmark"] == "humaneval":
        entry = row.get("entry_point") or ""
        if f"def {entry}" in pred:
            return pred
        return f"{row['prompt']}{pred}".strip()
    return pred


def build_test_script(row: Dict, candidate_code: str) -> str:
    if row["benchmark"] == "mbpp":
        parts = [candidate_code]
        if row.get("test_setup_code"):
            parts.append(row["test_setup_code"])
        parts.extend(row.get("tests") or [])
        return "\n\n".join(p for p in parts if p.strip()) + "\n"
    entry = row.get("entry_point") or ""
    return f"{candidate_code}\n\n{row['test']}\n\ncheck({entry})\n"


def run_script(script: str, timeout_sec: float) -> tuple[bool, str]:
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
        f.write(script)
        temp_path = f.name
    try:
        proc = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=timeout_sec,
        )
        ok = proc.returncode == 0
        msg = proc.stderr.strip() or proc.stdout.strip()
        return ok, msg[:400]
    except subprocess.TimeoutExpired:
        return False, "timeout"
    finally:
        Path(temp_path).unlink(missing_ok=True)


def main() -> None:
    p = argparse.ArgumentParser(description="Execution-aware code benchmark eval.")
    p.add_argument("--model-path", type=Path, required=True)
    p.add_argument("--benchmark", choices=["mbpp", "humaneval", "both"], default="both")
    p.add_argument("--max-samples", type=int, default=100)
    p.add_argument("--max-new-tokens", type=int, default=128)
    p.add_argument("--timeout-sec", type=float, default=4.0)
    p.add_argument("--device", default="")
    p.add_argument("--debug-limit", type=int, default=10)
    p.add_argument("--fixture-root", type=Path, default=Path("benchmarks/code_exec"))
    args = p.parse_args()

    device = resolve_device(args.device)
    model, tok = load_model(args.model_path)
    model.to(device).eval()

    rows: List[Dict] = []
    if args.benchmark in {"mbpp", "both"}:
        rows.extend(load_mbpp_rows(args.fixture_root, args.max_samples if args.benchmark == "mbpp" else max(1, args.max_samples // 2)))
    if args.benchmark in {"humaneval", "both"}:
        rows.extend(load_humaneval_rows(args.fixture_root, args.max_samples if args.benchmark == "humaneval" else max(1, args.max_samples // 2)))

    total = len(rows)
    syntax_ok = 0
    passed = 0
    per_benchmark = {}
    debug_rows = []

    for row in rows:
        pred = generate_code(model, tok, row["question"], device, args.max_new_tokens)
        candidate = assemble_candidate(row, pred)
        syntactic = syntax_valid(candidate)
        syntax_ok += int(syntactic)
        ok = False
        err = ""
        if syntactic:
            ok, err = run_script(build_test_script(row, candidate), args.timeout_sec)
        passed += int(ok)

        bench = row["benchmark"]
        stats = per_benchmark.setdefault(bench, {"total": 0, "syntax_ok": 0, "passed": 0})
        stats["total"] += 1
        stats["syntax_ok"] += int(syntactic)
        stats["passed"] += int(ok)

        if len(debug_rows) < args.debug_limit:
            debug_rows.append(
                {
                    "benchmark": bench,
                    "task_id": row["task_id"],
                    "passed": ok,
                    "syntax_ok": syntactic,
                    "prediction": pred[:500],
                    "error": err,
                }
            )

    print(f"benchmark={args.benchmark}")
    print(f"samples={total}")
    print(f"syntax_valid_rate={syntax_ok / max(1, total):.3f}")
    print(f"pass_rate={passed / max(1, total):.3f}")
    for bench, stats in sorted(per_benchmark.items()):
        print(
            f"{bench}: samples={stats['total']} syntax_valid_rate={stats['syntax_ok'] / max(1, stats['total']):.3f} "
            f"pass_rate={stats['passed'] / max(1, stats['total']):.3f}"
        )
    if debug_rows:
        print("debug=" + json.dumps(debug_rows, ensure_ascii=False))


if __name__ == "__main__":
    main()
