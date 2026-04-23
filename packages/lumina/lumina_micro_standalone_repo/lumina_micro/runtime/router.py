from lumina_micro.contracts.router_js_array_loop_to_map import route_js_array_loop_to_map
from lumina_micro.contracts.router_js_reduce_accumulator_refactor import (
    route_js_reduce_accumulator_refactor,
)
from lumina_micro.contracts.router_js_reduce_object_index_builder import (
    route_js_reduce_object_index_builder,
)

from .contracts import PROMOTED_CONTRACTS
from .schema import StepCandidate


def route_block(prompt: str, code: str) -> list[StepCandidate]:
    decisions = [
        route_js_array_loop_to_map(prompt, code),
        route_js_reduce_accumulator_refactor(prompt, code),
        route_js_reduce_object_index_builder(prompt, code),
    ]
    candidates = [
        StepCandidate(contract=d.route, route_confidence=d.route_confidence, reason=d.reason)
        for d in decisions
    ]
    return sorted(candidates, key=lambda c: c.route_confidence, reverse=True)


def choose_contract(candidates: list[StepCandidate]) -> tuple[str | None, float | None, str | None, str | None]:
    promoted = {spec.contract: spec for spec in PROMOTED_CONTRACTS}
    for candidate in candidates:
        spec = promoted.get(candidate.contract)
        if spec is None:
            continue
        return spec.contract, spec.confidence_threshold, spec.mode, spec.verifier
    return None, None, None, None
