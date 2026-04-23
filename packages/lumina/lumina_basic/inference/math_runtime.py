from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from lumina_basic.evaluation.eval_math_confidence import (
    extract_math_final_answer,
    math_contract_features,
    math_escalation_prompt,
    math_prompt,
)
from lumina_basic.models.answer_metadata import build_math_answer_metadata
from lumina_basic.models.confidence_model import Candidate, LuminaBasicModel
from lumina_basic.models.confidence_probe import ProbeBundle, load_probe


PROMOTED_FT_MODEL = Path("lumina_multimodel/outputs_gen/math_Qwen_Qwen2.5-Math-1.5B-Instruct_gen")
PROMOTED_V2_PROBE = Path("lumina_multimodel/outputs_gen/lumina_basic_qwen_math_probe_v2_stability.pt")
PROMOTED_V2_PROBE_FALLBACK = Path("lumina_multimodel/outputs_gen/lumina_basic_qwen_math_probe_v2_on_ft.pt")
BASE_MODEL = "Qwen/Qwen2.5-Math-1.5B-Instruct"


def default_math_model() -> str:
    if PROMOTED_FT_MODEL.is_dir():
        return str(PROMOTED_FT_MODEL)
    return BASE_MODEL


def default_math_confidence_head() -> Optional[str]:
    if PROMOTED_V2_PROBE.is_file():
        return str(PROMOTED_V2_PROBE)
    if PROMOTED_V2_PROBE_FALLBACK.is_file():
        return str(PROMOTED_V2_PROBE_FALLBACK)
    return None


def _score_candidate(
    cand: Candidate,
    probe_bundle: Optional[ProbeBundle],
    use_math_contract_features: bool,
) -> Candidate:
    if not probe_bundle:
        return cand
    feature_vector = list(cand.feature_vector)
    if use_math_contract_features:
        feature_vector += math_contract_features(cand.answer)
    cand.confidence = probe_bundle.predict_prob(feature_vector)
    return cand


@dataclass
class MathRuntimeResult:
    status: str
    answer: str
    normalized_answer: str
    answer_confidence: float
    metadata: Dict[str, Any]
    debug: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "answer": self.answer,
            "normalized_answer": self.normalized_answer,
            "answer_confidence": self.answer_confidence,
            "metadata": self.metadata,
            "debug": self.debug,
        }


def answer_math_question(
    question: str,
    *,
    model_name: Optional[str] = None,
    confidence_head: Optional[str] = None,
    num_conf_heads: int = 3,
    max_new_tokens: int = 24,
    answer_conf_threshold: float = 0.20,
    escalate_threshold: float = 0.35,
    seed: int = 7,
    use_math_contract_features: bool = True,
) -> MathRuntimeResult:
    answer_model = model_name or default_math_model()
    confidence_model = confidence_head or default_math_confidence_head()
    model = LuminaBasicModel(model_name=answer_model, num_conf_heads=num_conf_heads)
    probe_bundle = load_probe(Path(confidence_model)) if confidence_model else None

    base = _score_candidate(
        model.generate_candidate(
            prompt=math_prompt(question),
            max_new_tokens=max_new_tokens,
            seed=seed,
            branch_id="base",
        ),
        probe_bundle,
        use_math_contract_features,
    )

    escalation_attempted = base.confidence < escalate_threshold
    selected = base
    escalated = None

    if escalation_attempted:
        escalated = _score_candidate(
            model.generate_candidate(
                prompt=math_escalation_prompt(question),
                max_new_tokens=max_new_tokens,
                seed=seed + 10000,
                branch_id="escalate",
            ),
            probe_bundle,
            use_math_contract_features,
        )
        selected = escalated if escalated.confidence >= base.confidence else base

    normalized = extract_math_final_answer(selected.answer)
    answered = bool(selected.answer.strip()) and selected.confidence >= answer_conf_threshold
    status = "answer" if answered else "abstain"

    metadata = build_math_answer_metadata(
        answer_confidence=selected.confidence,
        control_threshold=answer_conf_threshold,
        escalate_threshold=escalate_threshold,
        selected_path=selected.branch_id,
        answer_model=answer_model,
        confidence_model=confidence_model,
        math_contract_features=use_math_contract_features,
        control_mode="escalation_selective",
        escalation_attempted=escalation_attempted,
    ).to_dict()

    debug = {
        "base_answer": base.answer,
        "base_confidence": base.confidence,
        "escalated_answer": escalated.answer if escalated else "",
        "escalated_confidence": escalated.confidence if escalated else None,
    }

    return MathRuntimeResult(
        status=status,
        answer=selected.answer if answered else "",
        normalized_answer=normalized if answered else "",
        answer_confidence=selected.confidence,
        metadata=metadata,
        debug=debug,
    )
