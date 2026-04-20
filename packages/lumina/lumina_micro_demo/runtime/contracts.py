from dataclasses import dataclass


@dataclass(frozen=True)
class ContractSpec:
    contract: str
    confidence_threshold: float
    mode: str
    verifier: str
    description: str


PROMOTED_CONTRACTS: tuple[ContractSpec, ...] = (
    ContractSpec(
        contract="js_array_loop_to_map",
        confidence_threshold=0.30,
        mode="baseline_selective",
        verifier="verify_js_array_loop_to_map",
        description="Refactor a push-based array transform loop into one map assignment.",
    ),
    ContractSpec(
        contract="js_reduce_accumulator_refactor",
        confidence_threshold=0.40,
        mode="baseline_selective",
        verifier="verify_js_reduce_accumulator_refactor",
        description="Refactor a scalar accumulator loop into one reduce assignment.",
    ),
    ContractSpec(
        contract="js_reduce_object_index_builder",
        confidence_threshold=0.50,
        mode="baseline_selective",
        verifier="verify_js_reduce_object_index_builder",
        description="Refactor an object-index builder loop into one reduce assignment.",
    ),
)
