#!/usr/bin/env python3
"""
Dataset Download Scripts for Lumina Training

Downloads and prepares datasets for all three training phases:
- Phase 1: The Pile, GitHub Code, Wikipedia
- Phase 2: arXiv, Weather data, Code reviews, Fact-checked content
- Phase 3: (Uses generated Prism data from other scripts)

Requires: pip install datasets huggingface_hub arxiv tqdm
"""

import os
import json
import argparse
import re
from pathlib import Path
from typing import Optional, Iterator, Dict, Any
from tqdm import tqdm

try:
    from datasets import load_dataset
    HAS_DATASETS = True
except ImportError:
    HAS_DATASETS = False
    print("Warning: 'datasets' not installed. Run: pip install datasets")

try:
    import arxiv
    HAS_ARXIV = True
except ImportError:
    HAS_ARXIV = False
    print("Warning: 'arxiv' not installed. Run: pip install arxiv")


# ============================================================================
# Configuration
# ============================================================================

DEFAULT_DATA_DIR = Path("data/raw")

PHASE1_CONFIG = {
    "pile": {
        "source": "EleutherAI/pile",
        "samples": 10_000_000,
        "subsets": ["Wikipedia (en)", "Github", "StackExchange", "ArXiv"],
    },
    "code": {
        "source": "bigcode/the-stack",
        "samples": 5_000_000,
        "languages": ["javascript", "typescript", "python"],
    },
    "wikipedia": {
        "source": "wikipedia",
        "config": "20220301.en",
        "samples": 2_000_000,
    }
}

PHASE2_CONFIG = {
    "arxiv": {
        "samples": 500_000,
        "categories": ["cs.AI", "cs.LG", "cs.CL", "stat.ML", "physics", "math"],
    },
    "fever": {
        "source": "fever",
        "config": "v1.0",
        "samples": 100_000,
    }
}


# ============================================================================
# Phase 1: Foundation Datasets
# ============================================================================

def download_pile_subset(
    output_dir: Path,
    max_samples: int = 10_000_000,
    streaming: bool = True
) -> None:
    """Download a subset of The Pile dataset"""
    if not HAS_DATASETS:
        print("Error: datasets library required. Run: pip install datasets")
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "pile_subset.jsonl"

    print(f"Downloading The Pile subset ({max_samples:,} samples)...")

    try:
        # Load streaming dataset
        dataset = load_dataset(
            "EleutherAI/pile",
            split="train",
            streaming=streaming,
            trust_remote_code=True
        )

        count = 0
        with open(output_file, 'w') as f:
            for sample in tqdm(dataset, total=max_samples, desc="Downloading"):
                if count >= max_samples:
                    break

                # Write sample
                f.write(json.dumps({
                    "text": sample["text"],
                    "meta": sample.get("meta", {})
                }) + '\n')
                count += 1

        print(f"Downloaded {count:,} samples to {output_file}")

    except Exception as e:
        print(f"Error downloading The Pile: {e}")
        print("Alternative: Download manually from https://pile.eleuther.ai/")


def download_github_code(
    output_dir: Path,
    languages: list = ["javascript", "typescript", "python"],
    samples_per_lang: int = 1_700_000,
    streaming: bool = True
) -> None:
    """Download code from The Stack dataset"""
    if not HAS_DATASETS:
        print("Error: datasets library required. Run: pip install datasets")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    for lang in languages:
        output_file = output_dir / f"code_{lang}.jsonl"
        print(f"\nDownloading {lang} code ({samples_per_lang:,} samples)...")

        try:
            dataset = load_dataset(
                "bigcode/the-stack",
                data_dir=f"data/{lang}",
                split="train",
                streaming=streaming,
                trust_remote_code=True
            )

            count = 0
            with open(output_file, 'w') as f:
                for sample in tqdm(dataset, total=samples_per_lang, desc=lang):
                    if count >= samples_per_lang:
                        break

                    # Filter for reasonable file sizes
                    content = sample.get("content", "")
                    if len(content) < 100 or len(content) > 100000:
                        continue

                    f.write(json.dumps({
                        "text": content,
                        "language": lang,
                        "path": sample.get("path", ""),
                        "repo": sample.get("repository_name", "")
                    }) + '\n')
                    count += 1

            print(f"Downloaded {count:,} {lang} files to {output_file}")

        except Exception as e:
            print(f"Error downloading {lang} code: {e}")


