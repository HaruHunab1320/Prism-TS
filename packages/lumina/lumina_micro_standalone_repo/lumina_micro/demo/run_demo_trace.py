import argparse
import json
from pathlib import Path

from lumina_micro.runtime.orchestrator import build_demo_trace
from lumina_micro.runtime.specialists import MockSpecialistBackend, OllamaSpecialistBackend


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a route/planning trace for the Lumina micro demo.")
    parser.add_argument("--prompt", required=True, help="User prompt for the demo request.")
    parser.add_argument("--input", required=True, help="Path to a JavaScript source file.")
    parser.add_argument("--output", help="Optional path to write the JSON trace.")
    parser.add_argument("--backend", choices=["mock", "ollama"], default="mock")
    parser.add_argument("--ollama-model", default="llama3.1:latest")
    parser.add_argument("--ollama-keepalive", default="5m")
    args = parser.parse_args()

    source_path = Path(args.input)
    source_code = source_path.read_text(encoding="utf-8")
    backend = MockSpecialistBackend() if args.backend == "mock" else OllamaSpecialistBackend(args.ollama_model, args.ollama_keepalive)
    trace = build_demo_trace(args.prompt, source_code, backend=backend)
    payload = json.dumps(trace.to_dict(), indent=2)
    if args.output:
        Path(args.output).write_text(payload + "\n", encoding="utf-8")
    print(payload)


if __name__ == "__main__":
    main()
