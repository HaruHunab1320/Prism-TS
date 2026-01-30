#!/usr/bin/env python3
"""
Dataset Tokenization Pipeline for Lumina Training

Tokenizes all downloaded and generated datasets into a consistent format
for training. Uses GPT-2 tokenizer for compatibility.

Outputs:
- Tokenized datasets in binary format for fast loading
- Train/validation splits
- Metadata files with statistics
"""

import os
import json
import argparse
from pathlib import Path
from typing import List, Dict, Iterator, Optional
import struct
from tqdm import tqdm
from concurrent.futures import ProcessPoolExecutor, as_completed

try:
    from transformers import GPT2Tokenizer
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False
    print("Warning: transformers not installed. Run: pip install transformers")


# ============================================================================
# Configuration
# ============================================================================

DEFAULT_INPUT_DIR = Path("data/raw")
DEFAULT_OUTPUT_DIR = Path("data/tokenized")
MAX_SEQ_LENGTH = 1024
CHUNK_SIZE = 10000  # Process in chunks for memory efficiency


# ============================================================================
# Tokenizer
# ============================================================================

def get_tokenizer():
    """Get GPT-2 tokenizer"""
    if not HAS_TRANSFORMERS:
        raise ImportError("transformers library required")

    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    tokenizer.pad_token = tokenizer.eos_token
    return tokenizer


# ============================================================================
# Data Loading
# ============================================================================

def load_jsonl(file_path: Path) -> Iterator[Dict]:
    """Load JSONL file as iterator"""
    with open(file_path, 'r') as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def get_text_from_sample(sample: Dict) -> str:
    """Extract text from various sample formats"""
    # Try common field names
    for field in ["text", "content", "abstract", "claim", "question", "answer"]:
        if field in sample:
            return str(sample[field])

    # For Q&A format, combine fields
    if "question" in sample and "answer" in sample:
        return f"Q: {sample['question']}\nA: {sample['answer']}"

    # Fallback: join all string values
    texts = [str(v) for v in sample.values() if isinstance(v, str)]
    return " ".join(texts)


# ============================================================================
# Tokenization
# ============================================================================

def tokenize_and_chunk(
    texts: List[str],
    tokenizer,
    max_length: int = MAX_SEQ_LENGTH
) -> List[List[int]]:
    """Tokenize texts and split into fixed-length chunks"""
    all_tokens = []

    for text in texts:
        tokens = tokenizer.encode(text, add_special_tokens=True)
        all_tokens.extend(tokens)
        all_tokens.append(tokenizer.eos_token_id)  # Separate documents

    # Split into chunks
    chunks = []
    for i in range(0, len(all_tokens) - max_length, max_length):
        chunk = all_tokens[i:i + max_length]
        if len(chunk) == max_length:
            chunks.append(chunk)

    return chunks


def save_binary(chunks: List[List[int]], output_path: Path) -> None:
    """Save tokenized chunks as binary file"""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'wb') as f:
        # Write header: num_chunks, seq_length
        f.write(struct.pack('II', len(chunks), len(chunks[0]) if chunks else 0))

        # Write chunks
        for chunk in chunks:
            f.write(struct.pack(f'{len(chunk)}H', *chunk))


def load_binary(input_path: Path) -> List[List[int]]:
    """Load tokenized chunks from binary file"""
    chunks = []
    with open(input_path, 'rb') as f:
        num_chunks, seq_length = struct.unpack('II', f.read(8))
        for _ in range(num_chunks):
            chunk = list(struct.unpack(f'{seq_length}H', f.read(seq_length * 2)))
            chunks.append(chunk)
    return chunks


# ============================================================================
# Processing Functions
# ============================================================================

def process_jsonl_file(
    input_path: Path,
    output_dir: Path,
    tokenizer,
    max_samples: Optional[int] = None
) -> Dict:
    """Process a single JSONL file"""
    print(f"\nProcessing: {input_path.name}")

    texts = []
    count = 0

    for sample in tqdm(load_jsonl(input_path), desc="Loading"):
        if max_samples and count >= max_samples:
            break
        text = get_text_from_sample(sample)
        if text and len(text) > 50:  # Skip very short texts
            texts.append(text)
            count += 1

    print(f"  Loaded {len(texts):,} samples")

    # Tokenize in batches
    all_chunks = []
    batch_size = 1000

    for i in tqdm(range(0, len(texts), batch_size), desc="Tokenizing"):
        batch = texts[i:i + batch_size]
        chunks = tokenize_and_chunk(batch, tokenizer)
        all_chunks.extend(chunks)

    print(f"  Created {len(all_chunks):,} chunks of {MAX_SEQ_LENGTH} tokens")

    # Split train/val (95/5)
    val_size = max(1, int(len(all_chunks) * 0.05))
    train_chunks = all_chunks[val_size:]
    val_chunks = all_chunks[:val_size]

    # Save
    dataset_name = input_path.stem
    train_path = output_dir / f"{dataset_name}_train.bin"
    val_path = output_dir / f"{dataset_name}_val.bin"

    save_binary(train_chunks, train_path)
    save_binary(val_chunks, val_path)

    print(f"  Saved: {train_path.name} ({len(train_chunks):,} chunks)")
    print(f"  Saved: {val_path.name} ({len(val_chunks):,} chunks)")

    return {
        "name": dataset_name,
        "input_samples": count,
        "train_chunks": len(train_chunks),
        "val_chunks": len(val_chunks),
        "total_tokens": len(all_chunks) * MAX_SEQ_LENGTH
    }


