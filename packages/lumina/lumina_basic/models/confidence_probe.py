from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List

import torch
from torch import nn


class ConfidenceProbe(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 16) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x).squeeze(-1)


@dataclass
class ProbeBundle:
    probe: ConfidenceProbe
    mean: torch.Tensor
    std: torch.Tensor

    def predict_prob(self, feature_vector: List[float]) -> float:
        x = torch.tensor(feature_vector, dtype=torch.float32)
        x = (x - self.mean) / self.std
        with torch.no_grad():
            logit = self.probe(x.unsqueeze(0))[0]
            return torch.sigmoid(logit).item()


def save_probe(path: Path, probe: ConfidenceProbe, mean: torch.Tensor, std: torch.Tensor, metadata: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": probe.state_dict(),
            "input_dim": mean.numel(),
            "hidden_dim": probe.net[0].out_features,
            "mean": mean.cpu(),
            "std": std.cpu(),
            "metadata": metadata,
        },
        path,
    )


def load_probe(path: Path, map_location: str = "cpu") -> ProbeBundle:
    payload = torch.load(path, map_location=map_location)
    probe = ConfidenceProbe(
        input_dim=int(payload["input_dim"]),
        hidden_dim=int(payload.get("hidden_dim", 16)),
    )
    probe.load_state_dict(payload["state_dict"])
    probe.eval()
    mean = payload["mean"].float()
    std = payload["std"].float()
    return ProbeBundle(probe=probe, mean=mean, std=std)
