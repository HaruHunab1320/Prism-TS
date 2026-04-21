import subprocess
from dataclasses import dataclass
from typing import Protocol

from lumina_micro_specialists.evaluation.eval_js_array_loop_to_map import extract_code as extract_map_code
from lumina_micro_specialists.evaluation.eval_js_array_loop_to_map import strict_prompt as strict_map_prompt
from lumina_micro_specialists.evaluation.eval_js_reduce_accumulator_refactor import extract_code as extract_reduce_code
from lumina_micro_specialists.evaluation.eval_js_reduce_accumulator_refactor import strict_prompt as strict_reduce_prompt
from lumina_micro_specialists.evaluation.eval_js_reduce_object_index_builder import extract_code as extract_index_code
from lumina_micro_specialists.evaluation.eval_js_reduce_object_index_builder import strict_prompt as strict_index_prompt

from .executor import ContractContext, ExecutionResult, VERIFIERS, build_contract_context, execute_contract


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


class OllamaSpecialistBackend:
    def __init__(self, model: str = "llama3.1:latest") -> None:
        self.model = model

    def _run_ollama(self, prompt: str) -> str:
        proc = subprocess.run(
            ["ollama", "run", "--nowordwrap", self.model, prompt],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "ollama run failed")
        return proc.stdout.strip()

    def run(self, request: SpecialistRequest) -> ExecutionResult:
        context = build_contract_context(request.contract, request.input_code)
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
        return ExecutionResult(
            generated_code=candidate.strip(),
            verified=verified,
            syntax_valid=bool(verdict.syntax_valid),
            contract_marker_present=contract_marker_present,
            answer_confidence=1.0 if verified else 0.0,
            control_action="accepted" if verified else "fallback",
            details={
                "backend": "ollama",
                "model": self.model,
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
