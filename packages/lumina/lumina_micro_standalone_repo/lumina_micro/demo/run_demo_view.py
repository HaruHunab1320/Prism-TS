import argparse
from pathlib import Path

from lumina_micro.runtime.orchestrator import build_demo_trace
from lumina_micro.runtime.specialists import MockSpecialistBackend, OllamaSpecialistBackend


def _fmt_conf(value: float | None) -> str:
    if value is None:
        return "-"
    return f"{value:.2f}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a readable Lumina micro demo trace.")
    parser.add_argument("--prompt", required=True, help="User prompt for the demo request.")
    parser.add_argument("--input", required=True, help="Path to a JavaScript source file.")
    parser.add_argument("--backend", choices=["mock", "ollama"], default="mock")
    parser.add_argument("--ollama-model", default="llama3.1:latest")
    parser.add_argument("--ollama-keepalive", default="5m")
    args = parser.parse_args()

    source_code = Path(args.input).read_text(encoding="utf-8")
    backend = MockSpecialistBackend() if args.backend == "mock" else OllamaSpecialistBackend(args.ollama_model, args.ollama_keepalive)
    trace = build_demo_trace(args.prompt, source_code, backend=backend)

    print("Lumina Micro Demo")
    print(f"status: {trace.final_status}")
    print(f"backend: {trace.metadata.get('backend')}")
    print(f"steps: {trace.metadata.get('num_steps')} accepted={trace.metadata.get('num_accepted')} fallback={trace.metadata.get('num_fallback')}")
    print(f"threshold_rejected: {trace.metadata.get('num_threshold_rejected')}")
    print(f"total_latency_ms: {trace.metadata.get('total_latency_ms', 0.0):.1f}")
    print()
    print("Step Trace")
    for step in trace.steps:
        print(f"- {step.step_id} lines {step.source_span.start_line}-{step.source_span.end_line}")
        print(f"  contract: {step.selected_contract or 'fallback'}")
        print(f"  adapter: {step.selected_adapter or '-'}")
        print(f"  action: {step.action}")
        print(f"  threshold: {step.selected_threshold if step.selected_threshold is not None else '-'}")
        print(f"  threshold_passed: {step.threshold_passed if step.threshold_passed is not None else '-'}")
        print(f"  confidence: {_fmt_conf(step.answer_confidence)}")
        print(f"  latency_ms: {step.latency_ms:.1f}" if step.latency_ms is not None else "  latency_ms: -")
        if step.generated_code:
            print(f"  generated: {step.generated_code}")
        if step.notes:
            for note in step.notes:
                print(f"  note: {note}")
    print()
    print("Final Output")
    print(trace.final_output_code or "")


if __name__ == "__main__":
    main()
