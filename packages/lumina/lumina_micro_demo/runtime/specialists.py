import subprocess
from dataclasses import dataclass
from typing import Protocol

from lumina_micro_demo.runtime.contracts import get_contract_spec
from lumina_micro_specialists.evaluation.eval_js_array_loop_to_map import (
    contract_feature_vector as map_feature_vector,
)
from lumina_micro_specialists.evaluation.eval_js_array_loop_to_map import extract_code as extract_map_code
from lumina_micro_specialists.evaluation.eval_js_array_loop_to_map import heuristic_confidence as map_heuristic_confidence
from lumina_micro_specialists.evaluation.eval_js_array_loop_to_map import strict_prompt as strict_map_prompt
from lumina_micro_specialists.evaluation.eval_js_reduce_accumulator_refactor import (
    contract_feature_vector as reduce_feature_vector,
)
from lumina_micro_specialists.evaluation.eval_js_reduce_accumulator_refactor import (
    extract_code as extract_reduce_code,
)
from lumina_micro_specialists.evaluation.eval_js_reduce_accumulator_refactor import (
    heuristic_confidence as reduce_heuristic_confidence,
)
from lumina_micro_specialists.evaluation.eval_js_reduce_accumulator_refactor import (
    strict_prompt as strict_reduce_prompt,
)
from lumina_micro_specialists.evaluation.eval_js_reduce_object_index_builder import (
    contract_feature_vector as index_feature_vector,
)
from lumina_micro_specialists.evaluation.eval_js_reduce_object_index_builder import (
    extract_code as extract_index_code,
)
from lumina_micro_specialists.evaluation.eval_js_reduce_object_index_builder import (
    heuristic_confidence as index_heuristic_confidence,
)
from lumina_micro_specialists.evaluation.eval_js_reduce_object_index_builder import (
    strict_prompt as strict_index_prompt,
)

from .executor import ContractContext, ExecutionResult, VERIFIERS, build_contract_context, execute_contract


@dataclass(frozen=True)
class SpecialistRequest:
    contract: str
    input_code: str
    route_confidence: float


class SpecialistBackend(Protocol):
    def run(self, request: SpecialistRequest) -> ExecutionResult:
        ...


def _score_candidate(contract: str, route_confidence: float, row: dict, candidate: str, verdict) -> float:
    if contract == "js_array_loop_to_map":
        return map_heuristic_confidence(map_feature_vector(row, candidate, route_confidence, verdict))
    if contract == "js_reduce_accumulator_refactor":
        return reduce_heuristic_confidence(reduce_feature_vector(row, candidate, route_confidence, verdict))
    return index_heuristic_confidence(index_feature_vector(row, candidate, route_confidence, verdict))


class MockSpecialistBackend:
    """Contract-matched stand-in for the future shared-base adapter runtime."""

    def run(self, request: SpecialistRequest) -> ExecutionResult:
        result = execute_contract(request.contract, request.input_code)
        spec = get_contract_spec(request.contract)
        if spec:
            result.details.setdefault("runtime", {})
            result.details["runtime"].update(
                {
                    "base_model_family": spec.base_model_family,
                    "adapter_name": spec.adapter_name,
                    "route_confidence": request.route_confidence,
                    "backend": "shared_base_mock",
                }
            )
        if result.generated_code and result.verified:
            verifier = VERIFIERS[request.contract]
            row = result.details.get("verifier_row", {})
            verdict = verifier(result.generated_code, row)
            result.answer_confidence = _score_candidate(
                request.contract,
                request.route_confidence,
                row,
                result.generated_code,
                verdict,
            )
        return result


class SharedBaseOllamaBackend:
    def __init__(self, model: str = "llama3.1:latest", keepalive: str = "5m") -> None:
        self.model = model
        self.keepalive = keepalive

    def _run_ollama(self, prompt: str) -> str:
        proc = subprocess.run(
            ["ollama", "run", "--nowordwrap", "--keepalive", self.keepalive, self.model, prompt],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "ollama run failed")
        return proc.stdout.strip()

    def run(self, request: SpecialistRequest) -> ExecutionResult:
        context = build_contract_context(request.contract, request.input_code)
        spec = get_contract_spec(request.contract)
        if context is None:
            return ExecutionResult(None, False, False, False, 0.0, "fallback", {}, ["Could not synthesize verifier inputs from source block."])
        try:
            raw = self._run_ollama(self._strict_prompt(request.contract, context))
        except Exception as exc:
            return ExecutionResult(None, False, False, False, 0.0, "fallback", {}, [f"Ollama backend failed: {exc}"])
        candidate = self._postprocess_candidate(self._extract_candidate(request.contract, raw, context), context)
        verifier = VERIFIERS[request.contract]
        verdict = verifier(candidate, context.verifier_row)
        contract_marker_present = bool(getattr(verdict, "uses_map", getattr(verdict, "uses_reduce", False)))
        verified = bool(verdict.passed)
        confidence = _score_candidate(request.contract, request.route_confidence, context.verifier_row, candidate, verdict)
        return ExecutionResult(
            generated_code=candidate.strip(),
            verified=verified,
            syntax_valid=bool(verdict.syntax_valid),
            contract_marker_present=contract_marker_present,
            answer_confidence=confidence,
            control_action="accepted" if verified else "fallback",
            details={
                "backend": "shared_base_ollama",
                "model": self.model,
                "base_model_family": spec.base_model_family if spec else None,
                "adapter_name": spec.adapter_name if spec else None,
                "route_confidence": request.route_confidence,
                "raw_output": raw,
                "verifier_row": context.verifier_row,
                "verification": {
                    "syntax_valid": verdict.syntax_valid,
                    "contract_marker_present": contract_marker_present,
                    "passed": verdict.passed,
                    "details": verdict.details,
                },
            },
            notes=[] if verified else ["Ollama output failed verification; keeping original block."],
        )

    def _strict_prompt(self, contract: str, context: ContractContext) -> str:
        row = context.verifier_row
        if contract == "js_array_loop_to_map":
            return strict_map_prompt(row["prompt"])
        if contract == "js_reduce_accumulator_refactor":
            return strict_reduce_prompt(row)
        return strict_index_prompt(row)

    def _postprocess_candidate(self, candidate: str, context: ContractContext) -> str:
        row = context.verifier_row
        expected_var = row.get("expected_output_var", "")
        cleaned = candidate.strip().strip("`").strip()
        if expected_var and cleaned.startswith(f"{expected_var} ="):
            cleaned = f"const {cleaned}"
        has_binding = cleaned.startswith(("const ", "let ", "var "))
        if expected_var and not has_binding and (".map(" in cleaned or ".reduce(" in cleaned):
            cleaned = f"const {expected_var} = {cleaned.rstrip(';')};"
        return cleaned

    def _extract_candidate(self, contract: str, raw: str, context: ContractContext) -> str:
        row = context.verifier_row
        if contract == "js_array_loop_to_map":
            return extract_map_code(raw)
        if contract == "js_reduce_accumulator_refactor":
            return extract_reduce_code(raw, row)
        return extract_index_code(raw, row)


OllamaSpecialistBackend = SharedBaseOllamaBackend
