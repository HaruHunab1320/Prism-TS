import argparse
import json
import statistics
import subprocess
from pathlib import Path

from lumina_micro.runtime.orchestrator import build_demo_trace
from lumina_micro.runtime.specialists import MockSpecialistBackend, OllamaSpecialistBackend


def _stop_ollama_model(model: str) -> None:
    subprocess.run(["ollama", "stop", model], capture_output=True, text=True)


def _ollama_ps() -> str:
    proc = subprocess.run(["ollama", "ps"], capture_output=True, text=True)
    return proc.stdout.strip()


def _make_backend(args):
    if args.backend == "mock":
        return MockSpecialistBackend()
    return OllamaSpecialistBackend(args.ollama_model, args.ollama_keepalive)


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark the Lumina micro demo locally.")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--backend", choices=["mock", "ollama"], default="mock")
    parser.add_argument("--ollama-model", default="llama3.1:latest")
    parser.add_argument("--ollama-keepalive", default="5m")
    parser.add_argument("--iterations", type=int, default=3)
    parser.add_argument("--cold-stop-first", action="store_true")
    parser.add_argument("--cold-stop-each-run", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    source_code = Path(args.input).read_text(encoding="utf-8")
    traces = []
    for idx in range(args.iterations):
        if args.backend == "ollama" and ((idx == 0 and args.cold_stop_first) or args.cold_stop_each_run):
            _stop_ollama_model(args.ollama_model)
        backend = _make_backend(args)
        trace = build_demo_trace(args.prompt, source_code, backend=backend)
        traces.append(trace)

    totals = [trace.metadata.get("total_latency_ms", 0.0) for trace in traces]
    by_step = {}
    for trace in traces:
        for step in trace.steps:
            by_step.setdefault(step.step_id, []).append(step.latency_ms or 0.0)

    payload = {
        "backend": args.backend,
        "ollama_model": args.ollama_model if args.backend == "ollama" else None,
        "iterations": args.iterations,
        "cold_stop_first": args.cold_stop_first,
        "cold_stop_each_run": args.cold_stop_each_run,
        "total_latency_ms": {
            "values": totals,
            "mean": statistics.mean(totals) if totals else 0.0,
            "min": min(totals) if totals else 0.0,
            "max": max(totals) if totals else 0.0,
        },
        "step_latency_ms": {
            step_id: {
                "values": values,
                "mean": statistics.mean(values) if values else 0.0,
                "min": min(values) if values else 0.0,
                "max": max(values) if values else 0.0,
            }
            for step_id, values in by_step.items()
        },
        "final_statuses": [trace.final_status for trace in traces],
        "accepted_counts": [trace.metadata.get("num_accepted", 0) for trace in traces],
        "ollama_ps": _ollama_ps() if args.backend == "ollama" else None,
    }
    output = json.dumps(payload, indent=2)
    if args.output:
        args.output.write_text(output + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
