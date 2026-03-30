from __future__ import annotations

from dataclasses import dataclass
import math
import random
import re
from typing import List

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def normalize_answer(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^a-z0-9 ]", "", text)
    return text


@dataclass
class GenerationStats:
    avg_logprob: float
    avg_entropy: float
    answer_len: int


@dataclass
class Candidate:
    answer: str
    stats: GenerationStats
    head_confidences: List[float]
    confidence: float
    branch_id: str


class LuminaBasicModel:
    """
    Minimal single-model prototype with multi-head confidence estimates.

    Heads here are deterministic confidence transforms over generation stats.
    This keeps the smoke pipeline fast and dependency-light while preserving
    the key behavior needed for branching policy tests.
    """

    def __init__(
        self,
        model_name: str = "gpt2",
        num_conf_heads: int = 3,
        device: str | None = None,
    ) -> None:
        self.model_name = model_name
        self.num_conf_heads = num_conf_heads
        self.tokenizer = self._load_tokenizer(model_name)
        self.tokenizer.pad_token = self.tokenizer.eos_token
        self.model = self._load_model(model_name)
        self.device = torch.device(device) if device else self._auto_device()
        self.model.to(self.device).eval()

    @staticmethod
    def _load_tokenizer(model_name: str):
        try:
            return AutoTokenizer.from_pretrained(model_name, local_files_only=True)
        except Exception:
            return AutoTokenizer.from_pretrained(model_name)

    @staticmethod
    def _load_model(model_name: str):
        try:
            return AutoModelForCausalLM.from_pretrained(model_name, local_files_only=True)
        except Exception:
            return AutoModelForCausalLM.from_pretrained(model_name)

    @staticmethod
    def _auto_device() -> torch.device:
        if torch.cuda.is_available():
            return torch.device("cuda")
        if torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")

    def _head_confidence(self, stats: GenerationStats, head_idx: int) -> float:
        # Signal basis:
        # - higher avg_logprob => higher confidence
        # - lower entropy => higher confidence
        # - very short/very long answers penalized mildly
        lp = stats.avg_logprob
        ent = stats.avg_entropy
        length_penalty = 0.0
        if stats.answer_len < 3:
            length_penalty = 0.15
        elif stats.answer_len > 60:
            length_penalty = 0.10

        # Slightly different affine heads.
        alpha = 0.9 + 0.1 * head_idx
        beta = 1.0 + 0.05 * head_idx
        raw = 1.6 + alpha * lp - beta * ent - length_penalty
        conf = 1.0 / (1.0 + math.exp(-raw))
        return _clamp01(conf)

    def generate_candidate(
        self,
        prompt: str,
        max_new_tokens: int = 40,
        temperature: float = 0.8,
        top_p: float = 0.95,
        seed: int | None = None,
        branch_id: str = "b0",
    ) -> Candidate:
        if seed is not None:
            torch.manual_seed(seed)
            random.seed(seed)

        enc = self.tokenizer(prompt, return_tensors="pt")
        input_ids = enc.input_ids.to(self.device)
        attention_mask = enc.attention_mask.to(self.device)
        with torch.no_grad():
            out = self.model.generate(
                input_ids=input_ids,
                attention_mask=attention_mask,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=temperature,
                top_p=top_p,
                return_dict_in_generate=True,
                output_scores=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        generated_ids = out.sequences[0, input_ids.shape[1]:]
        answer = self.tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

        if len(out.scores) == 0:
            stats = GenerationStats(avg_logprob=-10.0, avg_entropy=10.0, answer_len=0)
        else:
            logprobs = []
            entropies = []
            for step_scores, tok_id in zip(out.scores, generated_ids):
                step_log_probs = torch.log_softmax(step_scores[0], dim=-1)
                tok_lp = step_log_probs[tok_id].item()
                step_probs = torch.softmax(step_scores[0], dim=-1)
                entropy = -(step_probs * step_log_probs).sum().item()
                logprobs.append(tok_lp)
                entropies.append(entropy)
            stats = GenerationStats(
                avg_logprob=float(sum(logprobs) / max(len(logprobs), 1)),
                avg_entropy=float(sum(entropies) / max(len(entropies), 1)),
                answer_len=len(answer.split()),
            )

        head_confidences = [self._head_confidence(stats, i) for i in range(self.num_conf_heads)]
        confidence = float(sum(head_confidences) / max(len(head_confidences), 1))
        return Candidate(
            answer=answer,
            stats=stats,
            head_confidences=head_confidences,
            confidence=confidence,
            branch_id=branch_id,
        )
