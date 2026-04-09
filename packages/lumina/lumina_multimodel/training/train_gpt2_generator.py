#!/usr/bin/env python3
"""
Train a domain generator (GPT-2) for answer quality.
Supports merged or real-only datasets.
"""

import argparse
import json
import re
from pathlib import Path
from typing import List, Dict

import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoModelForCausalLM, AutoTokenizer
import os


def load_jsonl(path: Path) -> List[Dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def get_tokenizer(model_name: str):
    try:
        tok = AutoTokenizer.from_pretrained(model_name, local_files_only=True)
    except Exception:
        tok = AutoTokenizer.from_pretrained(model_name)
    tok.pad_token = tok.eos_token
    return tok


class QADataset(Dataset):
    def __init__(
        self,
        rows: List[Dict],
        tokenizer,
        max_len: int = 256,
        strict_answer: bool = False,
        strict_code_contract: bool = False,
        domain: str = "general",
    ):
        self.rows = rows
        self.tok = tokenizer
        self.max_len = max_len
        self.strict_answer = strict_answer
        self.strict_code_contract = strict_code_contract
        self.domain = domain

    def _prompt(self, question: str) -> str:
        if self.strict_code_contract and self.domain == "code":
            return (
                "You are a Python coding assistant. Return only valid Python code that solves the task. "
                "Write standard multi-line Python with normal indentation. "
                "Do not include explanations, markdown fences, example usage, or extra text.\n"
                f"Question: {question}\nAnswer:"
            )
        if self.strict_answer:
            if self.domain == "math":
                return f"Question: {question}\nAnswer (single number only):"
            return f"Question: {question}\nAnswer (short):"
        return f"Question: {question}\nAnswer:"

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, idx):
        r = self.rows[idx]
        prompt = self._prompt(r["question"])
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


def sample_quality(domain: str, question: str, answer: str) -> float:
    q = normalize_text(question)
    a = normalize_text(answer)
    if not a or not q:
        return 0.2
    if a == q:
        return 0.1
    if "question:" in a or "answer:" in a:
        return 0.2
    words = a.split()
    if domain == "math":
        # Math answers are often short numeric strings; do not downweight them.
        if re.fullmatch(r"[-+]?\d+(?:\.\d+)?", a):
            return 1.0
        if len(words) <= 3:
            return 0.9
        if len(words) > 24:
            return 0.5
        return 0.8
    if len(words) < 2:
        return 0.3
    if len(words) > 60:
        return 0.6
    return 1.0


def normalize_text(text: str) -> str:
    return " ".join(text.strip().lower().split())


