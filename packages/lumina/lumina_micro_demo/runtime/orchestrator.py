from .planner import extract_transform_blocks
from .router import choose_contract, route_block
from .schema import DemoTrace, SourceSpan, StepTrace
from .specialists import MockSpecialistBackend, SpecialistBackend, SpecialistRequest


def _compose_final_output(source_code: str, steps: list[StepTrace]) -> str:
    lines = source_code.splitlines()
    replacements = {
        (step.source_span.start_line, step.source_span.end_line): step.generated_code
        for step in steps
        if step.verified and step.generated_code
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


def build_demo_trace(prompt: str, source_code: str, backend: SpecialistBackend | None = None) -> DemoTrace:
    backend = backend or MockSpecialistBackend()
    blocks = extract_transform_blocks(source_code)
    steps: list[StepTrace] = []
    for idx, block in enumerate(blocks, start=1):
        candidates = route_block(prompt, block.code)
        selected_contract, threshold, mode, verifier = choose_contract(candidates)
        notes: list[str] = []
        action = "fallback"
        generated_code = None
        verified = False
        answer_confidence = None
        control_action = None
        verification_details: dict[str, object] = {}
        if selected_contract:
            result = backend.run(SpecialistRequest(contract=selected_contract, input_code=block.code))
            generated_code = result.generated_code
            verified = result.verified
            answer_confidence = result.answer_confidence
            control_action = result.control_action
            verification_details = result.details
            notes.extend(result.notes)
            if not verified:
                notes.append("Specialist output failed verification; keeping original block.")
            action = "accepted" if result.verified else "fallback"
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
                candidates=candidates,
                action=action,
                verifier=verifier,
                generated_code=generated_code,
                verified=verified,
                answer_confidence=answer_confidence,
                control_action=control_action,
                verification_details=verification_details,
                notes=notes,
            )
        )
    final_output_code = _compose_final_output(source_code, steps) if steps else source_code
    final_status = "completed" if steps and all(step.action == "accepted" for step in steps) else "partial"
    if not steps:
        final_status = "no_transform_blocks_found"
    metadata = {
        "num_steps": len(steps),
        "num_routed": sum(1 for step in steps if step.selected_contract),
        "num_accepted": sum(1 for step in steps if step.action == "accepted"),
        "num_fallback": sum(1 for step in steps if step.action == "fallback"),
        "backend": backend.__class__.__name__,
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
