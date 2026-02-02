#!/usr/bin/env python3
"""
Minimal end-to-end aggregator prototype:
1) Hybrid route scores (router + confidence)
2) Query top-k experts
3) Aggregate by agreement + score
"""

import argparse
import json
import re
import random
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Tuple

import torch
from transformers import GPT2Tokenizer, GPT2LMHeadModel

from models.gpt2_confidence import GPT2WithConfidence
from training.train_router import TinyRouterClassifier, load_jsonl


def normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def token_f1(pred: str, gold: str) -> float:
    p = normalize_text(pred).split()
    g = normalize_text(gold).split()
    if not p or not g:
        return 0.0
    common = set(p) & set(g)
    if not common:
        return 0.0
    precision = len(common) / len(p)
    recall = len(common) / len(g)
    return 2 * precision * recall / (precision + recall)


def numeric_match(pred: str, gold: str) -> bool:
    pred_nums = re.findall(r"-?\d+(?:\.\d+)?", pred)
    gold_nums = re.findall(r"-?\d+(?:\.\d+)?", gold)
    return bool(set(pred_nums) & set(gold_nums))


def extract_answer(text: str) -> str:
    if "Answer:" in text:
        text = text.split("Answer:", 1)[-1]
    # Stop if model starts a new turn/template.
    text = re.split(r"\n(?:Question:|Q:|User:|Assistant:)", text, maxsplit=1)[0]
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return " ".join(lines[:2]).strip()


def answer_quality(answer: str, question: str) -> float:
    a = normalize_text(answer)
    q = normalize_text(question)
    if not a:
        return 0.0
    if a == q:
        return 0.0
    if len(a.split()) < 2:
        return 0.25
    if "question:" in a or "answer:" in a:
        return 0.2
    return 1.0


def domain_score(pred: str, gold: str, domain: str) -> float:
    pred_n = normalize_text(pred)
    gold_n = normalize_text(gold)
    base = token_f1(pred_n, gold_n)
    if domain == "math":
        if numeric_match(pred, gold):
            return max(base, 0.7)
    if domain == "code":
        return max(base, SequenceMatcher(None, pred_n, gold_n).ratio())
    return base


def get_tokenizer():
    try:
        tok = GPT2Tokenizer.from_pretrained("gpt2", local_files_only=True)
    except Exception:
        tok = GPT2Tokenizer.from_pretrained("gpt2")
    tok.pad_token = tok.eos_token
    return tok


def load_generator_model(model_ref: str):
    try:
        return GPT2LMHeadModel.from_pretrained(model_ref, local_files_only=True)
    except Exception:
        return GPT2LMHeadModel.from_pretrained(model_ref)


def prompt_conf(model, tokenizer, question, device):
    input_text = f"Question: {question}\nAnswer:"
    enc = tokenizer(input_text, truncation=True, max_length=256, return_tensors="pt")
    input_ids = enc["input_ids"].to(device)
    mask = enc["attention_mask"].to(device)
    with torch.no_grad():
        _, conf = model(input_ids=input_ids, attention_mask=mask, labels=None)
    return float(conf["overall"].mean().item())


