from dataclasses import dataclass
from typing import Protocol

from .executor import ExecutionResult, execute_contract


@dataclass(frozen=True)
class SpecialistRequest:
    contract: str
    input_code: str


class SpecialistBackend(Protocol):
    def run(self, request: SpecialistRequest) -> ExecutionResult:
        ...


class MockSpecialistBackend:
    """Contract-matched stand-in for the future shared-base adapter runtime."""

    def run(self, request: SpecialistRequest) -> ExecutionResult:
        return execute_contract(request.contract, request.input_code)
