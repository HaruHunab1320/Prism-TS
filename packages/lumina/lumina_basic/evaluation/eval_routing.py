#!/usr/bin/env python3
"""
Routing benchmark for Lumina specialists.

Compares confidence-based routing vs oracle (target_conf).
"""

import argparse
import json
from pathlib import Path
import random

import numpy as np
import torch
from transformers import GPT2Tokenizer

from models.gpt2_confidence import GPT2WithConfidence


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
    parser.add_argument("--domains", nargs=2, default=["general", "math"])
    parser.add_argument("--weights", nargs=2, default=[
        "outputs_gpt2/general_gpt2_confidence.pt",
        "outputs_gpt2/math_gpt2_confidence.pt",
    ])
    parser.add_argument("--max-samples", type=int, default=200)
    args = parser.parse_args()

    domain_a, domain_b = args.domains
    w_a, w_b = [Path(p) for p in args.weights]

    data_a = load_jsonl(args.data_root / f"{domain_a}_specialist" / "val.jsonl")
    data_b = load_jsonl(args.data_root / f"{domain_b}_specialist" / "val.jsonl")

    random.shuffle(data_a)
    random.shuffle(data_b)

    samples = data_a[: args.max_samples // 2] + data_b[: args.max_samples // 2]
    random.shuffle(samples)

    tokenizer = get_tokenizer()
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

    model_a = GPT2WithConfidence("gpt2")
    model_b = GPT2WithConfidence("gpt2")
    model_a.load_state_dict(torch.load(w_a, map_location="cpu"))
    model_b.load_state_dict(torch.load(w_b, map_location="cpu"))
    model_a.eval().to(device)
    model_b.eval().to(device)

    correct = 0
    oracle = 0

    for s in samples:
        q = s["question"]
        a = s["answer"]

        conf_a = prompt_conf(model_a, tokenizer, q, device)
        conf_b = prompt_conf(model_b, tokenizer, q, device)

        # Proxy for "which model is better" = higher target_conf on gold answer
        tc_a = target_conf(model_a, tokenizer, q, a, device)
        tc_b = target_conf(model_b, tokenizer, q, a, device)

        # routing decision
        routed = "a" if conf_a >= conf_b else "b"
        correct += 1 if (routed == "a" and tc_a >= tc_b) or (routed == "b" and tc_b >= tc_a) else 0

        oracle += 1 if max(tc_a, tc_b) == tc_a or max(tc_a, tc_b) == tc_b else 0

    acc = correct / max(1, len(samples))
    print(f"Routing proxy accuracy: {acc:.3f} over {len(samples)} samples")


if __name__ == "__main__":
    main()
