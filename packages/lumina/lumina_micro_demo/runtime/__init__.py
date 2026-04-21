"""Runtime scaffold for the local Lumina micro-specialist demo."""

from .contracts import PROMOTED_CONTRACTS
from .orchestrator import build_demo_trace
from .schema import DemoTrace, StepCandidate, StepTrace
from .specialists import (
    MockSpecialistBackend,
    OllamaSpecialistBackend,
    SharedBaseOllamaBackend,
    SpecialistBackend,
    SpecialistRequest,
)

__all__ = [
    "PROMOTED_CONTRACTS",
    "build_demo_trace",
    "DemoTrace",
    "StepCandidate",
    "StepTrace",
    "MockSpecialistBackend",
    "OllamaSpecialistBackend",
    "SharedBaseOllamaBackend",
    "SpecialistBackend",
    "SpecialistRequest",
]
