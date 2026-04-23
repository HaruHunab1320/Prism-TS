from dataclasses import dataclass


@dataclass(frozen=True)
class ContractSpec:
    contract: str
    confidence_threshold: float
    mode: str
    verifier: str
    description: str
    base_model_family: str
    adapter_name: str


PROMOTED_CONTRACTS: tuple[ContractSpec, ...] = (
    ContractSpec(
        contract="js_array_loop_to_map",
        confidence_threshold=0.30,
        mode="baseline_selective",
        verifier="verify_js_array_loop_to_map",
        description="Refactor a push-based array transform loop into one map assignment.",
        base_model_family="shared_js_refactor_base",
        adapter_name="adapter_js_array_loop_to_map_v1",
    ),
    ContractSpec(
        contract="js_reduce_accumulator_refactor",
        confidence_threshold=0.40,
        mode="baseline_selective",
        verifier="verify_js_reduce_accumulator_refactor",
        description="Refactor a scalar accumulator loop into one reduce assignment.",
        base_model_family="shared_js_refactor_base",
        adapter_name="adapter_js_reduce_accumulator_refactor_v1",
    ),
    ContractSpec(
        contract="js_reduce_object_index_builder",
        confidence_threshold=0.50,
        mode="baseline_selective",
        verifier="verify_js_reduce_object_index_builder",
        description="Refactor an object-index builder loop into one reduce assignment.",
        base_model_family="shared_js_refactor_base",
        adapter_name="adapter_js_reduce_object_index_builder_v1",
    ),
)

CONTRACT_SPECS = {spec.contract: spec for spec in PROMOTED_CONTRACTS}


def get_contract_spec(contract: str) -> ContractSpec | None:
    return CONTRACT_SPECS.get(contract)