def canonicalize_math_answer(answer: str) -> str:
    s = (answer or "").strip()
    if not s:
        return s
    # Prefer explicit final-answer patterns.
    m = re.search(r"(?:final answer|answer)\s*[:=]\s*([^\n]+)", s, flags=re.IGNORECASE)
    if m:
        s = m.group(1).strip()
    # Prefer a terminal numeric token when present.
    nums = re.findall(r"[-+]?\d+(?:\.\d+)?", s)
    if nums:
        return nums[-1]
    # Otherwise keep short tail span.
    parts = re.split(r"[.;\n]", s)
    s = parts[0].strip() if parts else s
    words = s.split()
    return " ".join(words[:8]).strip()


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
    # Auto-detect when DEVICE is not specified.
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def get_decoder_blocks(model):
    # GPT2-style
    if hasattr(model, "transformer") and hasattr(model.transformer, "h"):
        return model.transformer.h
    # Qwen/LLaMA-style
    if hasattr(model, "model") and hasattr(model.model, "layers"):
        return model.model.layers
    # Some architectures expose layers at top-level
    if hasattr(model, "layers"):
        return model.layers
    return []


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    p.add_argument("--real-root", type=Path, default=Path("datasets_real"))
    p.add_argument("--data-source", type=str, default="merged", choices=["merged", "real"])
    p.add_argument("--domain", type=str, required=True)
    p.add_argument("--epochs", type=int, default=1)
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--lr", type=float, default=2e-5)
    p.add_argument("--max-len", type=int, default=256)
    p.add_argument("--answer-max-tokens", type=int, default=0,
                   help="If >0, cap answer tokens used for loss to this many tokens.")
    p.add_argument("--max-train-samples", type=int, default=20000)
    p.add_argument("--max-val-samples", type=int, default=1000)
    p.add_argument("--unfreeze-n", type=int, default=2)
    p.add_argument("--output-dir", type=Path, default=Path("outputs_gen"))
    p.add_argument("--model-name", type=str, default="gpt2")
    p.add_argument("--quality-weighting", action="store_true",
                   help="Weight per-sample loss by a simple answer quality heuristic.")
    p.add_argument("--strict-answer", action="store_true",
                   help="Use a stricter prompt: 'Answer (short):' to bias short direct outputs.")
    p.add_argument("--strict-code-contract", action="store_true",
                   help="For code domain, train with the same strict code-only prompt shape as lumina_basic.")
    p.add_argument("--math-canonical-targets", action="store_true",
                   help="For math domain, train on canonical short answers (prefer numeric final answer).")
    args = p.parse_args()

    base_root = args.data_root if args.data_source == "merged" else args.real_root
    if args.data_source == "real" and (base_root / args.domain / "train.jsonl").exists():
        subdir = args.domain
    else:
        subdir = f"{args.domain}_specialist"

    train_rows = load_jsonl(base_root / subdir / "train.jsonl")[: args.max_train_samples]
    val_rows = load_jsonl(base_root / subdir / "val.jsonl")[: args.max_val_samples]
    if args.math_canonical_targets and args.domain == "math":
        for rows in (train_rows, val_rows):
            for r in rows:
                r["answer"] = canonicalize_math_answer(str(r.get("answer", "")))
    if not train_rows:
        raise SystemExit("No train data found.")

    tok = get_tokenizer(args.model_name)
    model = AutoModelForCausalLM.from_pretrained(args.model_name)
    model.config.pad_token_id = tok.eos_token_id

    # Freeze base first, then unfreeze last n decoder blocks + lm_head.
    for param in model.parameters():
        param.requires_grad = False
    blocks = get_decoder_blocks(model)
    if blocks:
        for block in blocks[-args.unfreeze_n:]:
            for param in block.parameters():
                param.requires_grad = True
    if hasattr(model, "lm_head"):
        for param in model.lm_head.parameters():
            param.requires_grad = True
    if not any(p.requires_grad for p in model.parameters()):
        raise SystemExit("No trainable parameters were selected.")

    train_ds = QADataset(
        train_rows, tok, args.max_len, strict_answer=args.strict_answer,
        strict_code_contract=args.strict_code_contract, domain=args.domain
    )
    val_ds = QADataset(
        val_rows, tok, args.max_len, strict_answer=args.strict_answer,
        strict_code_contract=args.strict_code_contract, domain=args.domain
    )
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False)

    device = resolve_device()
    model = model.to(device)
    opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=args.lr)
    if os.environ.get("REQUIRE_CUDA") == "1" and device.type != "cuda":
        raise SystemExit("CUDA required but not available")

    for epoch in range(1, args.epochs + 1):
        model.train()
        total = 0.0
        for ids, attn, labels in train_loader:
            ids, attn, labels = ids.to(device), attn.to(device), labels.to(device)
            if args.answer_max_tokens > 0:
                # Mask loss beyond the first N answer tokens.
                # Labels are already masked for prompt tokens; we only need to
                # cap the remaining answer span.
                for i in range(labels.size(0)):
                    answer_idx = (labels[i] != -100).nonzero(as_tuple=False).squeeze(-1)
                    if answer_idx.numel() > args.answer_max_tokens:
                        labels[i, answer_idx[args.answer_max_tokens:]] = -100
            out = model(input_ids=ids, attention_mask=attn, labels=labels)
            loss = out.loss
            if args.quality_weighting:
                # Compute per-sample quality weights on CPU for determinism.
                batch_q = []
                batch_a = []
                for i in range(ids.size(0)):
                    # Reconstruct prompt/answer text for weighting.
                    text = tok.decode(ids[i], skip_special_tokens=True)
                    if "Answer (short):" in text:
                        parts = text.split("Answer (short):", 1)
                        q = parts[0].replace("Question:", "").strip()
                        a = parts[1].strip()
                    elif "Answer:" in text:
                        parts = text.split("Answer:", 1)
                        q = parts[0].replace("Question:", "").strip()
                        a = parts[1].strip()
                    else:
                        q = ""
                        a = text
                    batch_q.append(q)
                    batch_a.append(a)
                weights = torch.tensor([sample_quality(args.domain, q, a) for q, a in zip(batch_q, batch_a)],
                                       dtype=loss.dtype, device=loss.device)
                loss = (loss * weights.mean())
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
                if args.answer_max_tokens > 0:
                    for i in range(labels.size(0)):
                        answer_idx = (labels[i] != -100).nonzero(as_tuple=False).squeeze(-1)
                        if answer_idx.numel() > args.answer_max_tokens:
                            labels[i, answer_idx[args.answer_max_tokens:]] = -100
                out = model(input_ids=ids, attention_mask=attn, labels=labels)
                vtotal += float(out.loss.item())
        val_loss = vtotal / max(1, len(val_loader))
        print(f"Epoch {epoch}/{args.epochs} train_loss={train_loss:.4f} val_loss={val_loss:.4f}")

    safe_model = args.model_name.replace("/", "_")
    out_dir = args.output_dir / f"{args.domain}_{safe_model}_gen"
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out_dir)
    tok.save_pretrained(out_dir)
    print(f"Saved generator to {out_dir}")


if __name__ == "__main__":
    main()
