#!/usr/bin/env python3
"""
Train a domain generator (GPT-2) for answer quality.
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict

import torch
from torch.utils.data import Dataset, DataLoader
from transformers import GPT2LMHeadModel, GPT2Tokenizer


def load_jsonl(path: Path) -> List[Dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def get_tokenizer():
    try:
        tok = GPT2Tokenizer.from_pretrained("gpt2", local_files_only=True)
    except Exception:
        tok = GPT2Tokenizer.from_pretrained("gpt2")
    tok.pad_token = tok.eos_token
    return tok


class QADataset(Dataset):
    def __init__(self, rows: List[Dict], tokenizer: GPT2Tokenizer, max_len: int = 256):
        self.rows = rows
        self.tok = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, idx):
        r = self.rows[idx]
        prompt = f"Question: {r['question']}\nAnswer:"
        full = f"{prompt} {r['answer']}"

        enc = self.tok(full, truncation=True, max_length=self.max_len + 1, padding="max_length", return_tensors="pt")
        ids = enc["input_ids"][0]
        attn = enc["attention_mask"][0]

        # Shifted LM labels; mask non-answer tokens.
        labels = ids.clone()
        boundary = len(self.tok.encode(prompt, truncation=True, max_length=self.max_len))
        labels[: max(0, boundary - 1)] = -100
        labels[attn == 0] = -100
        return ids, attn, labels


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    p.add_argument("--domain", type=str, required=True)
    p.add_argument("--epochs", type=int, default=1)
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--lr", type=float, default=2e-5)
    p.add_argument("--max-len", type=int, default=256)
    p.add_argument("--max-train-samples", type=int, default=20000)
    p.add_argument("--max-val-samples", type=int, default=1000)
    p.add_argument("--unfreeze-n", type=int, default=2)
    p.add_argument("--output-dir", type=Path, default=Path("outputs_gen"))
    args = p.parse_args()

    train_rows = load_jsonl(args.data_root / f"{args.domain}_specialist" / "train.jsonl")[: args.max_train_samples]
    val_rows = load_jsonl(args.data_root / f"{args.domain}_specialist" / "val.jsonl")[: args.max_val_samples]
    if not train_rows:
        raise SystemExit("No train data found.")

    tok = get_tokenizer()
    model = GPT2LMHeadModel.from_pretrained("gpt2")
    model.config.pad_token_id = tok.eos_token_id

    # Freeze base first, then unfreeze last n blocks + lm_head.
    for param in model.parameters():
        param.requires_grad = False
    for block in model.transformer.h[-args.unfreeze_n:]:
        for param in block.parameters():
            param.requires_grad = True
    for param in model.lm_head.parameters():
        param.requires_grad = True

    train_ds = QADataset(train_rows, tok, args.max_len)
    val_ds = QADataset(val_rows, tok, args.max_len)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model = model.to(device)
    opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=args.lr)

    for epoch in range(1, args.epochs + 1):
        model.train()
        total = 0.0
        for ids, attn, labels in train_loader:
            ids, attn, labels = ids.to(device), attn.to(device), labels.to(device)
            out = model(input_ids=ids, attention_mask=attn, labels=labels)
            loss = out.loss
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += float(loss.item())
        train_loss = total / max(1, len(train_loader))

        model.eval()
        vtotal = 0.0
        with torch.no_grad():
            for ids, attn, labels in val_loader:
                ids, attn, labels = ids.to(device), attn.to(device), labels.to(device)
                out = model(input_ids=ids, attention_mask=attn, labels=labels)
                vtotal += float(out.loss.item())
        val_loss = vtotal / max(1, len(val_loader))
        print(f"Epoch {epoch}/{args.epochs} train_loss={train_loss:.4f} val_loss={val_loss:.4f}")

    out_dir = args.output_dir / f"{args.domain}_gpt2_gen"
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out_dir)
    tok.save_pretrained(out_dir)
    print(f"Saved generator to {out_dir}")


if __name__ == "__main__":
    main()