def generate_answer(gen_model, conf_model, tokenizer, question, device, max_new_tokens=48):
    input_text = f"Question: {question}\nAnswer:"
    enc = tokenizer(input_text, truncation=True, max_length=256, return_tensors="pt")
    input_ids = enc["input_ids"].to(device)
    mask = enc["attention_mask"].to(device)

    with torch.no_grad():
        gen = gen_model.generate(
            input_ids=input_ids,
            attention_mask=mask,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )
        outputs, conf = conf_model(input_ids=gen, attention_mask=torch.ones_like(gen), labels=None)
        _ = outputs  # keep API parity

    text = tokenizer.decode(gen[0], skip_special_tokens=True)
    answer = extract_answer(text)
    return answer, float(conf["overall"].mean().item())


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
    parser.add_argument("--generator-model", type=str, default="gpt2",
                        help="HF causal LM used for generation (shared across domains by default).")
    parser.add_argument("--generator-domain-weights", nargs="+", default=None,
                        help="Optional per-domain generator weights (same order as --domains).")
    parser.add_argument("--max-samples", type=int, default=120)
    parser.add_argument("--max-new-tokens", type=int, default=48)
    parser.add_argument("--alpha", type=float, default=0.7)
    parser.add_argument("--top-k", type=int, default=2)
    parser.add_argument("--agree-threshold", type=float, default=0.7)
    parser.add_argument("--abstain-threshold", type=float, default=0.55)
    parser.add_argument("--conflict-margin", type=float, default=0.05)
    parser.add_argument("--oracle-mode", action="store_true",
                        help="Use gold target_conf as candidate quality (diagnostic upper-bound for routing+aggregation).")
    parser.add_argument("--debug-dump", type=Path, default=None,
                        help="Optional path to write per-sample debug JSONL.")
    parser.add_argument("--debug-limit", type=int, default=20)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if len(args.domains) != len(args.weights):
        raise SystemExit("domains and weights must be the same length")
    random.seed(args.seed)

    per_domain = max(1, args.max_samples // len(args.domains))
    samples: List[Tuple[str, Dict]] = []
    for d in args.domains:
        rows = load_jsonl(args.data_root / f"{d}_specialist" / "val.jsonl")
        random.shuffle(rows)
        for r in rows[:per_domain]:
            samples.append((d, r))
    random.shuffle(samples)

    tokenizer = get_tokenizer()
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

    # Load experts
    experts = []
    for w in args.weights:
        m = GPT2WithConfidence("gpt2")
        m.load_state_dict(torch.load(Path(w), map_location="cpu"))
        m.eval().to(device)
        experts.append(m)

    # Load generation models (kept separate from confidence experts).
    generators = []
    if args.generator_domain_weights is not None:
        if len(args.generator_domain_weights) != len(args.domains):
            raise SystemExit("generator-domain-weights must match domains length")
        for gw in args.generator_domain_weights:
            g = load_generator_model(gw)
            g.eval().to(device)
            generators.append(g)
    else:
        shared = load_generator_model(args.generator_model)
        shared.eval().to(device)
        generators = [shared for _ in args.domains]

    # Load router
    with args.router_labels.open() as f:
        inv_map = json.load(f)
    label_map = {v: int(k) for k, v in inv_map.items()}
    router = TinyRouterClassifier(len(tokenizer), args.router_hidden_size, len(label_map), 0.1).to(device)
    router.load_state_dict(torch.load(args.router_weights, map_location="cpu"))
    router.eval()

    route_correct = 0
    em = 0
    f1_total = 0.0
    task_score_total = 0.0
    task_success = 0
    abstained = 0
    agreed = 0
    debug_rows = []

    for true_domain, sample in samples:
        q = sample["question"]
        gold = sample["answer"]

        # Hybrid route scores
        confs = [prompt_conf(m, tokenizer, q, device) for m in experts]
        enc = tokenizer(q, truncation=True, max_length=128, padding="max_length", return_tensors="pt")
        with torch.no_grad():
            probs = torch.softmax(router(enc["input_ids"].to(device), enc["attention_mask"].to(device)), dim=-1)[0].cpu().tolist()
        router_scores = [probs[label_map[d]] for d in args.domains]
        hybrid_scores = [args.alpha * router_scores[i] + (1 - args.alpha) * confs[i] for i in range(len(args.domains))]

        ranked = sorted(range(len(hybrid_scores)), key=lambda i: hybrid_scores[i], reverse=True)
        top = ranked[: max(1, args.top_k)]
        routed_domain = args.domains[top[0]]
        route_correct += 1 if routed_domain == true_domain else 0

        # Query top-k experts
        candidates = []
        for idx in top:
            answer, ans_conf = generate_answer(
                generators[idx], experts[idx], tokenizer, q, device, max_new_tokens=args.max_new_tokens
            )
            oracle_tc = target_conf(experts[idx], tokenizer, q, gold, device)
            candidates.append({
                "idx": idx,
                "domain": args.domains[idx],
                "answer": answer,
                "score": hybrid_scores[idx],
                "ans_conf": ans_conf,
                "quality": answer_quality(answer, q),
                "oracle_target_conf": oracle_tc,
            })

        # Minimal aggregator: agreement-aware selection
        final = candidates[0]
        if len(candidates) > 1:
            overlap = token_f1(candidates[0]["answer"], candidates[1]["answer"])
            if overlap >= args.agree_threshold:
                agreed += 1
                if args.oracle_mode:
                    final = max(candidates, key=lambda c: (c["score"] + 0.30 * c["oracle_target_conf"]))
                else:
                    final = max(candidates, key=lambda c: (c["score"] + 0.05 * c["ans_conf"] + 0.10 * c["quality"]))
            else:
                margin = candidates[0]["score"] - candidates[1]["score"]
                if (
                    candidates[0]["score"] < args.abstain_threshold
                    and margin < args.conflict_margin
                ) or max(c["quality"] for c in candidates) < 0.3:
                    abstained += 1
                    continue
                if args.oracle_mode:
                    final = max(candidates, key=lambda c: (c["score"] + 0.30 * c["oracle_target_conf"]))
                else:
                    final = max(candidates, key=lambda c: (c["score"] + 0.10 * c["quality"]))

        pred = normalize_text(final["answer"])
        gold_n = normalize_text(gold)
        em += 1 if pred == gold_n else 0
        f1_total += token_f1(pred, gold_n)
        ds = domain_score(final["answer"], gold, true_domain)
        task_score_total += ds
        task_success += 1 if ds >= 0.7 else 0

        if args.debug_dump is not None and len(debug_rows) < args.debug_limit:
            debug_rows.append({
                "true_domain": true_domain,
                "question": q,
                "gold": gold,
                "routed_domain": routed_domain,
                "candidates": candidates,
                "selected": final,
                "domain_score": ds,
            })

    n = max(1, len(samples))
    answered = n - abstained
    print(f"Samples: {n}")
    print(f"Route accuracy: {route_correct / n:.3f}")
    print(f"Aggregation EM (answered): {(em / max(1, answered)):.3f}")
    print(f"Aggregation F1 (answered): {(f1_total / max(1, answered)):.3f}")
    print(f"Aggregation task score (answered): {(task_score_total / max(1, answered)):.3f}")
    print(f"Task success@0.7 (answered): {(task_success / max(1, answered)):.3f}")
    print(f"Abstain rate: {abstained / n:.3f}")
    print(f"Agreement rate (top-2): {agreed / n:.3f}")
    if args.oracle_mode:
        print("Mode: ORACLE (diagnostic)")

    if args.debug_dump is not None:
        args.debug_dump.parent.mkdir(parents=True, exist_ok=True)
        with args.debug_dump.open("w") as f:
            for row in debug_rows:
                f.write(json.dumps(row) + "\n")
        print(f"Debug dump: {args.debug_dump}")


if __name__ == "__main__":
    main()
