from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, Optional


CONFIDENCE_DEFINITION = "P(final answer is correct | prompt, model state, produced answer)"


@dataclass
class AnswerConfidenceMetadata:
    schema_version: str
    task_contract: str
    domain: str
    confidence_mode: str
    confidence_definition: str
    answer_confidence: float
    control_mode: str
    control_action: str
    control_threshold: float
    escalate_threshold: Optional[float]
    escalation_attempted: bool
    selected_path: str
    answer_model: str
    confidence_model: Optional[str]
    math_contract_features: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def build_math_answer_metadata(
    *,
    answer_confidence: float,
    control_threshold: float,
    escalate_threshold: Optional[float],
    selected_path: str,
    answer_model: str,
    confidence_model: Optional[str],
    math_contract_features: bool,
    control_mode: str = "escalation_selective",
    escalation_attempted: bool = False,
) -> AnswerConfidenceMetadata:
    if control_mode == "baseline_selective":
        control_action = "answer" if answer_confidence >= control_threshold else "abstain"
    elif control_mode == "escalation_selective":
        if escalation_attempted and selected_path == "escalate":
            control_action = "escalate"
        else:
            control_action = "answer" if answer_confidence >= control_threshold else "abstain"
    else:
        raise ValueError(f"Unsupported control_mode: {control_mode}")

    return AnswerConfidenceMetadata(
        schema_version="lumina.answer_confidence.v1",
        task_contract="math_final_answer_v1",
        domain="math",
        confidence_mode="correctness_estimate",
        confidence_definition=CONFIDENCE_DEFINITION,
        answer_confidence=float(answer_confidence),
        control_mode=control_mode,
        control_action=control_action,
        control_threshold=float(control_threshold),
        escalate_threshold=float(escalate_threshold) if escalate_threshold is not None else None,
        escalation_attempted=bool(escalation_attempted),
        selected_path=selected_path,
        answer_model=answer_model,
        confidence_model=confidence_model,
        math_contract_features=bool(math_contract_features),
    )