def download_wikipedia(
    output_dir: Path,
    max_samples: int = 2_000_000
) -> None:
    """Download Wikipedia articles"""
    if not HAS_DATASETS:
        print("Error: datasets library required. Run: pip install datasets")
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "wikipedia.jsonl"

    print(f"Downloading Wikipedia ({max_samples:,} samples)...")

    try:
        dataset = load_dataset(
            "wikipedia",
            "20220301.en",
            split="train",
            trust_remote_code=True
        )

        count = 0
        with open(output_file, 'w') as f:
            for sample in tqdm(dataset, total=max_samples, desc="Wikipedia"):
                if count >= max_samples:
                    break

                # Filter for reasonable article length
                text = sample.get("text", "")
                if len(text) < 500:
                    continue

                f.write(json.dumps({
                    "text": text,
                    "title": sample.get("title", "")
                }) + '\n')
                count += 1

        print(f"Downloaded {count:,} articles to {output_file}")

    except Exception as e:
        print(f"Error downloading Wikipedia: {e}")


# ============================================================================
# Phase 2: Uncertainty Datasets
# ============================================================================

def download_arxiv_abstracts(
    output_dir: Path,
    max_samples: int = 500_000,
    categories: list = None
) -> None:
    """Download arXiv abstracts via API"""
    if not HAS_ARXIV:
        print("Error: arxiv library required. Run: pip install arxiv")
        print("Alternative: Download from Kaggle: kaggle datasets download -d Cornell-University/arxiv")
        return

    if categories is None:
        categories = ["cs.AI", "cs.LG", "cs.CL", "stat.ML"]

    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "arxiv_abstracts.jsonl"

    print(f"Downloading arXiv abstracts ({max_samples:,} samples)...")
    print(f"Categories: {categories}")

    # Uncertainty language patterns to look for
    uncertainty_patterns = [
        r'\bwe hypothesize\b',
        r'\bresults suggest\b',
        r'\bp\s*[<>=]\s*0\.\d+',
        r'\bmay indicate\b',
        r'\bpreliminary\b',
        r'\bfurther research\b',
        r'\buncertain\b',
        r'\bprobably\b',
        r'\blikely\b',
        r'\bconfidence interval\b',
        r'\berror margin\b',
    ]
    pattern = re.compile('|'.join(uncertainty_patterns), re.IGNORECASE)

    count = 0
    uncertainty_count = 0

    try:
        with open(output_file, 'w') as f:
            for category in categories:
                print(f"\nSearching category: {category}")
                samples_per_cat = max_samples // len(categories)

                search = arxiv.Search(
                    query=f"cat:{category}",
                    max_results=samples_per_cat * 2,  # Get extra to filter
                    sort_by=arxiv.SortCriterion.SubmittedDate
                )

                cat_count = 0
                for result in tqdm(search.results(), desc=category, total=samples_per_cat):
                    if cat_count >= samples_per_cat:
                        break

                    abstract = result.summary.replace('\n', ' ')

                    # Check for uncertainty language
                    has_uncertainty = bool(pattern.search(abstract))
                    if has_uncertainty:
                        uncertainty_count += 1

                    f.write(json.dumps({
                        "text": abstract,
                        "title": result.title,
                        "category": category,
                        "has_uncertainty_language": has_uncertainty,
                        "published": str(result.published.date())
                    }) + '\n')

                    count += 1
                    cat_count += 1

        print(f"\nDownloaded {count:,} abstracts to {output_file}")
        print(f"Abstracts with uncertainty language: {uncertainty_count:,} ({100*uncertainty_count/count:.1f}%)")

    except Exception as e:
        print(f"Error downloading arXiv: {e}")


def download_fever(
    output_dir: Path,
    max_samples: int = 100_000
) -> None:
    """Download FEVER fact verification dataset"""
    if not HAS_DATASETS:
        print("Error: datasets library required. Run: pip install datasets")
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "fever.jsonl"

    print(f"Downloading FEVER dataset ({max_samples:,} samples)...")

    try:
        dataset = load_dataset("fever", "v1.0", split="train", trust_remote_code=True)

        # Map labels to confidence levels
        label_confidence = {
            "SUPPORTS": 0.9,
            "REFUTES": 0.1,
            "NOT ENOUGH INFO": 0.5
        }

        count = 0
        with open(output_file, 'w') as f:
            for sample in tqdm(dataset, total=max_samples, desc="FEVER"):
                if count >= max_samples:
                    break

                label = sample.get("label", "NOT ENOUGH INFO")
                confidence = label_confidence.get(label, 0.5)

                f.write(json.dumps({
                    "claim": sample.get("claim", ""),
                    "label": label,
                    "confidence": confidence,
                    "evidence": sample.get("evidence_sentence", "")
                }) + '\n')
                count += 1

        print(f"Downloaded {count:,} claims to {output_file}")

    except Exception as e:
        print(f"Error downloading FEVER: {e}")


