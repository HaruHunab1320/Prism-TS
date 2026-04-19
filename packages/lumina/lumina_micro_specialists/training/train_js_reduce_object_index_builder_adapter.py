import argparse
import json
from pathlib import Path

import torch
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer


def load_jsonl(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def get_tokenizer(model_name: str):
    try:
        tok = AutoTokenizer.from_pretrained(model_name, local_files_only=True)
    except Exception:
        tok = AutoTokenizer.from_pretrained(model_name)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    return tok


def resolve_device() -> torch.device:
    import os

    value = os.environ.get("DEVICE", "").strip().lower()
    if value == "cuda":
        if not torch.cuda.is_available():
            raise SystemExit("DEVICE=cuda requested but CUDA is not available.")
        return torch.device("cuda")
    if value == "mps":
        if not torch.backends.mps.is_available():
            raise SystemExit("DEVICE=mps requested but MPS is not available.")
        return torch.device("mps")
    if value == "cpu":
        return torch.device("cpu")
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def get_decoder_blocks(model):
    if hasattr(model, "transformer") and hasattr(model.transformer, "h"):
        return model.transformer.h
    if hasattr(model, "model") and hasattr(model.model, "layers"):
        return model.model.layers
    if hasattr(model, "layers"):
        return model.layers
    return []


class ContractDataset(Dataset):
    def __init__(self, rows, tokenizer, max_len: int = 384):
        self.rows = rows
        self.tok = tokenizer
        self.max_len = max_len

    @staticmethod
    def prompt(row: dict) -> str:
        output_name = row["expected_output_var"]
        array_name = row["expected_array_var"]
        return (
            "You are a JavaScript refactoring specialist. "
            "Return only valid JavaScript. "
            "Preserve behavior. "
            "Use Array.prototype.reduce. "
            "Build an object index. "
            f"Return exactly one statement assigning to `{output_name}`. "
            f"Use `{array_name}.reduce(...)`. "
            "Return the accumulator object. "
            "Do not include explanations or markdown fences.\n"
            f"{row['question']}\nAnswer:"
        )

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, idx):
        row = self.rows[idx]
        prompt = self.prompt(row)
        full = f"{prompt} {row['answer']}"
        enc = self.tok(
            full,
            truncation=True,
            max_length=self.max_len + 1,
            padding="max_length",
            return_tensors="pt",
        )
        ids = enc["input_ids"][0]
        attn = enc["attention_mask"][0]
        labels = ids.clone()
        boundary = len(self.tok.encode(prompt, truncation=True, max_length=self.max_len))
        labels[: max(0, boundary - 1)] = -100
        labels[attn == 0] = -100
        return ids, attn, labels


def evaluate_loss(model, loader, device):
    model.eval()
    total = 0.0
    with torch.no_grad():
        for ids, attn, labels in loader:
            ids, attn, labels = ids.to(device), attn.to(device), labels.to(device)
            out = model(input_ids=ids, attention_mask=attn, labels=labels)
            total += float(out.loss.item())
    return total / max(1, len(loader))


def main():
    p = argparse.ArgumentParser(description="Train a contract-matched adapter-style uplift for js_reduce_object_index_builder.")
    p.add_argument("--data-root", type=Path, default=Path("lumina_micro_specialists/data/datasets/js_reduce_object_index_builder_v1"))
    p.add_argument("--model-name", default="Qwen/Qwen2.5-Coder-1.5B-Instruct")
    p.add_argument("--epochs", type=int, default=2)
    p.add_argument("--batch-size", type=int, default=2)
    p.add_argument("--lr", type=float, default=8e-6)
    p.add_argument("--max-len", type=int, default=384)
    p.add_argument("--max-train-samples", type=int, default=320)
    p.add_argument("--max-val-samples", type=int, default=64)
    p.add_argument("--unfreeze-n", type=int, default=2)
    p.add_argument("--output-dir", type=Path, default=Path("lumina_micro_specialists/outputs"))
    p.add_argument("--metrics-json", type=Path, default=None)
    args = p.parse_args()

    train_rows = load_jsonl(args.data_root / "train.jsonl")[: args.max_train_samples]
    val_rows = load_jsonl(args.data_root / "val.jsonl")[: args.max_val_samples]
    if not train_rows:
        raise SystemExit("No training rows found.")

    tok = get_tokenizer(args.model_name)
    model = AutoModelForCausalLM.from_pretrained(args.model_name)
    model.config.pad_token_id = tok.eos_token_id

    for param in model.parameters():
        param.requires_grad = False
    blocks = get_decoder_blocks(model)
    if blocks:
        for block in blocks[-args.unfreeze_n :]:
            for param in block.parameters():
                param.requires_grad = True
    if hasattr(model, "lm_head"):
        for param in model.lm_head.parameters():
            param.requires_grad = True

    train_ds = ContractDataset(train_rows, tok, max_len=args.max_len)
    val_ds = ContractDataset(val_rows, tok, max_len=args.max_len)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False)

    device = resolve_device()
    model = model.to(device)
    opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=args.lr)

    history = []
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
        val_loss = evaluate_loss(model, val_loader, device)
        history.append({"epoch": epoch, "train_loss": train_loss, "val_loss": val_loss})
        print(f"Epoch {epoch}/{args.epochs} train_loss={train_loss:.4f} val_loss={val_loss:.4f}")

    safe_model = args.model_name.replace("/", "_")
    out_dir = args.output_dir / f"js_reduce_object_index_builder_{safe_model}_gen"
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out_dir)
    tok.save_pretrained(out_dir)

    metrics = {
        "task_contract": "js_reduce_object_index_builder",
        "model_name": args.model_name,
        "output_dir": str(out_dir),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "lr": args.lr,
        "history": history,
    }
    if args.metrics_json:
        args.metrics_json.parent.mkdir(parents=True, exist_ok=True)
        args.metrics_json.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
