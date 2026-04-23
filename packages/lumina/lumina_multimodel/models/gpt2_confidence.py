#!/usr/bin/env python3
"""
GPT-2 with Lumina confidence head.

- Base GPT-2 is frozen by default.
- Confidence head is trained to predict per-sample correctness + OOD.
"""

from dataclasses import dataclass
from typing import Dict

import torch
import torch.nn as nn
from transformers import GPT2LMHeadModel


@dataclass
class ConfidenceOutput:
    overall: torch.Tensor
    epistemic: torch.Tensor
    aleatoric: torch.Tensor
    distribution_shift: torch.Tensor


class GPT2WithConfidence(nn.Module):
    def __init__(self, model_name: str = "gpt2"):
        super().__init__()
        self.gpt2 = GPT2LMHeadModel.from_pretrained(model_name)
        hidden = self.gpt2.config.n_embd

        # Learnable temperature for confidence calibration
        self.conf_temp = nn.Parameter(torch.tensor(2.0))

        self.confidence_head = nn.Sequential(
            nn.LayerNorm(hidden),
            nn.Linear(hidden, hidden // 2),
            nn.GELU(),
            nn.Linear(hidden // 2, 4),
            nn.Sigmoid(),
        )

    def freeze_base(self):
        for p in self.gpt2.parameters():
            p.requires_grad = False

    def unfreeze_last_n(self, n: int = 1):
        # Unfreeze final n transformer blocks and lm_head
        if hasattr(self.gpt2, "transformer"):
            blocks = self.gpt2.transformer.h
            for blk in blocks[-n:]:
                blk.requires_grad_(True)
        if hasattr(self.gpt2, "lm_head"):
            for p in self.gpt2.lm_head.parameters():
                p.requires_grad = True

    def forward(self, input_ids, attention_mask=None, labels=None):
        outputs = self.gpt2(input_ids=input_ids, attention_mask=attention_mask, labels=labels, output_hidden_states=True)
        hidden = outputs.hidden_states[-1]  # [B, T, H]

        # Mean-pool hidden states
        pooled = hidden.mean(dim=1)
        conf = self.confidence_head(pooled)

        # Apply temperature to overall + distribution shift (avoid in-place ops)
        overall = torch.sigmoid(torch.logit(conf[:, 0].clamp(1e-5, 1 - 1e-5)) / self.conf_temp)
        ood = torch.sigmoid(torch.logit(conf[:, 3].clamp(1e-5, 1 - 1e-5)) / self.conf_temp)
        conf = torch.stack([overall, conf[:, 1], conf[:, 2], ood], dim=1)

        confidence = {
            "overall": conf[:, 0],
            "epistemic": conf[:, 1],
            "aleatoric": conf[:, 2],
            "distribution_shift": conf[:, 3],
        }

        return outputs, confidence
