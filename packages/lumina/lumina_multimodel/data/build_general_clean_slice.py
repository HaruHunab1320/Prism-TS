#!/usr/bin/env python3
"""
Build a stricter general-domain dataset slice with short canonical answers.

Input layout:
  <in_root>/general_specialist/{train,val}.jsonl

Output layout:
  <out_root>/general_specialist/{train,val}.jsonl
"""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Dict, List

import requests
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def load_jsonl(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def write_jsonl(path: Path, rows: List[Dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def strip_templates(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return s
    s = re.sub(r"```.*?```", " ", s, flags=re.DOTALL)
    s = re.sub(r"^\s*(answer|final answer)\s*[:=-]\s*", "", s, flags=re.IGNORECASE)
    s = re.split(r"\n", s, maxsplit=1)[0]
    s = re.split(r"[.!?;]", s, maxsplit=1)[0]
    s = re.sub(r"\s+", " ", s).strip()
    return s


def clean_general_answer(answer: str, max_words: int) -> str:
    s = strip_templates(answer)
    if not s:
        return ""
    words = s.split()
    if len(words) > max_words:
        words = words[:max_words]
    s = " ".join(words).strip()
    s = re.sub(r"^\W+|\W+$", "", s)
    return s


def valid_general_pair(question: str, answer: str, min_words: int, max_words: int) -> bool:
    q = normalize_text(question)
    a = normalize_text(answer)
    if not q or not a:
        return False
    if a == q:
        return False
    if "question:" in a or "answer:" in a:
        return False
    aw = len(a.split())
    if aw < min_words or aw > max_words:
        return False
    return True


class TeacherRewriter:
    def __init__(self, model_ref: str, device: str, max_new_tokens: int):
        self.tokenizer = AutoTokenizer.from_pretrained(model_ref)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        self.model = AutoModelForCausalLM.from_pretrained(model_ref)
        self.device = torch.device(device)
        self.model.to(self.device).eval()
        self.max_new_tokens = max_new_tokens

    def rewrite(self, question: str, answer: str) -> str:
        prompt = (
            "Rewrite the answer to be direct, factual, and <= 12 words.\n"
            f"Question: {question}\n"
            f"Answer: {answer}\n"
            "Rewritten answer:"
        )
        enc = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        input_ids = enc["input_ids"].to(self.device)
        attention_mask = enc["attention_mask"].to(self.device)
        with torch.no_grad():
            out = self.model.generate(
                input_ids=input_ids,
                attention_mask=attention_mask,
                do_sample=False,
                max_new_tokens=self.max_new_tokens,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        gen = out[0, input_ids.shape[1]:]
        return self.tokenizer.decode(gen, skip_special_tokens=True).strip()


class EndpointTeacherRewriter:
    def __init__(
        self,
        endpoint_url: str,
        model: str,
        api_key: str,
        max_new_tokens: int,
        timeout_s: int = 60,
    ):
        self.endpoint_url = endpoint_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.max_new_tokens = max_new_tokens
        self.timeout_s = timeout_s

    def rewrite(self, question: str, answer: str) -> str:
        prompt = (
            "Rewrite the answer to be direct, factual, and <= 12 words.\n"
            "Return only the rewritten answer.\n"
            f"Question: {question}\n"
            f"Answer: {answer}\n"
            "Rewritten answer:"
        )
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You produce concise factual rewrites."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0,
            "max_tokens": self.max_new_tokens,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        r = requests.post(
            self.endpoint_url,
            json=payload,
            headers=headers,
            timeout=self.timeout_s,
        )
        r.raise_for_status()
        body = r.json()
        return (
            body.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )


def clean_rows(
    rows: List[Dict],
    max_words: int,
    min_words: int,
    teacher: TeacherRewriter | EndpointTeacherRewriter | None = None,
    teacher_limit: int = 0,
) -> List[Dict]:
    out: List[Dict] = []
    seen = set()
    rewrites = 0

    for r in rows:
        q = str(r.get("question", "")).strip()
        a = str(r.get("answer", "")).strip()
        if not q or not a:
            continue

        if teacher is not None and (teacher_limit <= 0 or rewrites < teacher_limit):
            try:
                a = teacher.rewrite(q, a)
                rewrites += 1
            except Exception:
                pass

        a = clean_general_answer(a, max_words=max_words)
        if not valid_general_pair(q, a, min_words=min_words, max_words=max_words):
            continue

        key = (normalize_text(q), normalize_text(a))
        if key in seen:
            continue
        seen.add(key)
        out.append({"question": q, "answer": a, "domain": "general"})

    return out


def resolve_device(preferred: str) -> str:
    p = preferred.strip().lower()
    if p:
        return p
    return "mps" if torch.backends.mps.is_available() else "cpu"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--in-root", type=Path, required=True)
    p.add_argument("--out-root", type=Path, required=True)
    p.add_argument("--max-train", type=int, default=0)
    p.add_argument("--max-val", type=int, default=0)
    p.add_argument("--min-words", type=int, default=1)
    p.add_argument("--max-words", type=int, default=12)
    p.add_argument("--teacher-model", type=str, default="")
    p.add_argument("--teacher-device", type=str, default="")
    p.add_argument("--teacher-max-new-tokens", type=int, default=24)
    p.add_argument("--teacher-limit-train", type=int, default=0)
    p.add_argument("--teacher-limit-val", type=int, default=0)
    p.add_argument(
        "--teacher-endpoint-url",
        type=str,
        default="",
        help="OpenAI-compatible chat completions endpoint, e.g. https://api.moonshot.ai/v1/chat/completions",
    )
    p.add_argument(
        "--teacher-endpoint-model",
        type=str,
        default="moonshotai/Kimi-K2-Instruct",
        help="Model name used with --teacher-endpoint-url.",
    )
    p.add_argument(
        "--teacher-api-key-env",
        type=str,
        default="MOONSHOT_API_KEY",
        help="Environment variable containing API key for --teacher-endpoint-url.",
    )
    p.add_argument("--teacher-timeout-s", type=int, default=60)
    args = p.parse_args()

    teacher = None
    if args.teacher_endpoint_url:
        key = os.environ.get(args.teacher_api_key_env, "").strip()
        if not key:
            raise SystemExit(
                f"Missing API key in env var {args.teacher_api_key_env} for teacher endpoint."
            )
        teacher = EndpointTeacherRewriter(
            endpoint_url=args.teacher_endpoint_url,
            model=args.teacher_endpoint_model,
            api_key=key,
            max_new_tokens=args.teacher_max_new_tokens,
            timeout_s=args.teacher_timeout_s,
        )
    elif args.teacher_model:
        teacher = TeacherRewriter(
            model_ref=args.teacher_model,
            device=resolve_device(args.teacher_device),
            max_new_tokens=args.teacher_max_new_tokens,
        )

    train_in = load_jsonl(args.in_root / "general_specialist" / "train.jsonl")
    val_in = load_jsonl(args.in_root / "general_specialist" / "val.jsonl")

    if args.max_train > 0:
        train_in = train_in[: args.max_train]
    if args.max_val > 0:
        val_in = val_in[: args.max_val]

    train_out = clean_rows(
        train_in,
        max_words=args.max_words,
        min_words=args.min_words,
        teacher=teacher,
        teacher_limit=args.teacher_limit_train,
    )
    val_out = clean_rows(
        val_in,
        max_words=args.max_words,
        min_words=args.min_words,
        teacher=teacher,
        teacher_limit=args.teacher_limit_val,
    )

    write_jsonl(args.out_root / "general_specialist" / "train.jsonl", train_out)
    write_jsonl(args.out_root / "general_specialist" / "val.jsonl", val_out)
    print(f"general_clean train={len(train_out)} val={len(val_out)} -> {args.out_root}")


if __name__ == "__main__":
    main()
