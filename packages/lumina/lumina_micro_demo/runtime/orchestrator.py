from .planner import extract_transform_blocks
from .router import choose_contract, route_block
from .schema import DemoTrace, SourceSpan, StepTrace


def build_demo_trace(prompt: str, source_code: str) -> DemoTrace:
    blocks = extract_transform_blocks(source_code)
    steps: list[StepTrace] = []
    for idx, block in enumerate(blocks, start=1):
        candidates = route_block(prompt, block.code)
        selected_contract, threshold, mode, verifier = choose_contract(candidates)
        action = "route_to_specialist" if selected_contract else "fallback"
        notes = []
        if not selected_contract:
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
                notes=notes,
            )
        )
    final_status = "ready_for_execution" if steps else "no_transform_blocks_found"
    metadata = {
        "num_steps": len(steps),
        "num_routed": sum(1 for step in steps if step.selected_contract),
        "num_fallback": sum(1 for step in steps if not step.selected_contract),
    }
    return DemoTrace(
        prompt=prompt,
        language="javascript",
        source_code=source_code,
        steps=steps,
        final_status=final_status,
        metadata=metadata,
    )
