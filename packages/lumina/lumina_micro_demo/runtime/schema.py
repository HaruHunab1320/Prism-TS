from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class SourceSpan:
    start_line: int
    end_line: int


@dataclass
class StepCandidate:
    contract: str
    route_confidence: float
    reason: str


@dataclass
class StepTrace:
    step_id: str
    source_span: SourceSpan
    input_code: str
    selected_contract: str | None
    selected_threshold: float | None
    selected_mode: str | None
    selected_adapter: str | None = None
    candidates: list[StepCandidate] = field(default_factory=list)
    action: str = "unresolved"
    verifier: str | None = None
    generated_code: str | None = None
    verified: bool = False
    threshold_passed: bool | None = None
    answer_confidence: float | None = None
    control_action: str | None = None
    verification_details: dict[str, Any] = field(default_factory=dict)
    latency_ms: float | None = None
    notes: list[str] = field(default_factory=list)


@dataclass
class DemoTrace:
    prompt: str
    language: str
    source_code: str
    steps: list[StepTrace]
    final_status: str
    final_output_code: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
