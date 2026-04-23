#!/usr/bin/env python3
"""
Multi-way routing benchmark for Lumina specialists.

Routes by highest prompt confidence; oracle = highest target_conf on gold answer.
"""

import argparse
import json
from pathlib import Path
import random

import torch
from transformers import GPT2Tokenizer

from models.gpt2_confidence import GPT2WithConfidence
import os


def load_jsonl(path: Path):
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def get_tokenizer():
    try:
        tok = GPT2Tokenizer.from_pretrained("gpt2", local_files_only=True)
    except Exception:
        tok = GPT2Tokenizer.from_pretrained("gpt2")
    tok.pad_token = tok.eos_token
    return tok


def target_conf(model, tokenizer, question, answer, device):
    input_text = f"Question: {question}\nAnswer:"
    full_text = f"{input_text} {answer}"
    enc = tokenizer(full_text, truncation=True, max_length=256, padding="max_length", return_tensors="pt")
    input_ids = enc["input_ids"].to(device)
    mask = enc["attention_mask"].to(device)

    boundary = len(tokenizer.encode(input_text, truncation=True, max_length=256))
    ans_mask = torch.zeros_like(enc["input_ids"][0]).float().to(device)
    ans_mask[max(0, boundary - 1):] = 1

    with torch.no_grad():
        out = model.gpt2(input_ids=input_ids, attention_mask=mask)
        logits = out.logits
        log_probs = torch.log_softmax(logits, dim=-1)
        target_lp = log_probs.gather(-1, input_ids.unsqueeze(-1)).squeeze(-1)
        nll = -(target_lp * ans_mask).sum() / ans_mask.sum().clamp(min=1.0)
        return float(torch.exp(-nll).item())


def prompt_conf(model, tokenizer, question, device):
    input_text = f"Question: {question}\nAnswer:"
    enc = tokenizer(input_text, truncation=True, max_length=256, return_tensors="pt")
    input_ids = enc["input_ids"].to(device)
    mask = enc["attention_mask"].to(device)
    with torch.no_grad():
        _, conf = model(input_ids=input_ids, attention_mask=mask, labels=None)
    return float(conf["overall"].mean().item())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    parser.add_argument("--domains", nargs="+", default=["general", "math", "code"])
    parser.add_argument("--weights", nargs="+", default=[
        "outputs_gpt2/general_gpt2_confidence.pt",
        "outputs_gpt2/math_gpt2_confidence.pt",
        "outputs_gpt2/code_gpt2_confidence.pt",
    ])
    parser.add_argument("--max-samples", type=int, default=300)
    args = parser.parse_args()

    if len(args.domains) != len(args.weights):
        raise SystemExit("domains and weights must be the same length")

    per_domain = max(1, args.max_samples // max(1, len(args.domains)))
    samples = []

    for domain in args.domains:
        data = load_jsonl(args.data_root / f"{domain}_specialist" / "val.jsonl")
        random.shuffle(data)
        samples.extend(data[:per_domain])

    random.shuffle(samples)

    tokenizer = get_tokenizer()
    # Prefer CUDA on Linux GPUs, fallback to MPS (Mac), then CPU.
    if torch.cuda.is_available():
        device = torch.device("cuda")
    elif torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")
    if os.environ.get("REQUIRE_CUDA") == "1" and device.type != "cuda":
        raise SystemExit("CUDA required but not available")

    models = []
    for w in args.weights:
        model = GPT2WithConfidence("gpt2")
        model.load_state_dict(torch.load(Path(w), map_location="cpu"))
        model.eval().to(device)
        models.append(model)

    correct = 0

    for s in samples:
        q = s["question"]
        a = s["answer"]

        confs = [prompt_conf(m, tokenizer, q, device) for m in models]
        targets = [target_conf(m, tokenizer, q, a, device) for m in models]

        routed_idx = int(max(range(len(confs)), key=lambda i: confs[i]))
        oracle_idx = int(max(range(len(targets)), key=lambda i: targets[i]))

        correct += 1 if routed_idx == oracle_idx else 0

    acc = correct / max(1, len(samples))
    print(f"Routing proxy accuracy (multi): {acc:.3f} over {len(samples)} samples")


if __name__ == "__main__":
    main()
