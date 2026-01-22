"""
Evaluate Branching Inference

Test the branching computation on the Phase 2 trained model.
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict

import mlx.core as mx

from .config import get_config
from .model import LuminaModel
from .data import load_tokenizer
from .branching import (
    BranchingConfig,
    BranchingInference,
    BeamWithConfidence,
    BranchResult,
    visualize_branches,
)


def load_model(checkpoint_path: str) -> LuminaModel:
    """Load model from checkpoint."""
    checkpoint_dir = Path(checkpoint_path)
    with open(checkpoint_dir / "config.json") as f:
        config_data = json.load(f)

    # Handle both Phase 1 and Phase 2 config formats
    model_config_name = config_data.get("model_config", "tiny")
    model_config = get_config(model_config_name)
    model = LuminaModel(model_config)

    weights = mx.load(str(checkpoint_dir / "model.safetensors"))
    model.load_weights(list(weights.items()))

    return model


def analyze_branch_diversity(result: BranchResult, tokenizer) -> Dict:
    """Analyze diversity of generated branches."""
    if len(result.completed_branches) < 2:
        return {"diversity": 0.0, "unique_endings": 1}

    # Get last N tokens from each branch
    n = 10
    endings = []
    for branch in result.completed_branches:
        end_tokens = branch.tokens[-n:] if len(branch.tokens) >= n else branch.tokens
        endings.append(tuple(end_tokens))

    unique_endings = len(set(endings))
    diversity = unique_endings / len(endings)

    # Compute text similarity
    texts = [tokenizer.decode(b.tokens[-20:]) for b in result.completed_branches[:5]]

    return {
        "diversity": diversity,
        "unique_endings": unique_endings,
        "total_branches": len(result.completed_branches),
        "sample_texts": texts,
    }


def compare_methods(
    model: LuminaModel,
    tokenizer,
    prompt: str,
    max_new_tokens: int = 50,
) -> Dict:
    """Compare branching inference with standard and beam search."""
    input_ids = mx.array([tokenizer.encode(prompt)])

    results = {}

    # 1. Greedy decoding (standard)
    print("  Running greedy decoding...")
    greedy_tokens = input_ids[0].tolist()
    greedy_confidences = []

    for _ in range(max_new_tokens):
        ids = mx.array([greedy_tokens])
        output, _ = model(ids)

        probs = mx.softmax(output.logits[0, -1, :], axis=-1)
        next_token = int(mx.argmax(probs).item())
        confidence = float(output.confidence.overall[0, -1].item())

        greedy_tokens.append(next_token)
        greedy_confidences.append(confidence)

        if next_token == 50256:  # EOS
            break

    results["greedy"] = {
        "text": tokenizer.decode(greedy_tokens),
        "avg_confidence": sum(greedy_confidences) / len(greedy_confidences) if greedy_confidences else 0,
        "min_confidence": min(greedy_confidences) if greedy_confidences else 0,
        "length": len(greedy_tokens) - len(input_ids[0].tolist()),
    }

    # 2. Beam search with confidence
    print("  Running beam search with confidence...")
    beam_searcher = BeamWithConfidence(model, beam_width=4, confidence_weight=0.3)
    beam_results = beam_searcher.generate(input_ids, max_new_tokens=max_new_tokens)

    if beam_results:
        best_beam = beam_results[0]
        results["beam_confidence"] = {
            "text": tokenizer.decode(best_beam[0]),
            "log_prob": best_beam[1],
            "avg_confidence": best_beam[2],
            "num_candidates": len(beam_results),
        }

    # 3. Branching inference
    print("  Running branching inference...")
    branch_config = BranchingConfig(
        fork_entropy_threshold=2.0,  # Fork when entropy exceeds this
        max_branches=4,
        fork_top_k=3,
        max_length=max_new_tokens,
        min_branch_confidence=0.02,  # Lower threshold for tiny model
    )
    brancher = BranchingInference(model, branch_config)
    branch_result = brancher.generate(input_ids, max_new_tokens=max_new_tokens)

    diversity = analyze_branch_diversity(branch_result, tokenizer)

    results["branching"] = {
        "best_text": tokenizer.decode(branch_result.best_branch.tokens),
        "best_score": branch_result.best_branch.score(),
        "avg_confidence": branch_result.best_branch.avg_confidence,
        "min_confidence": branch_result.best_branch.min_confidence,
        "total_forks": branch_result.total_forks,
        "total_pruned": branch_result.total_pruned,
        "completed_branches": len(branch_result.completed_branches),
        "diversity": diversity["diversity"],
    }

    # All completed branches
    results["all_branches"] = []
    for branch in branch_result.completed_branches[:5]:
        results["all_branches"].append({
            "id": branch.id,
            "text": tokenizer.decode(branch.tokens),
            "score": branch.score(),
            "avg_confidence": branch.avg_confidence,
            "fork_step": branch.fork_step,
        })

    return results


def run_evaluation(checkpoint_path: str, prompts: List[str] = None):
    """Run full branching evaluation."""
    print("=" * 60)
    print("BRANCHING INFERENCE EVALUATION")
    print("=" * 60)

    # Load model
    print(f"\nLoading model from {checkpoint_path}...")
    model = load_model(checkpoint_path)
    tokenizer = load_tokenizer("gpt2")

    # Default prompts that test different scenarios
    if prompts is None:
        prompts = [
            # Ambiguous - should fork
            "The best way to learn programming is",
            "In the future, artificial intelligence will",
            "The meaning of life is",

            # More specific - might fork less
            "def fibonacci(n):",
            "The capital of France is",

            # Uncertain/creative
            "Once upon a time in a land far away,",
        ]

    all_results = []

    for i, prompt in enumerate(prompts):
        print(f"\n{'='*60}")
        print(f"Prompt {i+1}/{len(prompts)}: {prompt}")
        print("=" * 60)

        results = compare_methods(model, tokenizer, prompt)
        all_results.append({"prompt": prompt, "results": results})

        # Print summary
        print(f"\n--- Results ---")
        print(f"Greedy: {results['greedy']['text'][:100]}...")
        print(f"  Avg confidence: {results['greedy']['avg_confidence']:.3f}")

        if "beam_confidence" in results:
            print(f"\nBeam (confidence): {results['beam_confidence']['text'][:100]}...")
            print(f"  Avg confidence: {results['beam_confidence']['avg_confidence']:.3f}")

        print(f"\nBranching (best): {results['branching']['best_text'][:100]}...")
        print(f"  Avg confidence: {results['branching']['avg_confidence']:.3f}")
        print(f"  Forks: {results['branching']['total_forks']}, Pruned: {results['branching']['total_pruned']}")
        print(f"  Diversity: {results['branching']['diversity']:.2f}")

        if results["all_branches"]:
            print(f"\n  All completed branches ({len(results['all_branches'])}):")
            for b in results["all_branches"][:3]:
                short_text = b["text"][len(prompt):len(prompt)+50]
                print(f"    Branch {b['id']}: ...{short_text}... (conf: {b['avg_confidence']:.3f})")

    # Summary statistics
    print("\n" + "=" * 60)
    print("SUMMARY STATISTICS")
    print("=" * 60)

    total_forks = sum(r["results"]["branching"]["total_forks"] for r in all_results)
    total_branches = sum(r["results"]["branching"]["completed_branches"] for r in all_results)
    avg_diversity = sum(r["results"]["branching"]["diversity"] for r in all_results) / len(all_results)

    greedy_conf = sum(r["results"]["greedy"]["avg_confidence"] for r in all_results) / len(all_results)
    branch_conf = sum(r["results"]["branching"]["avg_confidence"] for r in all_results) / len(all_results)

    print(f"Total forks across all prompts: {total_forks}")
    print(f"Total completed branches: {total_branches}")
    print(f"Average diversity: {avg_diversity:.3f}")
    print(f"Average greedy confidence: {greedy_conf:.3f}")
    print(f"Average branching confidence: {branch_conf:.3f}")

    return all_results


def interactive_mode(checkpoint_path: str):
    """Interactive branching inference."""
    print("Loading model...")
    model = load_model(checkpoint_path)
    tokenizer = load_tokenizer("gpt2")

    branch_config = BranchingConfig(
        fork_entropy_threshold=1.5,
        max_branches=4,
        fork_top_k=3,
        max_length=100,
    )
    brancher = BranchingInference(model, branch_config)

    print("\nInteractive Branching Inference")
    print("Enter prompts to see branching in action. Type 'quit' to exit.\n")

    while True:
        prompt = input("Prompt: ").strip()
        if prompt.lower() in ("quit", "exit", "q"):
            break

        if not prompt:
            continue

        input_ids = mx.array([tokenizer.encode(prompt)])
        result = brancher.generate(input_ids, max_new_tokens=50)

        print(visualize_branches(result, tokenizer))


def main():
    parser = argparse.ArgumentParser(description="Evaluate Branching Inference")
    parser.add_argument("--checkpoint", type=str, required=True, help="Model checkpoint path")
    parser.add_argument("--interactive", action="store_true", help="Run in interactive mode")
    parser.add_argument("--prompt", type=str, help="Single prompt to test")
    args = parser.parse_args()

    if args.interactive:
        interactive_mode(args.checkpoint)
    elif args.prompt:
        run_evaluation(args.checkpoint, prompts=[args.prompt])
    else:
        run_evaluation(args.checkpoint)


if __name__ == "__main__":
    main()
