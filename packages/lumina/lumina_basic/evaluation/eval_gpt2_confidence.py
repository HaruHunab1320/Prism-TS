#!/usr/bin/env python3
"""
Evaluate GPT-2 + Lumina confidence head.
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List

import numpy as np
import torch
from transformers import GPT2Tokenizer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models.gpt2_confidence import GPT2WithConfidence


def load_jsonl(path: Path) -> List[Dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def compute_ece(confidences, correctness, n_bins=15):
    confidences = np.array(confidences)
    correctness = np.array(correctness, dtype=float)
    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (confidences > bins[i]) & (confidences <= bins[i + 1])
        if mask.sum() > 0:
            ece += mask.sum() * abs(confidences[mask].mean() - correctness[mask].mean())
    return ece / len(confidences)

def apply_temperature(conf, temp):
    conf = np.clip(conf, 1e-5, 1 - 1e-5)
    return 1 / (1 + np.exp(-np.log(conf / (1 - conf)) / temp))


def token_f1(pred: str, gold: str) -> float:
    pred_tokens = pred.lower().split()
    gold_tokens = gold.lower().split()
    if not pred_tokens or not gold_tokens:
        return 0.0
    common = set(pred_tokens) & set(gold_tokens)
    if not common:
        return 0.0
    precision = len(common) / len(pred_tokens)
    recall = len(common) / len(gold_tokens)
    return (2 * precision * recall) / (precision + recall)

def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())

def numeric_match(pred: str, gold: str) -> bool:
    pred_nums = re.findall(r"-?\d+(?:\.\d+)?", pred)
    gold_nums = re.findall(r"-?\d+(?:\.\d+)?", gold)
    return bool(set(pred_nums) & set(gold_nums))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", type=Path, default=Path("datasets_merged"))
    parser.add_argument("--domain", type=str, default="general")
    parser.add_argument("--max-samples", type=int, default=500)
    parser.add_argument("--weights", type=Path, default=Path("outputs_gpt2/general_gpt2_confidence.pt"))
    parser.add_argument("--temperature", type=Path, default=None,
                        help="Optional JSON file with temperature to calibrate confidence")
    args = parser.parse_args()

    val_path = args.data_root / f"{args.domain}_specialist" / "val.jsonl"
    data = load_jsonl(val_path)

    # Force include OOD
    ood = [s for s in data if s.get("category") == "ood"]
    non_ood = [s for s in data if s.get("category") != "ood"]
    target_ood = min(len(ood), max(1, args.max_samples // 5))
    samples = ood[:target_ood] + non_ood[: args.max_samples - target_ood]

    try:
        tokenizer = GPT2Tokenizer.from_pretrained("gpt2", local_files_only=True)
    except Exception:
        tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    tokenizer.pad_token = tokenizer.eos_token

    model = GPT2WithConfidence("gpt2")
    model.load_state_dict(torch.load(args.weights, map_location="cpu"))
    model.eval()

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model.to(device)

    confidences = []
    correctness = []
    f1_scores = []
    overlap_scores = []
    weak_correct = []
    target_conf = []
    ood_scores = []
    ood_labels = []

    for s in samples:
        q = s["question"]
        a = s["answer"]
        input_text = f"Question: {q}\nAnswer:"
        enc = tokenizer(input_text, truncation=True, max_length=256, return_tensors="pt")
        input_ids = enc["input_ids"].to(device)
        attention_mask = enc["attention_mask"].to(device)

        # Generate answer (greedy)
        with torch.no_grad():
            gen = model.gpt2.generate(
                input_ids=input_ids,
                attention_mask=attention_mask,
                max_new_tokens=64,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id,
            )
            # Compute confidence on generated sequence
            gen_attention = torch.ones_like(gen)
            outputs, conf = model(input_ids=gen, attention_mask=gen_attention, labels=None)

        # Decode generated answer
        gen_text = tokenizer.decode(gen[0], skip_special_tokens=True)
        gen_answer = gen_text.split("Answer:", 1)[-1].strip()

        # Exact match correctness
        is_correct = gen_answer.strip() == a.strip()
        f1 = token_f1(gen_answer, a)
        f1_scores.append(f1)
        overlap_scores.append(1.0 if f1 > 0.0 else 0.0)

        # Weak correctness: substring or numeric overlap
        gen_norm = normalize_text(gen_answer)
        gold_norm = normalize_text(a)
        weak = 1.0 if (gold_norm in gen_norm or numeric_match(gen_answer, a)) else 0.0
        weak_correct.append(weak)

        # Teacher-forced NLL on gold answer as a continuous target
        full_text = f"{input_text} {a}"
        enc_gold = tokenizer(full_text, truncation=True, max_length=256, padding="max_length", return_tensors="pt")
        gold_ids = enc_gold["input_ids"].to(device)
        gold_mask = enc_gold["attention_mask"].to(device)
        boundary = len(tokenizer.encode(input_text, truncation=True, max_length=256))
        ans_mask = torch.zeros_like(enc_gold["input_ids"][0]).float()
        ans_mask[max(0, boundary - 1):] = 1
        with torch.no_grad():
            out_gold = model.gpt2(input_ids=gold_ids, attention_mask=gold_mask)
            logits_gold = out_gold.logits
            log_probs = torch.log_softmax(logits_gold, dim=-1)
            target_lp = log_probs.gather(-1, gold_ids.unsqueeze(-1)).squeeze(-1)
            nll = -(target_lp * ans_mask.to(device)).sum() / ans_mask.sum().clamp(min=1.0)
            target_conf.append(float(torch.exp(-nll).item()))

        confidences.append(float(conf["overall"].mean().item()))
        correctness.append(float(is_correct))

        ood_scores.append(float(conf["distribution_shift"].mean().item()))
        ood_labels.append(1.0 if s.get("category") == "ood" else 0.0)

    ece = None
    post_ece = None
    if args.temperature and args.temperature.exists():
        t = json.loads(args.temperature.read_text()).get("temperature", 1.0)
        cal_conf = apply_temperature(np.array(confidences), t).tolist()
        if len(set(correctness)) >= 2:
            post_ece = compute_ece(cal_conf, correctness)
    if len(set(correctness)) >= 2:
        ece = compute_ece(confidences, correctness)
    avg_conf = float(np.mean(confidences))
    mse_target = float(np.mean((np.array(confidences) - np.array(target_conf)) ** 2))
    mse_target_cal = None
    if args.temperature and args.temperature.exists():
        t = json.loads(args.temperature.read_text()).get("temperature", 1.0)
        cal_conf = apply_temperature(np.array(confidences), t)
        mse_target_cal = float(np.mean((cal_conf - np.array(target_conf)) ** 2))

    # AUROC
    from sklearn.metrics import roc_auc_score
    auroc = roc_auc_score(ood_labels, ood_scores) if len(set(ood_labels)) > 1 else 0.5

    if ece is not None:
        print(f"ECE (raw): {ece:.4f}")
        if post_ece is not None:
            print(f"ECE (calibrated): {post_ece:.4f}")
    else:
        print("ECE: undefined (no positive correctness labels)")
    print(f"Avg confidence: {avg_conf:.2%}")
    print(f"MSE to target_conf (raw): {mse_target:.4f}")
    if mse_target_cal is not None:
        print(f"MSE to target_conf (calibrated): {mse_target_cal:.4f}")
    print(f"OOD AUROC: {auroc:.4f}")

    # Save calibration data for post-hoc temperature scaling
    out = {
        "confidences": confidences,
        "correct": correctness,
        "f1": f1_scores,
        "overlap": overlap_scores,
        "weak_correct": weak_correct,
        "target_conf": target_conf,
    }
    with open("outputs_gpt2/calibration_data.json", "w") as f:
        json.dump(out, f)


if __name__ == "__main__":
    main()
