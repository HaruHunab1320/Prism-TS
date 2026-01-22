"""
Lumina Data Loading

Data loading utilities for training, including:
1. Standard text datasets for language modeling
2. Calibration datasets with known uncertainty levels
"""

import json
from pathlib import Path
from typing import Iterator, Optional, List, Dict, Any
from dataclasses import dataclass

import mlx.core as mx
from transformers import AutoTokenizer


@dataclass
class Batch:
    """A training batch."""

    input_ids: mx.array  # [batch, seq]
    labels: mx.array  # [batch, seq] (shifted input_ids)
    attention_mask: mx.array  # [batch, seq]


@dataclass
class CalibrationExample:
    """A calibration example with expected uncertainty."""

    text: str
    expected_uncertainty: str  # "high", "medium", "low"
    category: str  # "factual_known", "ambiguous", etc.
    answer: Optional[str] = None


class TextDataset:
    """Simple text dataset for language modeling."""

    def __init__(
        self,
        texts: List[str],
        tokenizer: Any,
        max_length: int = 512,
    ):
        self.texts = texts
        self.tokenizer = tokenizer
        self.max_length = max_length

        # Tokenize all texts
        self.encodings = []
        for text in texts:
            encoding = tokenizer(
                text,
                truncation=True,
                max_length=max_length,
                padding="max_length",
                return_tensors="np",
            )
            self.encodings.append({
                "input_ids": encoding["input_ids"][0],
                "attention_mask": encoding["attention_mask"][0],
            })

    def __len__(self) -> int:
        return len(self.encodings)

    def __getitem__(self, idx: int) -> Dict[str, mx.array]:
        encoding = self.encodings[idx]
        input_ids = mx.array(encoding["input_ids"])
        attention_mask = mx.array(encoding["attention_mask"])

        # Labels are input_ids shifted by 1 (predict next token)
        labels = mx.concatenate([input_ids[1:], mx.array([-100])])

        return {
            "input_ids": input_ids,
            "labels": labels,
            "attention_mask": attention_mask,
        }


def create_batches(
    dataset: TextDataset,
    batch_size: int,
    shuffle: bool = True,
) -> Iterator[Batch]:
    """Create batches from a dataset."""
    indices = list(range(len(dataset)))

    if shuffle:
        # Simple shuffle using MLX random
        indices = mx.random.permutation(mx.array(indices)).tolist()

    for i in range(0, len(indices), batch_size):
        batch_indices = indices[i : i + batch_size]

        input_ids = []
        labels = []
        attention_mask = []

        for idx in batch_indices:
            item = dataset[idx]
            input_ids.append(item["input_ids"])
            labels.append(item["labels"])
            attention_mask.append(item["attention_mask"])

        yield Batch(
            input_ids=mx.stack(input_ids),
            labels=mx.stack(labels),
            attention_mask=mx.stack(attention_mask),
        )


def load_tokenizer(model_name: str = "gpt2") -> Any:
    """Load a tokenizer."""
    tokenizer = AutoTokenizer.from_pretrained(model_name)

    # Set padding token if not present
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    return tokenizer


# Built-in calibration dataset for initial experiments
CALIBRATION_EXAMPLES = [
    # High confidence - well-known facts
    CalibrationExample(
        text="What is the capital of France?",
        expected_uncertainty="low",
        category="factual_known",
        answer="Paris",
    ),
    CalibrationExample(
        text="What is 2 + 2?",
        expected_uncertainty="low",
        category="factual_known",
        answer="4",
    ),
    CalibrationExample(
        text="Who wrote Romeo and Juliet?",
        expected_uncertainty="low",
        category="factual_known",
        answer="William Shakespeare",
    ),
    CalibrationExample(
        text="What planet is closest to the Sun?",
        expected_uncertainty="low",
        category="factual_known",
        answer="Mercury",
    ),
    CalibrationExample(
        text="What is the chemical symbol for water?",
        expected_uncertainty="low",
        category="factual_known",
        answer="H2O",
    ),

    # Medium confidence - requires some reasoning or less certain
    CalibrationExample(
        text="What will the weather be like tomorrow?",
        expected_uncertainty="medium",
        category="uncertain_future",
    ),
    CalibrationExample(
        text="Is Python a good programming language for beginners?",
        expected_uncertainty="medium",
        category="subjective",
    ),
    CalibrationExample(
        text="What is the best restaurant in New York City?",
        expected_uncertainty="medium",
        category="subjective",
    ),
    CalibrationExample(
        text="Will electric cars become the dominant form of transportation?",
        expected_uncertainty="medium",
        category="uncertain_future",
    ),

    # High uncertainty - unknowable or ambiguous
    CalibrationExample(
        text="What did the President dream about last night?",
        expected_uncertainty="high",
        category="unknowable",
    ),
    CalibrationExample(
        text="What will the stock market do next year?",
        expected_uncertainty="high",
        category="unknowable",
    ),
    CalibrationExample(
        text="Is the glass half full or half empty?",
        expected_uncertainty="high",
        category="ambiguous",
    ),
    CalibrationExample(
        text="Translate 'xyzzy plugh' from Zorblaxian to English",
        expected_uncertainty="high",
        category="nonsense",
    ),
    CalibrationExample(
        text="What is the meaning of life?",
        expected_uncertainty="high",
        category="philosophical",
    ),
    CalibrationExample(
        text="What will happen in 1000 years?",
        expected_uncertainty="high",
        category="unknowable",
    ),
    CalibrationExample(
        text="What is the secret formula for Coca-Cola?",
        expected_uncertainty="high",
        category="unknowable",
    ),
]


