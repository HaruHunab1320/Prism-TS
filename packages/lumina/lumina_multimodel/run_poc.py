#!/usr/bin/env python3
"""
Lumina Specialist Network - Proof of Concept

This script runs the complete PoC:
1. Generates training data
2. Trains all specialists
3. Runs evaluation
4. Launches interactive demo

Usage:
    python run_poc.py              # Run everything
    python run_poc.py --step data  # Only generate data
    python run_poc.py --step train # Only train
    python run_poc.py --step demo  # Only run demo
"""

import argparse
import subprocess
import sys
from pathlib import Path

POC_ROOT = Path(__file__).parent


def run_command(cmd: list, desc: str):
    """Run a command with description."""
    print(f"\n{'='*60}")
    print(f"🚀 {desc}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(cmd)}\n")

    result = subprocess.run(cmd, cwd=POC_ROOT)
    if result.returncode != 0:
        print(f"❌ Failed: {desc}")
        sys.exit(1)
    print(f"✅ Completed: {desc}")


def check_mlx():
    """Check if MLX is available."""
    try:
        import mlx.core
        print("✅ MLX available")
        return True
    except ImportError:
        print("❌ MLX not found")
        print("   Install with: pip install mlx mlx-lm")
        return False


def step_data():
    """Generate training data."""
    run_command(
        [sys.executable, "data/generate_all.py"],
        "Generating training data"
    )


def step_train():
    """Train all models."""
    domains = ["prism", "math", "general"]

    for domain in domains:
        run_command(
            [sys.executable, "training/train_specialist.py",
             "--domain", domain,
             "--epochs", "5",  # Reduced for quick PoC
             "--batch-size", "8"],
            f"Training {domain.upper()} specialist"
        )


def step_eval():
    """Run evaluation."""
    print("\n" + "="*60)
    print("📊 Evaluation")
    print("="*60)

    # Quick evaluation
    print("\nRunning quick validation...")

    # Import and run inline
    try:
        sys.path.insert(0, str(POC_ROOT))
        from demo.cli import SpecialistNetwork

        network = SpecialistNetwork()

        test_queries = [
            ("How do I use ~> in Prism?", "prism"),
            ("What is 2 + 2?", "math"),
            ("What is photosynthesis?", "general"),
            ("What restaurant should I go to?", "ood"),
        ]

        correct = 0
        for query, expected in test_queries:
            result = network.generate(query)
            routed = result.get("domain", "unknown")
            conf = result.get("confidence", {}).get("overall", 0)

            status = "✅" if (routed == expected or (expected == "ood" and conf < 0.5)) else "❌"
            print(f"  {status} '{query[:40]}...' → {routed} (conf: {conf:.2f})")

            if routed == expected or (expected == "ood" and conf < 0.5):
                correct += 1

        accuracy = correct / len(test_queries)
        print(f"\nRouting accuracy: {accuracy:.0%}")

        if accuracy >= 0.5:
            print("✅ PoC validation PASSED")
        else:
            print("⚠️  PoC validation needs improvement")

    except Exception as e:
        print(f"Evaluation error: {e}")


def step_demo():
    """Run interactive demo."""
    run_command(
        [sys.executable, "demo/cli.py"],
        "Interactive Demo"
    )


def main():
    parser = argparse.ArgumentParser(description="Run Lumina PoC")
    parser.add_argument(
        "--step",
        choices=["all", "data", "train", "eval", "demo"],
        default="all",
        help="Which step to run"
    )
    parser.add_argument(
        "--skip-check",
        action="store_true",
        help="Skip MLX check"
    )

    args = parser.parse_args()

    print("=" * 60)
    print("🧠 Lumina Specialist Network - Proof of Concept")
    print("=" * 60)

    # Check dependencies
    if not args.skip_check:
        if not check_mlx():
            print("\nInstall dependencies:")
            print("  pip install mlx mlx-lm tqdm")
            sys.exit(1)

    # Run requested step(s)
    if args.step == "all":
        step_data()
        step_train()
        step_eval()
        print("\n" + "="*60)
        print("🎉 PoC Complete!")
        print("="*60)
        print("\nRun interactive demo with:")
        print("  python run_poc.py --step demo")

    elif args.step == "data":
        step_data()

    elif args.step == "train":
        step_train()

    elif args.step == "eval":
        step_eval()

    elif args.step == "demo":
        step_demo()


if __name__ == "__main__":
    main()
