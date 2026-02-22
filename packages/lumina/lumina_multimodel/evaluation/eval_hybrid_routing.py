#!/usr/bin/env python3
"""
Hybrid routing benchmark combining router logits + expert confidence.
"""

import argparse
import json
from pathlib import Path
import random

import torch
from transformers import GPT2Tokenizer

from models.gpt2_confidence import GPT2WithConfidence
from training.train_router import TinyRouterClassifier, RouterDataset, load_jsonl
import os


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


def resolve_device() -> torch.device:
    requested = os.environ.get("DEVICE", "").strip().lower()
    if requested:
        if requested == "cuda":
            if not torch.cuda.is_available():
                raise SystemExit("DEVICE=cuda requested but CUDA is not available.")
            return torch.device("cuda")
        if requested == "mps":
            if not torch.backends.mps.is_available():
                raise SystemExit("DEVICE=mps requested but MPS is not available.")
            return torch.device("mps")
        if requested == "cpu":
            return torch.device("cpu")
        raise SystemExit(f"Unsupported DEVICE value: {requested}")
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    parser.add_argument("--domains", nargs="+", default=["general", "math", "code"])
    parser.add_argument("--weights", nargs="+", default=[
        "outputs_gpt2/general_gpt2_confidence.pt",
        "outputs_gpt2/math_gpt2_confidence.pt",
        "outputs_gpt2/code_gpt2_confidence.pt",
    ])
    parser.add_argument("--router-weights", type=Path, default=Path("outputs_router/router.pt"))
    parser.add_argument("--router-labels", type=Path, default=Path("outputs_router/labels.json"))
    parser.add_argument("--router-hidden-size", type=int, default=256)
    parser.add_argument("--max-len", type=int, default=128)
    parser.add_argument("--max-samples", type=int, default=600)
    parser.add_argument("--alpha", type=float, default=0.7, help="Weight for router probs vs confidence")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if len(args.domains) != len(args.weights):
        raise SystemExit("domains and weights must be the same length")
    random.seed(args.seed)

    per_domain = max(1, args.max_samples // max(1, len(args.domains)))
    samples = []
    for domain in args.domains:
        data = load_jsonl(args.data_root / f"{domain}_specialist" / "val.jsonl")
        random.shuffle(data)
        samples.extend(data[:per_domain])
    random.shuffle(samples)

    tokenizer = get_tokenizer()
    device = resolve_device()
    if os.environ.get("REQUIRE_CUDA") == "1" and device.type != "cuda":
        raise SystemExit("CUDA required but not available")

    # Load experts
    models = []
    for w in args.weights:
        model = GPT2WithConfidence("gpt2")
        model.load_state_dict(torch.load(Path(w), map_location="cpu"))
        model.eval().to(device)
        models.append(model)

    # Load router
    with args.router_labels.open() as f:
        inv_map = json.load(f)
    label_map = {v: int(k) for k, v in inv_map.items()}
    for domain in args.domains:
        if domain not in label_map:
            raise SystemExit(f"domain '{domain}' not found in router labels")

    router = TinyRouterClassifier(len(tokenizer), args.router_hidden_size, len(label_map), 0.1).to(device)
    router.load_state_dict(torch.load(args.router_weights, map_location="cpu"))
    router.eval()

    correct_hybrid = 0
    correct_router = 0
    correct_conf = 0

    for s in samples:
        q = s["question"]
        a = s["answer"]

        confs = [prompt_conf(m, tokenizer, q, device) for m in models]
        targets = [target_conf(m, tokenizer, q, a, device) for m in models]

        # Router probs
        enc = tokenizer(q, truncation=True, max_length=args.max_len, padding="max_length", return_tensors="pt")
        input_ids = enc["input_ids"].to(device)
        attn = enc["attention_mask"].to(device)
        with torch.no_grad():
            logits = router(input_ids, attn)
            probs = torch.softmax(logits, dim=-1)[0].cpu().tolist()

        router_scores = [probs[label_map[d]] for d in args.domains]

        # Decisions
        routed_conf = int(max(range(len(confs)), key=lambda i: confs[i]))
        routed_router = int(max(range(len(router_scores)), key=lambda i: router_scores[i]))
        routed_hybrid = int(max(range(len(confs)), key=lambda i: args.alpha * router_scores[i] + (1 - args.alpha) * confs[i]))

        oracle = int(max(range(len(targets)), key=lambda i: targets[i]))

        correct_conf += 1 if routed_conf == oracle else 0
        correct_router += 1 if routed_router == oracle else 0
        correct_hybrid += 1 if routed_hybrid == oracle else 0

    n = max(1, len(samples))
    print(f"Routing proxy accuracy (confidence): {correct_conf / n:.3f} over {n} samples")
    print(f"Routing proxy accuracy (router):     {correct_router / n:.3f} over {n} samples")
    print(f"Routing proxy accuracy (hybrid):     {correct_hybrid / n:.3f} over {n} samples (alpha={args.alpha})")


if __name__ == "__main__":
    main()
