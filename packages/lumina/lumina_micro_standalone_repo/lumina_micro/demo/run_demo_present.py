import argparse
from pathlib import Path

from lumina_micro.runtime.orchestrator import build_demo_trace
from lumina_micro.runtime.specialists import MockSpecialistBackend, OllamaSpecialistBackend


def _make_backend(name: str, model: str, keepalive: str):
    if name == "mock":
        return MockSpecialistBackend()
    return OllamaSpecialistBackend(model, keepalive)


def _fmt_confidence(value: float | None) -> str:
    return "-" if value is None else f"{value:.2f}"


def _fmt_threshold(value: float | None) -> str:
    return "-" if value is None else f"{value:.2f}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a presentation-oriented Lumina micro demo.")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--backend", choices=["mock", "ollama"], default="mock")
    parser.add_argument("--ollama-model", default="llama3.1:latest")
    parser.add_argument("--ollama-keepalive", default="5m")
    args = parser.parse_args()

    source_path = Path(args.input)
    source_code = source_path.read_text(encoding="utf-8")
    backend = _make_backend(args.backend, args.ollama_model, args.ollama_keepalive)
    trace = build_demo_trace(args.prompt, source_code, backend=backend)

    print("Lumina Micro Demo")
    print("=================")
    print(f"Prompt: {trace.prompt}")
    print(f"Backend: {trace.metadata.get('backend')}")
    if args.backend == "ollama":
        print(f"Model: {args.ollama_model}")
    print(f"Status: {trace.final_status}")
    print(
        "Summary: "
        f"steps={trace.metadata.get('num_steps')} "
        f"accepted={trace.metadata.get('num_accepted')} "
        f"fallback={trace.metadata.get('num_fallback')} "
        f"threshold_rejected={trace.metadata.get('num_threshold_rejected')} "
        f"total_latency_ms={trace.metadata.get('total_latency_ms', 0.0):.1f}"
    )
    print()
    print("Input")
    print("-----")
    print(source_code.rstrip())
    print()
    print("Execution")
    print("---------")
    for step in trace.steps:
        latency_str = f"{step.latency_ms:.1f}" if step.latency_ms is not None else "-"
        print(
            f"{step.step_id}: lines {step.source_span.start_line}-{step.source_span.end_line} "
            f"-> {step.selected_contract or 'fallback'}"
        )
        print(
            "  "
            f"action={step.action} "
            f"adapter={step.selected_adapter or '-'} "
            f"confidence={_fmt_confidence(step.answer_confidence)} "
            f"threshold={_fmt_threshold(step.selected_threshold)} "
            f"threshold_passed={step.threshold_passed if step.threshold_passed is not None else '-'} "
            f"latency_ms={latency_str}"
        )
        if step.generated_code:
            print(f"  generated: {step.generated_code}")
        for note in step.notes:
            print(f"  note: {note}")
    print()
    print("Final Output")
    print("------------")
    print((trace.final_output_code or "").rstrip())


if __name__ == "__main__":
    main()
