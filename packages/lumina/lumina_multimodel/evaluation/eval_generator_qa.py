from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def normalize_answer(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^a-z0-9 ]", "", text)
    return text


def tokenize(text: str) -> List[str]:
    return [t for t in normalize_answer(text).split(" ") if t]


def f1_score(pred: str, gold: str) -> float:
    p = tokenize(pred)
    g = tokenize(gold)
    if not p or not g:
        return 0.0
    p_counts: Dict[str, int] = {}
    for t in p:
        p_counts[t] = p_counts.get(t, 0) + 1
    overlap = 0
    for t in g:
        n = p_counts.get(t, 0)
        if n > 0:
            overlap += 1
            p_counts[t] = n - 1
    if overlap == 0:
        return 0.0
    precision = overlap / len(p)
    recall = overlap / len(g)
    return 2 * precision * recall / (precision + recall)


def canonicalize_prediction(text: str, max_words: int = 8) -> str:
    s = (text or "").strip()
    if not s:
        return s
    # Drop any trailing prompt spillover.
    s = re.split(r"\n|question:|answer:", s, maxsplit=1, flags=re.IGNORECASE)[0].strip()
    # Keep first sentence/span.
    s = re.split(r"[.!?;]", s, maxsplit=1)[0].strip()
    # If numeric token exists early, prefer it for short-answer tasks.
    num = re.search(r"[-+]?\d+(?:\.\d+)?", s)
    if num and num.start() < 24:
        return num.group(0)
    words = s.split()
    if len(words) > max_words:
        words = words[:max_words]
    return " ".join(words).strip()


def canonicalize_math_answer(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return s
    m = re.search(r"(?:final answer|answer)\s*[:=]\s*([^\n]+)", s, flags=re.IGNORECASE)
    if m:
        s = m.group(1).strip()
    nums = re.findall(r"[-+]?\d+(?:\.\d+)?", s)
    if nums:
        return nums[-1]
    s = re.split(r"[.;\n]", s, maxsplit=1)[0].strip()
    return " ".join(s.split()[:8]).strip()


def load_jsonl(path: Path) -> List[Dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def resolve_subdir(root: Path, domain: str) -> str:
    if (root / domain / "train.jsonl").exists():
        return domain
    return f"{domain}_specialist"


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


def main() -> None:
    p = argparse.ArgumentParser(description="Evaluate generator QA EM/F1.")
    p.add_argument("--model-path", type=Path, required=True)
    p.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    p.add_argument("--domain", required=True)
    p.add_argument("--split", choices=["train", "val"], default="val")
    p.add_argument("--max-samples", type=int, default=200)
    p.add_argument("--max-new-tokens", type=int, default=24)
    p.add_argument("--device", default="")
    p.add_argument("--strict-answer", action="store_true",
                   help="Use strict prompt: 'Answer (short):'.")
    p.add_argument("--constrained-postprocess", action="store_true",
                   help="Apply strict postprocessing to keep the first short answer span.")
    p.add_argument("--max-answer-words", type=int, default=8)
    p.add_argument("--math-canonical-metric", action="store_true",
                   help="For math domain, compare canonicalized short answers.")
    args = p.parse_args()

    subdir = resolve_subdir(args.data_root, args.domain)
    rows = load_jsonl(args.data_root / subdir / f"{args.split}.jsonl")[: args.max_samples]
    if not rows:
        raise SystemExit("No rows found.")

    # Some locally saved tokenizers can trip fast-tokenizer init across versions.
    # Fall back to the slow tokenizer for robustness in eval scripts.
    try:
        tok = AutoTokenizer.from_pretrained(args.model_path)
    except Exception:
        tok = AutoTokenizer.from_pretrained(args.model_path, use_fast=False)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    model = AutoModelForCausalLM.from_pretrained(args.model_path)
    device = resolve_device(args.device)
    model.to(device).eval()

    em_hits = 0
    f1_sum = 0.0
    for row in rows:
        if args.strict_answer:
            prompt = f"Question: {row['question']}\nAnswer (short):"
        else:
            prompt = f"Question: {row['question']}\nAnswer:"
        enc = tok(prompt, return_tensors="pt")
        input_ids = enc.input_ids.to(device)
        attention_mask = enc.attention_mask.to(device)
        with torch.no_grad():
            out = model.generate(
                input_ids=input_ids,
                attention_mask=attention_mask,
                do_sample=False,
                max_new_tokens=args.max_new_tokens,
                pad_token_id=tok.eos_token_id,
            )
        gen_ids = out[0, input_ids.shape[1]:]
        pred = tok.decode(gen_ids, skip_special_tokens=True).strip()
        if args.constrained_postprocess:
            pred = canonicalize_prediction(pred, max_words=args.max_answer_words)
        gold = str(row["answer"])
        if args.math_canonical_metric:
            pred = canonicalize_math_answer(pred)
            gold = canonicalize_math_answer(gold)
        em_hits += int(normalize_answer(pred) == normalize_answer(gold))
        f1_sum += f1_score(pred, gold)

    total = len(rows)
    print(f"split={args.split} samples={total}")
    print(f"em={em_hits/total:.3f}")
    print(f"f1={f1_sum/total:.3f}")


if __name__ == "__main__":
    main()
