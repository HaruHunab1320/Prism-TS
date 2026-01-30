#!/usr/bin/env python3
"""
Interactive CLI demo for the Lumina Specialist Network.

Tests the full pipeline:
1. Router classifies query domain
2. Appropriate specialist generates response
3. Confidence is decomposed and displayed
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import mlx.core as mx
    HAS_MLX = True
except ImportError:
    HAS_MLX = False
    print("MLX not available. Please install: pip install mlx")

from config import OUTPUTS_DIR, ROUTER_CONFIG, SPECIALIST_CONFIG, DOMAINS


def load_model(model_class, config, path: Path):
    """Load a trained model."""
    if not path.exists():
        return None

    model = model_class(config)
    weights = mx.load(str(path / "model.safetensors"))
    model.load_weights(list(weights.items()))
    return model


def simple_tokenize(text: str, vocab_size: int = 32000):
    """Simple tokenization."""
    return mx.array([[ord(c) % vocab_size for c in text[:256]]])


def simple_detokenize(tokens) -> str:
    """Simple detokenization."""
    return "".join(chr(t % 128) for t in tokens.tolist()[0] if t > 0)


class SpecialistNetwork:
    """Complete specialist network for inference."""

    def __init__(self):
        from models.base import TinyRouter, TinySpecialist

        print("Loading models...")

        # Try to load router
        router_path = OUTPUTS_DIR / "router"
        self.router = None
        if router_path.exists():
            try:
                self.router = load_model(TinyRouter, ROUTER_CONFIG, router_path)
                print("  ✓ Router loaded")
            except Exception as e:
                print(f"  ✗ Router failed: {e}")

        # Load specialists
        self.specialists = {}
        for domain in DOMAINS:
            specialist_path = OUTPUTS_DIR / f"{domain}_specialist"
            if specialist_path.exists():
                try:
                    self.specialists[domain] = load_model(
                        TinySpecialist, SPECIALIST_CONFIG, specialist_path
                    )
                    print(f"  ✓ {domain.capitalize()} specialist loaded")
                except Exception as e:
                    print(f"  ✗ {domain} specialist failed: {e}")

        if not self.specialists:
            print("\nNo specialists loaded!")
            print("Run training first:")
            print("  python data/generate_all.py")
            print("  python training/train_specialist.py --domain prism")

    def route(self, query: str) -> tuple:
        """Route query to appropriate domain."""
        if self.router is None:
            # Fallback: keyword-based routing
            query_lower = query.lower()
            if any(kw in query_lower for kw in ["~>", "<~", "prism", "confident", "uncertain if"]):
                return "prism", 0.8
            elif any(kw in query_lower for kw in ["calculate", "solve", "equation", "derivative", "+"]):
                return "math", 0.8
            else:
                return "general", 0.6

        tokens = simple_tokenize(query)
        domain_idx, confidence, all_probs = self.router.route(tokens)
        domain = DOMAINS[domain_idx] if domain_idx < len(DOMAINS) else "general"
        return domain, confidence

    def generate(self, query: str) -> dict:
        """Generate response with full confidence decomposition."""
        # Route query
        domain, routing_confidence = self.route(query)

        # Get specialist
        if domain not in self.specialists or self.specialists[domain] is None:
            # Fallback to any available specialist
            available = [d for d, s in self.specialists.items() if s is not None]
            if not available:
                return {
                    "response": "No specialists available",
                    "domain": None,
                    "confidence": None,
                    "error": True
                }
            domain = available[0]
            routing_confidence *= 0.5  # Reduce confidence for fallback

        specialist = self.specialists[domain]

        # Generate
        tokens = simple_tokenize(f"Q: {query}\nA: ")
        output_tokens, confidence = specialist.generate(tokens, max_new_tokens=100)

        response = simple_detokenize(output_tokens)
        # Clean up response
        if "\nA: " in response:
            response = response.split("\nA: ", 1)[1]

        return {
            "response": response,
            "domain": domain,
            "routing_confidence": routing_confidence,
            "confidence": confidence.to_dict(),
        }


def print_response(result: dict):
    """Pretty print a response."""
    print()
    print("─" * 60)

    if result.get("error"):
        print(f"❌ Error: {result['response']}")
        return

    domain = result["domain"]
    print(f"📍 Domain: {domain.upper()} (routing confidence: {result['routing_confidence']:.2f})")
    print()
    print(f"📝 Response:")
    print(f"   {result['response'][:200]}...")
    print()

    conf = result["confidence"]
    print(f"📊 Confidence Decomposition:")
    print(f"   Overall:    {conf['overall']:.2f} {'█' * int(conf['overall'] * 20)}")
    print(f"   Epistemic:  {conf['epistemic']:.2f} {'█' * int(conf['epistemic'] * 20)} (model uncertainty)")
    print(f"   Aleatoric:  {conf['aleatoric']:.2f} {'█' * int(conf['aleatoric'] * 20)} (task ambiguity)")
    print(f"   OOD Score:  {conf['distribution_shift']:.2f} {'█' * int(conf['distribution_shift'] * 20)} (out-of-distribution)")
    print()
    print(f"   Type: {conf['primary_type'].upper()}")
    print("─" * 60)


def main():
    print("=" * 60)
    print("Lumina Specialist Network Demo")
    print("=" * 60)
    print()

    if not HAS_MLX:
        print("MLX required for this demo.")
        return

    network = SpecialistNetwork()

    print("\nExample queries:")
    print("  - How do I use the ~> operator in Prism?")
    print("  - What is the derivative of x^2?")
    print("  - What is photosynthesis?")
    print("  - What's the best restaurant in Paris? (OOD)")
    print()
    print("Type 'quit' to exit.\n")

    while True:
        try:
            query = input("You: ").strip()
            if query.lower() in ["quit", "exit", "q"]:
                break
            if not query:
                continue

            result = network.generate(query)
            print_response(result)

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

    print("\nGoodbye!")


if __name__ == "__main__":
    main()