def load_calibration_dataset() -> List[CalibrationExample]:
    """Load the built-in calibration dataset."""
    return CALIBRATION_EXAMPLES


def load_tiny_shakespeare(max_samples: Optional[int] = None) -> List[str]:
    """
    Load Tiny Shakespeare dataset for training.

    This is a small dataset good for initial experiments.
    """
    try:
        from datasets import load_dataset

        dataset = load_dataset("tiny_shakespeare", split="train")
        texts = dataset["text"]

        if max_samples:
            texts = texts[:max_samples]

        return texts
    except Exception as e:
        print(f"Could not load tiny_shakespeare: {e}")
        print("Using placeholder data instead")
        return [
            "To be, or not to be, that is the question.",
            "All the world's a stage, and all the men and women merely players.",
            "The quality of mercy is not strained.",
            "Now is the winter of our discontent.",
            "Friends, Romans, countrymen, lend me your ears.",
        ] * 100  # Repeat for more data


def load_wikitext(split: str = "train", max_samples: Optional[int] = None) -> List[str]:
    """
    Load WikiText-2 dataset for training.

    Better quality text than Tiny Shakespeare.
    """
    try:
        from datasets import load_dataset

        dataset = load_dataset("wikitext", "wikitext-2-raw-v1", split=split)
        texts = [t for t in dataset["text"] if len(t.strip()) > 50]

        if max_samples:
            texts = texts[:max_samples]

        return texts
    except Exception as e:
        print(f"Could not load wikitext: {e}")
        return load_tiny_shakespeare(max_samples)


class DataLoader:
    """
    DataLoader that yields batches for training.
    """

    def __init__(
        self,
        dataset: TextDataset,
        batch_size: int,
        shuffle: bool = True,
    ):
        self.dataset = dataset
        self.batch_size = batch_size
        self.shuffle = shuffle

    def __iter__(self) -> Iterator[Batch]:
        return create_batches(self.dataset, self.batch_size, self.shuffle)

    def __len__(self) -> int:
        return (len(self.dataset) + self.batch_size - 1) // self.batch_size


def create_train_dataloader(
    tokenizer: Any,
    batch_size: int = 8,
    max_length: int = 512,
    dataset_name: str = "wikitext",
    max_samples: Optional[int] = None,
) -> DataLoader:
    """Create a training dataloader."""
    if dataset_name == "wikitext":
        texts = load_wikitext("train", max_samples)
    elif dataset_name == "shakespeare":
        texts = load_tiny_shakespeare(max_samples)
    else:
        raise ValueError(f"Unknown dataset: {dataset_name}")

    dataset = TextDataset(texts, tokenizer, max_length)
    return DataLoader(dataset, batch_size, shuffle=True)


def create_eval_dataloader(
    tokenizer: Any,
    batch_size: int = 8,
    max_length: int = 512,
    dataset_name: str = "wikitext",
    max_samples: Optional[int] = None,
) -> DataLoader:
    """Create an evaluation dataloader."""
    if dataset_name == "wikitext":
        texts = load_wikitext("validation", max_samples)
    elif dataset_name == "shakespeare":
        texts = load_tiny_shakespeare(max_samples)
    else:
        raise ValueError(f"Unknown dataset: {dataset_name}")

    dataset = TextDataset(texts, tokenizer, max_length)
    return DataLoader(dataset, batch_size, shuffle=False)
