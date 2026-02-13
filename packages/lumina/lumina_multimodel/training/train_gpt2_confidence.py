#!/usr/bin/env python3
"""
Train GPT-2 + Lumina confidence head (base frozen by default).
"""

import argparse
import json
import random
import sys
from pathlib import Path
from typing import Dict, List

import torch
from torch.utils.data import DataLoader
from transformers import GPT2Tokenizer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models.gpt2_confidence import GPT2WithConfidence
import os


def load_jsonl(path: Path) -> List[Dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def make_dataset(samples: List[Dict], tokenizer: GPT2Tokenizer, max_length: int = 256):
    items = []
    for s in samples:
        q = s["question"]
        a = s["answer"]
        input_text = f"Question: {q}\nAnswer:"
        full_text = f"{input_text} {a}"

        enc = tokenizer(full_text, truncation=True, max_length=max_length, padding="max_length", return_tensors="pt")

        # Build answer mask
        input_ids = enc["input_ids"][0]
        # Find boundary by encoding input_text alone
        boundary = len(tokenizer.encode(input_text, truncation=True, max_length=max_length))
        mask = torch.zeros_like(input_ids)
        mask[max(0, boundary - 1):] = 1

        is_ood = 1.0 if s.get("category") == "ood" else 0.0
        items.append({
            "input_ids": enc["input_ids"][0],
            "attention_mask": enc["attention_mask"][0],
            "labels": enc["input_ids"][0],
            "answer_mask": mask,
            "ood": torch.tensor(is_ood),
        })
    return items


def make_prompt_batch(samples: List[Dict], tokenizer: GPT2Tokenizer, max_length: int = 256):
    input_ids = []
    attention_masks = []
    for s in samples:
        q = s["question"]
        input_text = f"Question: {q}\nAnswer:"
        enc = tokenizer(input_text, truncation=True, max_length=max_length, padding="max_length", return_tensors="pt")
        input_ids.append(enc["input_ids"][0])
        attention_masks.append(enc["attention_mask"][0])
    return torch.stack(input_ids), torch.stack(attention_masks)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    parser.add_argument("--domain", type=str, default="general")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--freeze-base", action="store_true")
    parser.add_argument("--unfreeze-last", action="store_true",
                        help="Unfreeze last GPT-2 block + lm_head")
    parser.add_argument("--unfreeze-n", type=int, default=0,
                        help="Unfreeze last N GPT-2 blocks + lm_head")
    parser.add_argument("--max-train-samples", type=int, default=20000)
    parser.add_argument("--max-val-samples", type=int, default=2000)
    parser.add_argument("--output", type=Path, default=Path("outputs_gpt2"))
    parser.add_argument("--conf-tau", type=float, default=3.0,
                        help="Temperature for NLL->confidence mapping (higher=lower target)")
    parser.add_argument("--conf-min", type=float, default=0.05,
                        help="Minimum confidence target")
    parser.add_argument("--conf-max", type=float, default=0.8,
                        help="Maximum confidence target")
    parser.add_argument("--overconf-weight", type=float, default=0.2,
                        help="Penalty weight for overconfidence")
    parser.add_argument("--prior-weight", type=float, default=0.05,
                        help="Penalty weight to keep confidence near 0.5")
    parser.add_argument("--ood-weight", type=float, default=1.0,
                        help="Weight for OOD (distribution_shift) loss")
    parser.add_argument("--contrastive", action="store_true",
                        help="Enable routing contrastive loss")
    parser.add_argument("--contrastive-weight", type=float, default=0.5,
                        help="Weight for contrastive routing loss")
    parser.add_argument("--contrastive-margin", type=float, default=0.1,
                        help="Margin for in-domain vs out-domain confidence")
    args = parser.parse_args()

    train_path = args.data_root / f"{args.domain}_specialist" / "train.jsonl"
    val_path = args.data_root / f"{args.domain}_specialist" / "val.jsonl"

    train_data = load_jsonl(train_path)[: args.max_train_samples]
    val_data = load_jsonl(val_path)[: args.max_val_samples]

    # Build negative pool for contrastive routing
    neg_pool = []
    if args.contrastive:
        other_domains = [d for d in ["general", "math", "code", "prism"] if d != args.domain]
        for d in other_domains:
            p = args.data_root / f"{d}_specialist" / "train.jsonl"
            neg_pool.extend(load_jsonl(p)[: max(2000, args.max_train_samples // 4)])

    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    tokenizer.pad_token = tokenizer.eos_token

    model = GPT2WithConfidence("gpt2")
    if args.freeze_base:
        model.freeze_base()
    if args.unfreeze_last:
        model.unfreeze_last_n(1)
    if args.unfreeze_n and args.unfreeze_n > 0:
        model.unfreeze_last_n(args.unfreeze_n)

    model.train()

    train_items = make_dataset(train_data, tokenizer)
    val_items = make_dataset(val_data, tokenizer)

    train_loader = DataLoader(train_items, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_items, batch_size=args.batch_size)

    # Prefer CUDA on Linux GPUs, fallback to MPS (Mac), then CPU.
    if torch.cuda.is_available():
        device = torch.device("cuda")
    elif torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")
    model.to(device)
    if os.environ.get("REQUIRE_CUDA") == "1" and device.type != "cuda":
        raise SystemExit("CUDA required but not available")

    opt = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr)

    for epoch in range(args.epochs):
        total_loss = 0.0
        for batch in train_loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)
            answer_mask = batch["answer_mask"].to(device).float()
            ood = batch["ood"].to(device)

            outputs, conf = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            logits = outputs.logits

            # Answer-only LM loss
            log_probs = torch.log_softmax(logits, dim=-1)
            target_log_probs = log_probs.gather(-1, labels.unsqueeze(-1)).squeeze(-1)
            nll = -target_log_probs
            lm_loss = (nll * answer_mask).sum() / answer_mask.sum().clamp(min=1.0)

            # Per-sample confidence target from answer NLL
            per_sample_nll = (nll * answer_mask).sum(dim=1) / answer_mask.sum(dim=1).clamp(min=1.0)
            per_sample_conf_target = torch.exp(-per_sample_nll / args.conf_tau).detach()
            per_sample_conf_target = torch.clamp(per_sample_conf_target, args.conf_min, args.conf_max)

            # Confidence loss: match NLL-derived confidence + OOD labels
            conf_loss = ((conf["overall"] - per_sample_conf_target) ** 2).mean()
            ood_loss = ((conf["distribution_shift"] - ood) ** 2).mean()

            # Overconfidence penalty
            overconf = torch.relu(conf["overall"] - per_sample_conf_target).mean()

            # Confidence prior to avoid saturation
            prior = ((conf["overall"] - 0.5) ** 2).mean()

            loss = lm_loss + 0.3 * conf_loss + args.ood_weight * ood_loss + args.overconf_weight * overconf + args.prior_weight * prior

            # Contrastive routing loss (in-domain vs out-domain prompt confidence)
            if args.contrastive and neg_pool:
                k = min(input_ids.shape[0], len(neg_pool))
                neg_samples = random.sample(neg_pool, k=k)
                neg_ids, neg_mask = make_prompt_batch(neg_samples, tokenizer)
                neg_ids, neg_mask = neg_ids.to(device), neg_mask.to(device)
                _, neg_conf = model(input_ids=neg_ids, attention_mask=neg_mask, labels=None)
                margin = args.contrastive_margin
                contrastive_loss = torch.relu(margin - (conf["overall"][:k] - neg_conf["overall"])).mean()
                loss = loss + args.contrastive_weight * contrastive_loss

            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            opt.step()

            total_loss += loss.item()

        print(f"Epoch {epoch+1}/{args.epochs} loss={total_loss/len(train_loader):.4f}")

    # Save
    args.output.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), args.output / f"{args.domain}_gpt2_confidence.pt")
    print(f"Saved to {args.output}")


if __name__ == "__main__":
    main()
