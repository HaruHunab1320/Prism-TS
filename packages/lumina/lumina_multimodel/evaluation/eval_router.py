#!/usr/bin/env python3
"""
Evaluate the lightweight router classifier.
"""

import argparse
import json
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from transformers import GPT2Tokenizer

from training.train_router import RouterDataset, TinyRouterClassifier, load_jsonl


def get_tokenizer():
    try:
        tok = GPT2Tokenizer.from_pretrained("gpt2", local_files_only=True)
    except Exception:
        tok = GPT2Tokenizer.from_pretrained("gpt2")
    tok.pad_token = tok.eos_token
    return tok


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    parser.add_argument("--weights", type=Path, default=Path("outputs_router/router.pt"))
    parser.add_argument("--labels", type=Path, default=Path("outputs_router/labels.json"))
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--max-len", type=int, default=128)
    parser.add_argument("--hidden-size", type=int, default=None)
    args = parser.parse_args()

    rows = load_jsonl(args.data_root / "router" / "val.jsonl")
    if not rows:
        raise SystemExit("router/val.jsonl not found or empty")

    with args.labels.open() as f:
        inv_map = json.load(f)
    label_map = {v: int(k) for k, v in inv_map.items()}

    tokenizer = get_tokenizer()

    if args.hidden_size is None and args.weights.exists():
        cfg_path = args.weights.parent / "config.json"
        if cfg_path.exists():
            with cfg_path.open() as f:
                cfg = json.load(f)
            args.hidden_size = int(cfg.get("hidden_size", 256))
            args.max_len = int(cfg.get("max_len", args.max_len))
    if args.hidden_size is None:
        args.hidden_size = 256

    ds = RouterDataset(rows, tokenizer, label_map, args.max_len)
    loader = DataLoader(ds, batch_size=args.batch_size)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model = TinyRouterClassifier(len(tokenizer), args.hidden_size, len(label_map), 0.1).to(device)
    model.load_state_dict(torch.load(args.weights, map_location="cpu"))
    model.eval()

    correct = 0
    total = 0
    with torch.no_grad():
        for input_ids, attn, label, _ in loader:
            input_ids = input_ids.to(device)
            attn = attn.to(device)
            label = label.to(device)
            logits = model(input_ids, attn)
            preds = torch.argmax(logits, dim=-1)
            correct += (preds == label).sum().item()
            total += label.numel()

    acc = correct / max(1, total)
    print(f"Router accuracy: {acc:.3f} over {total} samples")


if __name__ == "__main__":
    main()
