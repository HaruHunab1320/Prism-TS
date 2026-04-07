from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


DEFAULT_FIXTURE_ROOT = Path("lumina_multimodel/benchmarks/code_exec")


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


def load_jsonl(path: Path) -> List[Dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def load_rows(fixture_root: Path, benchmark: str, max_samples: int) -> List[Dict]:
    if benchmark == "mbpp":
        return load_jsonl(fixture_root / "mbpp_test.jsonl")[:max_samples]
    if benchmark == "humaneval":
        return load_jsonl(fixture_root / "humaneval_test.jsonl")[:max_samples]
    if benchmark == "both":
        half = max(1, max_samples // 2)
        return load_jsonl(fixture_root / "mbpp_test.jsonl")[:half] + load_jsonl(fixture_root / "humaneval_test.jsonl")[:half]
    raise ValueError(f"Unsupported benchmark: {benchmark}")


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
        if entry and f"def {entry}" in pred:
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


def load_model(model_name_or_path: str):
    try:
        tok = AutoTokenizer.from_pretrained(model_name_or_path, local_files_only=True)
    except Exception:
        tok = AutoTokenizer.from_pretrained(model_name_or_path)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    try:
        model = AutoModelForCausalLM.from_pretrained(model_name_or_path, local_files_only=True)
    except Exception:
        model = AutoModelForCausalLM.from_pretrained(model_name_or_path)
    return model, tok


def code_prompt(question: str) -> str:
    return f"Question: {question}\nAnswer:"


def generate_code(
    model,
    tokenizer,
    question: str,
    device: torch.device,
    max_new_tokens: int,
    do_sample: bool,
    temperature: float,
    top_p: float,
) -> tuple[str, float, float]:
    prompt = code_prompt(question)
    enc = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
    input_ids = enc["input_ids"].to(device)
    attention_mask = enc["attention_mask"].to(device)

    with torch.no_grad():
        out = model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            do_sample=do_sample,
            temperature=temperature if do_sample else None,
            top_p=top_p if do_sample else None,
            max_new_tokens=max_new_tokens,
            return_dict_in_generate=True,
            output_scores=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    gen_ids = out.sequences[0, input_ids.shape[1]:]
    text = extract_answer(tokenizer.decode(gen_ids, skip_special_tokens=True))

    if len(out.scores) == 0:
        return text, -10.0, 10.0

    logprobs = []
    entropies = []
    for step_scores, tok_id in zip(out.scores, gen_ids):
        step_log_probs = torch.log_softmax(step_scores[0], dim=-1)
        tok_lp = step_log_probs[tok_id].item()
        entropy = torch.distributions.Categorical(logits=step_scores[0]).entropy().item()
        logprobs.append(tok_lp)
        entropies.append(entropy)
    avg_logprob = float(sum(logprobs) / max(len(logprobs), 1))
    avg_entropy = float(sum(entropies) / max(len(entropies), 1))
    return text, avg_logprob, avg_entropy


def heuristic_confidence(avg_logprob: float, avg_entropy: float, answer: str) -> float:
    answer_len = len((answer or "").split())
    length_penalty = 0.0
    if answer_len < 3:
        length_penalty += 0.12
    elif answer_len > 120:
        length_penalty += 0.08
    raw = 1.6 + avg_logprob - avg_entropy - length_penalty
    return 1.0 / (1.0 + math.exp(-raw))


def brier_score(rows: List[Dict]) -> float:
    if not rows:
        return 0.0
    return sum((r["confidence"] - r["correct"]) ** 2 for r in rows) / len(rows)


def ece(rows: List[Dict], bins: int = 10) -> float:
    if not rows:
        return 0.0
    total = len(rows)
    err = 0.0
    for i in range(bins):
        lo = i / bins
        hi = (i + 1) / bins
        bucket = [r for r in rows if lo <= r["confidence"] < hi or (i == bins - 1 and r["confidence"] == 1.0)]
        if not bucket:
            continue
        acc = sum(r["correct"] for r in bucket) / len(bucket)
        conf = sum(r["confidence"] for r in bucket) / len(bucket)
        err += abs(acc - conf) * (len(bucket) / total)
    return err


def auroc(rows: List[Dict]) -> float:
    pos = [r["confidence"] for r in rows if r["correct"] == 1]
    neg = [r["confidence"] for r in rows if r["correct"] == 0]
    if not pos or not neg:
        return 0.0
    wins = 0.0
    total = 0
    for p in pos:
        for n in neg:
            total += 1
            if p > n:
                wins += 1.0
            elif p == n:
                wins += 0.5
    return wins / total if total else 0.0


def coverage_metrics(rows: List[Dict], threshold: float) -> Dict[str, float]:
    total = len(rows)
    answered = [r for r in rows if r["confidence"] >= threshold]
    return {
        "threshold": threshold,
        "answered": len(answered),
        "abstained": total - len(answered),
        "coverage": len(answered) / total if total else 0.0,
        "selective_accuracy": sum(r["correct"] for r in answered) / len(answered) if answered else 0.0,
        "overall_accuracy": sum(r["correct"] for r in answered) / total if total else 0.0,
    }


def risk_coverage(rows: List[Dict], coverages: List[float]) -> List[Dict[str, float]]:
    ordered = sorted(rows, key=lambda r: r["confidence"], reverse=True)
    total = len(ordered)
    out = []
    for cov in coverages:
        keep = max(1, min(total, int(math.ceil(total * cov)))) if total else 0
        subset = ordered[:keep]
        acc = sum(r["correct"] for r in subset) / keep if keep else 0.0
        out.append({"coverage": cov, "accuracy": acc, "risk": 1.0 - acc})
    return out


def threshold_sweep(rows: List[Dict], thresholds: List[float]) -> List[Dict[str, float]]:
    return [coverage_metrics(rows, t) for t in thresholds]


def main() -> None:
    p = argparse.ArgumentParser(description="Execution-aware code confidence baseline for lumina_basic.")
    p.add_argument("--model", required=True)
    p.add_argument("--benchmark", choices=["mbpp", "humaneval", "both"], default="both")
    p.add_argument("--fixture-root", type=Path, default=DEFAULT_FIXTURE_ROOT)
    p.add_argument("--max-samples", type=int, default=100)
    p.add_argument("--max-new-tokens", type=int, default=128)
    p.add_argument("--timeout-sec", type=float, default=4.0)
    p.add_argument("--device", default="")
    p.add_argument("--do-sample", action="store_true")
    p.add_argument("--temperature", type=float, default=0.8)
    p.add_argument("--top-p", type=float, default=0.95)
    p.add_argument("--debug-limit", type=int, default=10)
    p.add_argument("--output-json", type=Path, default=None)
    args = p.parse_args()

    device = resolve_device(args.device)
    model, tokenizer = load_model(args.model)
    model.to(device).eval()

    rows = load_rows(args.fixture_root, args.benchmark, args.max_samples)
    result_rows: List[Dict] = []
    debug_rows = []
    bench_stats: Dict[str, Dict[str, int]] = {}

    for row in rows:
        pred, avg_logprob, avg_entropy = generate_code(
            model=model,
            tokenizer=tokenizer,
            question=row["question"],
            device=device,
            max_new_tokens=args.max_new_tokens,
            do_sample=args.do_sample,
            temperature=args.temperature,
            top_p=args.top_p,
        )
        candidate = assemble_candidate(row, pred)
        syntactic = syntax_valid(candidate)
        passed = False
        err = ""
        if syntactic:
            passed, err = run_script(build_test_script(row, candidate), args.timeout_sec)
        conf = heuristic_confidence(avg_logprob, avg_entropy, pred)

        record = {
            "benchmark": row["benchmark"],
            "task_id": row["task_id"],
            "confidence": conf,
            "correct": int(passed),
            "syntax_valid": int(syntactic),
            "avg_logprob": avg_logprob,
            "avg_entropy": avg_entropy,
        }
        result_rows.append(record)

        stats = bench_stats.setdefault(row["benchmark"], {"total": 0, "syntax_ok": 0, "passed": 0})
        stats["total"] += 1
        stats["syntax_ok"] += int(syntactic)
        stats["passed"] += int(passed)

        if len(debug_rows) < args.debug_limit:
            debug_rows.append(
                {
                    "benchmark": row["benchmark"],
                    "task_id": row["task_id"],
                    "prediction": pred[:500],
                    "syntax_valid": syntactic,
                    "passed": passed,
                    "confidence": conf,
                    "error": err,
                }
            )

    total = len(result_rows)
    syntax_valid_rate = sum(r["syntax_valid"] for r in result_rows) / total if total else 0.0
    pass_rate = sum(r["correct"] for r in result_rows) / total if total else 0.0

    payload = {
        "model": args.model,
        "contract": {
            "domain": "code",
            "task_contract": "code_python_synthesis_v1",
            "confidence_definition": "P(submitted code passes the benchmark tests | prompt, model state, produced code)",
            "benchmark": args.benchmark,
        },
        "samples": total,
        "syntax_valid_rate": syntax_valid_rate,
        "pass_rate": pass_rate,
        "brier": brier_score(result_rows),
        "ece": ece(result_rows),
        "auroc": auroc(result_rows),
        "threshold_sweep": threshold_sweep(result_rows, [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]),
        "risk_coverage": risk_coverage(result_rows, [0.25, 0.5, 0.75, 1.0]),
        "per_benchmark": {
            name: {
                "samples": stats["total"],
                "syntax_valid_rate": stats["syntax_ok"] / max(1, stats["total"]),
                "pass_rate": stats["passed"] / max(1, stats["total"]),
            }
            for name, stats in sorted(bench_stats.items())
        },
        "debug": debug_rows,
    }

    print(json.dumps(payload, indent=2))
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(payload, indent=2) + "\n")


if __name__ == "__main__":
    main()