def download_code_reviews(
    output_dir: Path,
    max_samples: int = 200_000
) -> None:
    """Download GitHub code review comments"""
    if not HAS_DATASETS:
        print("Error: datasets library required. Run: pip install datasets")
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "code_reviews.jsonl"

    print(f"Downloading code review data ({max_samples:,} samples)...")

    # Uncertainty markers in code reviews
    uncertainty_patterns = [
        r'\bmight\b',
        r'\bnot sure\b',
        r'\bmaybe\b',
        r'\bpossibly\b',
        r'\bTODO\b',
        r'\bFIXME\b',
        r'\bHACK\b',
        r'\bI think\b',
        r'\bcould be\b',
        r'\bneeds testing\b',
    ]
    pattern = re.compile('|'.join(uncertainty_patterns), re.IGNORECASE)

    try:
        # Try to load GitHub issues dataset as proxy for reviews
        dataset = load_dataset(
            "bigcode/the-stack-github-issues",
            split="train",
            streaming=True,
            trust_remote_code=True
        )

        count = 0
        uncertainty_count = 0

        with open(output_file, 'w') as f:
            for sample in tqdm(dataset, total=max_samples, desc="Code reviews"):
                if count >= max_samples:
                    break

                text = sample.get("body", "") or sample.get("text", "")
                if not text or len(text) < 50:
                    continue

                has_uncertainty = bool(pattern.search(text))
                if has_uncertainty:
                    uncertainty_count += 1

                f.write(json.dumps({
                    "text": text,
                    "has_uncertainty_language": has_uncertainty
                }) + '\n')
                count += 1

        print(f"Downloaded {count:,} samples to {output_file}")
        print(f"Samples with uncertainty language: {uncertainty_count:,}")

    except Exception as e:
        print(f"Error downloading code reviews: {e}")
        print("This dataset may require authentication or special access.")


# ============================================================================
# Main
# ============================================================================

def download_phase1(output_dir: Path) -> None:
    """Download all Phase 1 datasets"""
    print("=" * 60)
    print("PHASE 1: Foundation Pre-training Datasets")
    print("=" * 60)

    download_pile_subset(output_dir / "phase1" / "pile")
    download_github_code(output_dir / "phase1" / "code")
    download_wikipedia(output_dir / "phase1" / "wikipedia")


def download_phase2(output_dir: Path) -> None:
    """Download all Phase 2 datasets"""
    print("=" * 60)
    print("PHASE 2: Uncertainty-Aware Fine-tuning Datasets")
    print("=" * 60)

    download_arxiv_abstracts(output_dir / "phase2" / "arxiv")
    download_fever(output_dir / "phase2" / "fever")
    download_code_reviews(output_dir / "phase2" / "code_reviews")


def main():
    parser = argparse.ArgumentParser(description="Download datasets for Lumina training")
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="Output directory"
    )
    parser.add_argument(
        "--phase",
        type=int,
        choices=[1, 2],
        help="Download only specific phase (default: all)"
    )
    parser.add_argument(
        "--dataset",
        type=str,
        choices=["pile", "code", "wikipedia", "arxiv", "fever", "reviews"],
        help="Download only specific dataset"
    )

    args = parser.parse_args()
    output_dir = args.output

    if args.dataset:
        # Download specific dataset
        dataset_funcs = {
            "pile": lambda: download_pile_subset(output_dir / "phase1" / "pile"),
            "code": lambda: download_github_code(output_dir / "phase1" / "code"),
            "wikipedia": lambda: download_wikipedia(output_dir / "phase1" / "wikipedia"),
            "arxiv": lambda: download_arxiv_abstracts(output_dir / "phase2" / "arxiv"),
            "fever": lambda: download_fever(output_dir / "phase2" / "fever"),
            "reviews": lambda: download_code_reviews(output_dir / "phase2" / "code_reviews"),
        }
        dataset_funcs[args.dataset]()

    elif args.phase == 1:
        download_phase1(output_dir)
    elif args.phase == 2:
        download_phase2(output_dir)
    else:
        # Download all
        download_phase1(output_dir)
        download_phase2(output_dir)

    print("\n" + "=" * 60)
    print("Download complete!")
    print("=" * 60)
    print(f"\nData saved to: {output_dir}")
    print("\nNext steps:")
    print("1. Generate synthetic data: python scripts/generate_prism_corpus.py")
    print("2. Generate ConfidenceQA: python scripts/generate_confidence_qa.py")
    print("3. Tokenize datasets: python scripts/tokenize_datasets.py")


if __name__ == "__main__":
    main()
