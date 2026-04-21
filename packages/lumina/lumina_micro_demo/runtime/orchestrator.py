import time

from .contracts import get_contract_spec
from .planner import extract_transform_blocks
from .router import choose_contract, route_block
from .schema import DemoTrace, SourceSpan, StepTrace
from .specialists import MockSpecialistBackend, SpecialistBackend, SpecialistRequest


def _compose_final_output(source_code: str, steps: list[StepTrace]) -> str:
    lines = source_code.splitlines()
    replacements = {
        (step.source_span.start_line, step.source_span.end_line): step.generated_code
        for step in steps
        if step.verified and step.threshold_passed and step.generated_code
    }
    out_lines: list[str] = []
    line_no = 1
    while line_no <= len(lines):
        matched = False
        for (start, end), generated_code in replacements.items():
            if line_no == start:
                out_lines.extend(generated_code.splitlines())
                line_no = end + 1
                matched = True
                break
        if matched:
            continue
        out_lines.append(lines[line_no - 1])
        line_no += 1
    return "\n".join(out_lines) + ("\n" if source_code.endswith("\n") else "")


def _selected_route_confidence(selected_contract: str | None, candidates) -> float:
    if not selected_contract:
        return 0.0
    for candidate in candidates:
        if candidate.contract == selected_contract:
            return candidate.route_confidence
    return 0.0


def build_demo_trace(prompt: str, source_code: str, backend: SpecialistBackend | None = None) -> DemoTrace:
    backend = backend or MockSpecialistBackend()
    start_total = time.perf_counter()
    blocks = extract_transform_blocks(source_code)
    steps: list[StepTrace] = []
    for idx, block in enumerate(blocks, start=1):
        candidates = route_block(prompt, block.code)
        selected_contract, threshold, mode, verifier = choose_contract(candidates)
        spec = get_contract_spec(selected_contract) if selected_contract else None
        route_confidence = _selected_route_confidence(selected_contract, candidates)
        notes: list[str] = []
        action = "fallback"
        generated_code = None
        verified = False
        threshold_passed = None
        answer_confidence = None
        control_action = None
        verification_details: dict[str, object] = {}
        latency_ms = None
        if selected_contract:
            step_start = time.perf_counter()
            result = backend.run(
                SpecialistRequest(
                    contract=selected_contract,
                    input_code=block.code,
                    route_confidence=route_confidence,
                )
            )
            latency_ms = (time.perf_counter() - step_start) * 1000.0
            generated_code = result.generated_code
            verified = result.verified
            answer_confidence = result.answer_confidence
            control_action = result.control_action
            verification_details = result.details
            notes.extend(result.notes)
            threshold_passed = bool(answer_confidence is not None and threshold is not None and answer_confidence >= threshold)
            if verified and not threshold_passed:
                notes.append("Specialist output passed verification but did not clear the contract threshold; keeping original block.")
            if not verified:
                notes.append("Specialist output failed verification; keeping original block.")
            action = "accepted" if (verified and threshold_passed) else "fallback"
        else:
            notes.append("No promoted contract matched strongly enough.")
        steps.append(
            StepTrace(
                step_id=f"step_{idx}",
                source_span=SourceSpan(start_line=block.start_line, end_line=block.end_line),
                input_code=block.code,
                selected_contract=selected_contract,
                selected_threshold=threshold,
                selected_mode=mode,
                selected_adapter=spec.adapter_name if spec else None,
                candidates=candidates,
                action=action,
                verifier=verifier,
                generated_code=generated_code,
                verified=verified,
                threshold_passed=threshold_passed,
                answer_confidence=answer_confidence,
                control_action=control_action,
                verification_details=verification_details,
                latency_ms=latency_ms,
                notes=notes,
            )
        )
    final_output_code = _compose_final_output(source_code, steps) if steps else source_code
    final_status = "completed" if steps and all(step.action == "accepted" for step in steps) else "partial"
    if not steps:
        final_status = "no_transform_blocks_found"
    total_latency_ms = (time.perf_counter() - start_total) * 1000.0
    metadata = {
        "num_steps": len(steps),
        "num_routed": sum(1 for step in steps if step.selected_contract),
        "num_accepted": sum(1 for step in steps if step.action == "accepted"),
        "num_fallback": sum(1 for step in steps if step.action == "fallback"),
        "num_threshold_rejected": sum(1 for step in steps if step.verified and step.threshold_passed is False),
        "backend": backend.__class__.__name__,
        "total_latency_ms": total_latency_ms,
    }
    return DemoTrace(
        prompt=prompt,
        language="javascript",
        source_code=source_code,
        steps=steps,
        final_status=final_status,
        final_output_code=final_output_code,
        metadata=metadata,
    )
