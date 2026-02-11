#!/usr/bin/env python3
"""
Train a lightweight router classifier on router dataset.
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict, Tuple

import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader
from transformers import GPT2Tokenizer


def load_jsonl(path: Path) -> List[Dict]:
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


def build_label_map(rows: List[Dict]) -> Tuple[Dict[str, int], Dict[int, str]]:
    domains = sorted({r["domain"] for r in rows})
    to_id = {d: i for i, d in enumerate(domains)}
    to_domain = {i: d for d, i in to_id.items()}
    return to_id, to_domain


class RouterDataset(Dataset):
    def __init__(self, rows: List[Dict], tokenizer: GPT2Tokenizer, label_map: Dict[str, int], max_len: int):
        self.rows = rows
        self.tokenizer = tokenizer
        self.label_map = label_map
        self.max_len = max_len

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, idx: int):
        r = self.rows[idx]
        enc = self.tokenizer(
            r["query"],
            truncation=True,
            max_length=self.max_len,
            padding="max_length",
            return_tensors="pt",
        )
        input_ids = enc["input_ids"][0]
        attn = enc["attention_mask"][0]
        label = self.label_map[r["domain"]]
        weight = float(r.get("routing_confidence", 1.0))
        return input_ids, attn, label, weight


class TinyRouterClassifier(nn.Module):
    def __init__(self, vocab_size: int, hidden_size: int, num_domains: int, dropout: float):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, hidden_size)
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_size, hidden_size)
        self.act = nn.ReLU()
        self.fc2 = nn.Linear(hidden_size, num_domains)

    def forward(self, input_ids, attn_mask):
        x = self.embed(input_ids)
        mask = attn_mask.unsqueeze(-1).float()
        pooled = (x * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1.0)
        x = self.dropout(self.act(self.fc1(pooled)))
        return self.fc2(x)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-len", type=int, default=128)
    parser.add_argument("--hidden-size", type=int, default=256)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--output-dir", type=Path, default=Path("outputs_router"))
    args = parser.parse_args()

    train_rows = load_jsonl(args.data_root / "router" / "train.jsonl")
    val_rows = load_jsonl(args.data_root / "router" / "val.jsonl")
    if not train_rows:
        raise SystemExit("router/train.jsonl not found or empty")

    tokenizer = get_tokenizer()
    label_map, inv_map = build_label_map(train_rows)

    train_ds = RouterDataset(train_rows, tokenizer, label_map, args.max_len)
    val_ds = RouterDataset(val_rows, tokenizer, label_map, args.max_len) if val_rows else None

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size) if val_ds else None

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model = TinyRouterClassifier(len(tokenizer), args.hidden_size, len(label_map), args.dropout).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr)
    loss_fn = nn.CrossEntropyLoss(reduction="none")

    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        for input_ids, attn, label, weight in train_loader:
            input_ids = input_ids.to(device)
            attn = attn.to(device)
            label = label.to(device)
            weight = weight.float().to(device)

            logits = model(input_ids, attn)
            loss = loss_fn(logits, label)
            loss = (loss * weight).mean()
            opt.zero_grad()
            loss.backward()
            opt.step()
            total_loss += loss.item()

        avg_loss = total_loss / max(1, len(train_loader))
        print(f"Epoch {epoch}/{args.epochs} loss={avg_loss:.4f}")

        if val_loader:
            model.eval()
            correct = 0
            total = 0
            with torch.no_grad():
                for input_ids, attn, label, _ in val_loader:
                    input_ids = input_ids.to(device)
                    attn = attn.to(device)
                    label = label.to(device)
                    logits = model(input_ids, attn)
                    preds = torch.argmax(logits, dim=-1)
                    correct += (preds == label).sum().item()
                    total += label.numel()
            acc = correct / max(1, total)
            print(f"  val_acc={acc:.3f}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), args.output_dir / "router.pt")
    with (args.output_dir / "labels.json").open("w") as f:
        json.dump(inv_map, f, indent=2)
    with (args.output_dir / "config.json").open("w") as f:
        json.dump(
            {
                "hidden_size": args.hidden_size,
                "dropout": args.dropout,
                "max_len": args.max_len,
            },
            f,
            indent=2,
        )
    print(f"Saved to {args.output_dir}")


if __name__ == "__main__":
    main()