def process_directory(
    input_dir: Path,
    output_dir: Path,
    tokenizer
) -> List[Dict]:
    """Process all JSONL files in a directory recursively"""
    results = []

    jsonl_files = list(input_dir.rglob("*.jsonl"))
    print(f"Found {len(jsonl_files)} JSONL files to process")

    for jsonl_path in jsonl_files:
        # Create output subdirectory matching input structure
        rel_path = jsonl_path.relative_to(input_dir)
        out_subdir = output_dir / rel_path.parent

        result = process_jsonl_file(jsonl_path, out_subdir, tokenizer)
        results.append(result)

    return results


# ============================================================================
# Merging
# ============================================================================

def merge_datasets(
    output_dir: Path,
    phase: str = "all"
) -> None:
    """Merge all tokenized datasets into single train/val files"""
    print(f"\nMerging datasets for phase: {phase}")

    # Find all binary files
    train_files = list(output_dir.rglob("*_train.bin"))
    val_files = list(output_dir.rglob("*_val.bin"))

    print(f"Found {len(train_files)} train files, {len(val_files)} val files")

    # Merge train
    all_train_chunks = []
    for train_file in tqdm(train_files, desc="Loading train"):
        chunks = load_binary(train_file)
        all_train_chunks.extend(chunks)

    # Merge val
    all_val_chunks = []
    for val_file in tqdm(val_files, desc="Loading val"):
        chunks = load_binary(val_file)
        all_val_chunks.extend(chunks)

    # Shuffle
    import random
    random.shuffle(all_train_chunks)
    random.shuffle(all_val_chunks)

    # Save merged
    merged_train_path = output_dir / f"merged_{phase}_train.bin"
    merged_val_path = output_dir / f"merged_{phase}_val.bin"

    save_binary(all_train_chunks, merged_train_path)
    save_binary(all_val_chunks, merged_val_path)

    print(f"\nMerged train: {merged_train_path} ({len(all_train_chunks):,} chunks)")
    print(f"Merged val: {merged_val_path} ({len(all_val_chunks):,} chunks)")
    print(f"Total tokens: {(len(all_train_chunks) + len(all_val_chunks)) * MAX_SEQ_LENGTH:,}")


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Tokenize datasets for Lumina training")
    parser.add_argument(
        "--input", "-i",
        type=Path,
        default=DEFAULT_INPUT_DIR,
        help="Input directory with raw datasets"
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Output directory for tokenized data"
    )
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Merge all tokenized datasets after processing"
    )
    parser.add_argument(
        "--phase",
        type=str,
        choices=["phase1", "phase2", "phase3", "all"],
        default="all",
        help="Which phase to process"
    )
    parser.add_argument(
        "--max-length",
        type=int,
        default=MAX_SEQ_LENGTH,
        help="Maximum sequence length"
    )

    args = parser.parse_args()

    global MAX_SEQ_LENGTH
    MAX_SEQ_LENGTH = args.max_length

    print("=" * 60)
    print("Lumina Dataset Tokenization Pipeline")
    print("=" * 60)
    print(f"Input: {args.input}")
    print(f"Output: {args.output}")
    print(f"Max sequence length: {MAX_SEQ_LENGTH}")
    print()

    # Initialize tokenizer
    print("Loading tokenizer...")
    tokenizer = get_tokenizer()
    print(f"Vocabulary size: {len(tokenizer)}")

    # Process datasets
    if args.phase == "all":
        phases = ["phase1", "phase2", "phase3"]
    else:
        phases = [args.phase]

    all_results = []

    for phase in phases:
        phase_input = args.input / phase
        if not phase_input.exists():
            print(f"\nSkipping {phase} (directory not found)")
            continue

        print(f"\n{'=' * 40}")
        print(f"Processing {phase.upper()}")
        print('=' * 40)

        results = process_directory(
            phase_input,
            args.output / phase,
            tokenizer
        )
        all_results.extend(results)

    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    total_tokens = 0
    total_train = 0
    total_val = 0

    for result in all_results:
        print(f"\n{result['name']}:")
        print(f"  Input samples: {result['input_samples']:,}")
        print(f"  Train chunks: {result['train_chunks']:,}")
        print(f"  Val chunks: {result['val_chunks']:,}")
        print(f"  Tokens: {result['total_tokens']:,}")

        total_tokens += result['total_tokens']
        total_train += result['train_chunks']
        total_val += result['val_chunks']

    print(f"\n{'=' * 40}")
    print(f"TOTAL:")
    print(f"  Train chunks: {total_train:,}")
    print(f"  Val chunks: {total_val:,}")
    print(f"  Tokens: {total_tokens:,}")
    print(f"  Estimated size: {total_tokens * 2 / 1e9:.2f} GB")

    # Save metadata
    metadata = {
        "max_seq_length": MAX_SEQ_LENGTH,
        "vocab_size": len(tokenizer),
        "total_tokens": total_tokens,
        "total_train_chunks": total_train,
        "total_val_chunks": total_val,
        "datasets": all_results
    }

    metadata_path = args.output / "metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"\nMetadata saved to: {metadata_path}")

    # Optionally merge
    if args.merge:
        for phase in phases:
            phase_output = args.output / phase
            if phase_output.exists():
                merge_datasets(phase_output, phase)


if __name__ == "__main__":
    main()
