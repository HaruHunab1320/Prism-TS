"""
Lumina PyTorch Training Script for GCP H100 Clusters

Supports:
- Multi-GPU training with DeepSpeed ZeRO-2
- GCS checkpoint saving for durability
- Resume from interruption
- Flash Attention 2
- Mixed precision (bfloat16)

Usage:
    # Single GPU
    python -m lumina_train.train_pytorch --config base

    # Multi-GPU with DeepSpeed
    deepspeed --num_gpus=8 -m lumina_train.train_pytorch --config base --deepspeed

    # Resume from checkpoint
    python -m lumina_train.train_pytorch --resume gs://bucket/checkpoints/step-10000
"""

import os
import argparse
import json
import time
import math
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Optional, Dict, Any, List
import logging

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset, DistributedSampler
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR, LinearLR, SequentialLR
from tqdm import tqdm

# Optional imports
try:
    import deepspeed
    HAS_DEEPSPEED = True
except ImportError:
    HAS_DEEPSPEED = False

try:
    from google.cloud import storage
    HAS_GCS = True
except ImportError:
    HAS_GCS = False

try:
    from flash_attn import flash_attn_func
    HAS_FLASH_ATTN = True
except ImportError:
    HAS_FLASH_ATTN = False


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# Configuration
# ============================================================================

@dataclass
class ModelConfig:
    """Model architecture configuration."""
    vocab_size: int = 50257
    hidden_size: int = 768
    num_layers: int = 12
    num_heads: int = 12
    intermediate_size: int = 3072
    max_position_embeddings: int = 1024
    dropout: float = 0.1
    layer_norm_eps: float = 1e-5
    use_flash_attention: bool = True

    # Confidence head
    confidence_hidden_size: int = 256
    num_confidence_heads: int = 1


@dataclass
class TrainConfig:
    """Training configuration."""
    # Model
    model_config: str = "base"

    # Data
    data_dir: str = "data/tokenized"
    max_seq_length: int = 1024

    # Training
    batch_size: int = 32  # Per GPU
    gradient_accumulation_steps: int = 4
    epochs: int = 1
    max_steps: Optional[int] = None

    # Optimizer
    learning_rate: float = 3e-4
    weight_decay: float = 0.1
    warmup_steps: int = 2000
    max_grad_norm: float = 1.0

    # Loss weights
    lm_weight: float = 1.0
    brier_weight: float = 0.1
    focal_weight: float = 0.05
    entropy_weight: float = 0.01

    # Checkpointing
    output_dir: str = "outputs"
    gcs_bucket: Optional[str] = None  # e.g., "gs://lumina-training"
    save_steps: int = 1000
    save_total_limit: int = 5

    # Logging
    log_steps: int = 10
    eval_steps: int = 500

    # Distributed
    deepspeed: bool = False
    local_rank: int = -1

    # Resume
    resume_from: Optional[str] = None

    # Mixed precision
    bf16: bool = True

    # Seed
    seed: int = 42


MODEL_CONFIGS = {
    "tiny": ModelConfig(hidden_size=128, num_layers=4, num_heads=4, intermediate_size=512),
    "small": ModelConfig(hidden_size=256, num_layers=6, num_heads=8, intermediate_size=1024),
    "base": ModelConfig(hidden_size=768, num_layers=12, num_heads=12, intermediate_size=3072),
    "medium": ModelConfig(hidden_size=1024, num_layers=24, num_heads=16, intermediate_size=4096),
}


# ============================================================================
# Model Architecture (PyTorch)
# ============================================================================

class RotaryEmbedding(nn.Module):
    """Rotary Position Embedding."""

    def __init__(self, dim: int, max_seq_len: int = 2048):
        super().__init__()
        inv_freq = 1.0 / (10000 ** (torch.arange(0, dim, 2).float() / dim))
        self.register_buffer("inv_freq", inv_freq)
        self.max_seq_len = max_seq_len

    def forward(self, x: torch.Tensor, offset: int = 0) -> torch.Tensor:
        seq_len = x.shape[1]
        t = torch.arange(offset, offset + seq_len, device=x.device).type_as(self.inv_freq)
        freqs = torch.einsum("i,j->ij", t, self.inv_freq)
        emb = torch.cat((freqs, freqs), dim=-1)
        return emb.unsqueeze(0)


def rotate_half(x):
    x1, x2 = x[..., :x.shape[-1]//2], x[..., x.shape[-1]//2:]
    return torch.cat((-x2, x1), dim=-1)


def apply_rotary_pos_emb(q, k, cos, sin):
    q_embed = (q * cos) + (rotate_half(q) * sin)
    k_embed = (k * cos) + (rotate_half(k) * sin)
    return q_embed, k_embed


class Attention(nn.Module):
    """Multi-head attention with optional Flash Attention."""

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.num_heads = config.num_heads
        self.head_dim = config.hidden_size // config.num_heads
        self.scale = self.head_dim ** -0.5

        self.q_proj = nn.Linear(config.hidden_size, config.hidden_size, bias=False)
        self.k_proj = nn.Linear(config.hidden_size, config.hidden_size, bias=False)
        self.v_proj = nn.Linear(config.hidden_size, config.hidden_size, bias=False)
        self.o_proj = nn.Linear(config.hidden_size, config.hidden_size, bias=False)

        self.rotary = RotaryEmbedding(self.head_dim, config.max_position_embeddings)
        self.use_flash = config.use_flash_attention and HAS_FLASH_ATTN
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x: torch.Tensor, attention_mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        B, T, C = x.shape

        q = self.q_proj(x).view(B, T, self.num_heads, self.head_dim)
        k = self.k_proj(x).view(B, T, self.num_heads, self.head_dim)
        v = self.v_proj(x).view(B, T, self.num_heads, self.head_dim)

        # Rotary embeddings
        freqs = self.rotary(x)
        cos, sin = freqs.cos(), freqs.sin()
        cos = cos.unsqueeze(2)  # [1, T, 1, D]
        sin = sin.unsqueeze(2)
        q, k = apply_rotary_pos_emb(q, k, cos, sin)

        if self.use_flash:
            # Flash Attention expects [B, T, H, D]
            out = flash_attn_func(q, k, v, causal=True)
        else:
            # Standard attention
            q = q.transpose(1, 2)  # [B, H, T, D]
            k = k.transpose(1, 2)
            v = v.transpose(1, 2)

            attn = torch.matmul(q, k.transpose(-2, -1)) * self.scale

            # Causal mask
            causal_mask = torch.triu(torch.ones(T, T, device=x.device), diagonal=1).bool()
            attn = attn.masked_fill(causal_mask, float('-inf'))

            if attention_mask is not None:
                attn = attn + attention_mask

            attn = F.softmax(attn, dim=-1)
            attn = self.dropout(attn)

            out = torch.matmul(attn, v).transpose(1, 2)

        out = out.reshape(B, T, C)
        return self.o_proj(out)


class MLP(nn.Module):
    """Feed-forward network with SwiGLU activation."""

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.gate_proj = nn.Linear(config.hidden_size, config.intermediate_size, bias=False)
        self.up_proj = nn.Linear(config.hidden_size, config.intermediate_size, bias=False)
        self.down_proj = nn.Linear(config.intermediate_size, config.hidden_size, bias=False)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.dropout(self.down_proj(F.silu(self.gate_proj(x)) * self.up_proj(x)))


class TransformerBlock(nn.Module):
    """Single transformer block."""

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.attention = Attention(config)
        self.mlp = MLP(config)
        self.ln1 = nn.LayerNorm(config.hidden_size, eps=config.layer_norm_eps)
        self.ln2 = nn.LayerNorm(config.hidden_size, eps=config.layer_norm_eps)

    def forward(self, x: torch.Tensor, attention_mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        x = x + self.attention(self.ln1(x), attention_mask)
        x = x + self.mlp(self.ln2(x))
        return x


class ConfidenceHead(nn.Module):
    """Confidence prediction head."""

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.ln = nn.LayerNorm(config.hidden_size)
        self.fc1 = nn.Linear(config.hidden_size, config.confidence_hidden_size)
        self.fc2 = nn.Linear(config.confidence_hidden_size, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.ln(x)
        x = F.gelu(self.fc1(x))
        return torch.sigmoid(self.fc2(x)).squeeze(-1)


class LuminaModel(nn.Module):
    """Lumina language model with confidence head."""

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.config = config

        self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size)
        self.layers = nn.ModuleList([TransformerBlock(config) for _ in range(config.num_layers)])
        self.ln_f = nn.LayerNorm(config.hidden_size, eps=config.layer_norm_eps)
        self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)

        # Confidence head
        self.confidence_head = ConfidenceHead(config)

        # Weight tying
        self.lm_head.weight = self.embed_tokens.weight

        # Initialize
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None
    ) -> Dict[str, torch.Tensor]:
        x = self.embed_tokens(input_ids)

        for layer in self.layers:
            x = layer(x, attention_mask)

        x = self.ln_f(x)

        logits = self.lm_head(x)
        confidence = self.confidence_head(x)

        return {
            "logits": logits,
            "confidence": confidence,
            "hidden_states": x
        }


# ============================================================================
# Loss Functions
# ============================================================================

def compute_loss(
    outputs: Dict[str, torch.Tensor],
    labels: torch.Tensor,
    config: TrainConfig
) -> Dict[str, torch.Tensor]:
    """Compute combined loss with calibration objectives."""

    logits = outputs["logits"]
    confidence = outputs["confidence"]

    # Shift for next-token prediction
    shift_logits = logits[..., :-1, :].contiguous()
    shift_labels = labels[..., 1:].contiguous()
    shift_confidence = confidence[..., :-1].contiguous()

    # Flatten
    B, T, V = shift_logits.shape
    flat_logits = shift_logits.view(-1, V)
    flat_labels = shift_labels.view(-1)
    flat_confidence = shift_confidence.view(-1)

    # Mask for valid positions
    valid_mask = (flat_labels != -100)

    # 1. Language modeling loss (cross entropy)
    lm_loss = F.cross_entropy(flat_logits, flat_labels, ignore_index=-100)

    # 2. Brier score (calibration)
    if valid_mask.any():
        probs = F.softmax(flat_logits[valid_mask], dim=-1)
        valid_labels = flat_labels[valid_mask]
        valid_conf = flat_confidence[valid_mask]

        # Get probability of correct token
        correct_probs = probs.gather(1, valid_labels.unsqueeze(1)).squeeze(1)

        # Brier score: (confidence - correct)^2
        brier_loss = F.mse_loss(valid_conf, correct_probs.detach())

        # 3. Focal loss component for hard examples
        pt = correct_probs
        focal_weight = (1 - pt) ** 2
        focal_loss = (focal_weight * -torch.log(pt + 1e-8)).mean()

        # 4. Entropy regularization (encourage calibrated confidence)
        entropy_loss = -torch.mean(
            valid_conf * torch.log(valid_conf + 1e-8) +
            (1 - valid_conf) * torch.log(1 - valid_conf + 1e-8)
        )
    else:
        brier_loss = torch.tensor(0.0, device=logits.device)
        focal_loss = torch.tensor(0.0, device=logits.device)
        entropy_loss = torch.tensor(0.0, device=logits.device)

    # Combined loss
    total_loss = (
        config.lm_weight * lm_loss +
        config.brier_weight * brier_loss +
        config.focal_weight * focal_loss +
        config.entropy_weight * entropy_loss
    )

    return {
        "loss": total_loss,
        "lm_loss": lm_loss,
        "brier_loss": brier_loss,
        "focal_loss": focal_loss,
        "entropy_loss": entropy_loss
    }


# ============================================================================
# Data Loading
# ============================================================================

class TokenizedDataset(Dataset):
    """Load pre-tokenized binary data."""

    def __init__(self, data_path: Path, seq_length: int = 1024):
        self.seq_length = seq_length

        # Load binary file
        import struct
        with open(data_path, 'rb') as f:
            num_chunks, chunk_len = struct.unpack('II', f.read(8))
            self.data = []
            for _ in range(num_chunks):
                chunk = list(struct.unpack(f'{chunk_len}H', f.read(chunk_len * 2)))
                self.data.append(torch.tensor(chunk, dtype=torch.long))

        logger.info(f"Loaded {len(self.data)} chunks from {data_path}")

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        tokens = self.data[idx]
        return {
            "input_ids": tokens,
            "labels": tokens.clone()
        }


class StreamingDataset(Dataset):
    """Stream from HuggingFace datasets."""

    def __init__(self, dataset_name: str, tokenizer, seq_length: int, max_samples: int = None):
        from datasets import load_dataset
        from transformers import GPT2Tokenizer

        self.seq_length = seq_length
        self.tokenizer = tokenizer

        # Load streaming dataset
        # Handle datasets that require config names
        if dataset_name == "wikitext":
            self.dataset = load_dataset(dataset_name, "wikitext-2-raw-v1", split="train", streaming=True)
        else:
            self.dataset = load_dataset(dataset_name, split="train", streaming=True)

        # Pre-fetch samples
        self.samples = []
        token_buffer = []

        for i, item in enumerate(self.dataset):
            if max_samples and len(self.samples) >= max_samples:
                break

            text = item.get("text", "")
            tokens = self.tokenizer.encode(text)
            token_buffer.extend(tokens)
            token_buffer.append(self.tokenizer.eos_token_id)

            # Create chunks
            while len(token_buffer) >= seq_length:
                chunk = token_buffer[:seq_length]
                self.samples.append(torch.tensor(chunk, dtype=torch.long))
                token_buffer = token_buffer[seq_length:]

        logger.info(f"Created {len(self.samples)} samples from {dataset_name}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        tokens = self.samples[idx]
        return {
            "input_ids": tokens,
            "labels": tokens.clone()
        }


# ============================================================================
# GCS Utilities
# ============================================================================

class GCSCheckpointer:
    """Handle checkpointing to Google Cloud Storage."""

    def __init__(self, bucket_name: str, prefix: str = "checkpoints"):
        if not HAS_GCS:
            raise ImportError("google-cloud-storage required. Run: pip install google-cloud-storage")

        self.client = storage.Client()
        self.bucket = self.client.bucket(bucket_name)
        self.prefix = prefix

    def save(self, state_dict: Dict, step: int, is_best: bool = False) -> str:
        """Save checkpoint to GCS."""
        import tempfile

        # Save to temp file first
        with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as f:
            torch.save(state_dict, f.name)
            temp_path = f.name

        # Upload to GCS
        blob_name = f"{self.prefix}/checkpoint-{step}/model.pt"
        blob = self.bucket.blob(blob_name)
        blob.upload_from_filename(temp_path)

        if is_best:
            best_blob = self.bucket.blob(f"{self.prefix}/best/model.pt")
            best_blob.upload_from_filename(temp_path)

        # Cleanup
        os.unlink(temp_path)

        gcs_path = f"gs://{self.bucket.name}/{blob_name}"
        logger.info(f"Saved checkpoint to {gcs_path}")
        return gcs_path

    def load(self, path: str) -> Dict:
        """Load checkpoint from GCS."""
        import tempfile

        # Parse GCS path
        if path.startswith("gs://"):
            path = path[5:]
        bucket_name, blob_name = path.split("/", 1)

        # Download to temp file
        with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as f:
            temp_path = f.name

        blob = self.bucket.blob(blob_name)
        blob.download_to_filename(temp_path)

        state_dict = torch.load(temp_path, map_location="cpu")
        os.unlink(temp_path)

        return state_dict

    def list_checkpoints(self) -> List[str]:
        """List available checkpoints."""
        blobs = self.bucket.list_blobs(prefix=f"{self.prefix}/checkpoint-")
        checkpoints = set()
        for blob in blobs:
            # Extract step number
            parts = blob.name.split("/")
            for part in parts:
                if part.startswith("checkpoint-"):
                    checkpoints.add(part)
        return sorted(checkpoints)


def save_checkpoint_local(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    scheduler,
    step: int,
    config: TrainConfig,
    metrics: Dict[str, float],
    output_dir: Path,
    gcs_checkpointer: Optional[GCSCheckpointer] = None,
    is_best: bool = False
) -> str:
    """Save checkpoint locally and optionally to GCS."""

    checkpoint_dir = output_dir / f"checkpoint-{step}"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    # Prepare state dict
    state_dict = {
        "step": step,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "scheduler_state_dict": scheduler.state_dict() if scheduler else None,
        "config": asdict(config),
        "metrics": metrics
    }

    # Save locally
    checkpoint_path = checkpoint_dir / "model.pt"
    torch.save(state_dict, checkpoint_path)

    # Save config
    with open(checkpoint_dir / "config.json", "w") as f:
        json.dump(asdict(config), f, indent=2)

    with open(checkpoint_dir / "metrics.json", "w") as f:
        json.dump({"step": step, **metrics}, f, indent=2)

    logger.info(f"Saved checkpoint to {checkpoint_dir}")

    # Upload to GCS if configured
    if gcs_checkpointer:
        gcs_path = gcs_checkpointer.save(state_dict, step, is_best)
        return gcs_path

    return str(checkpoint_path)


# ============================================================================
# Training Loop
# ============================================================================

def train(config: TrainConfig):
    """Main training function."""

    # Setup distributed
    if config.deepspeed:
        deepspeed.init_distributed()
        local_rank = int(os.environ.get("LOCAL_RANK", 0))
        world_size = int(os.environ.get("WORLD_SIZE", 1))
    else:
        local_rank = 0
        world_size = 1

    is_main = local_rank == 0

    # Device selection: CUDA > MPS (Metal) > CPU
    if torch.cuda.is_available():
        device = torch.device(f"cuda:{local_rank}")
    elif torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")

    if is_main:
        logger.info(f"Training config: {config}")
        logger.info(f"Device: {device}, World size: {world_size}")

    # Set seed
    torch.manual_seed(config.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(config.seed)

    # Setup output directory
    output_dir = Path(config.output_dir)
    run_name = f"lumina-{config.model_config}-{int(time.time())}"
    output_dir = output_dir / run_name
    if is_main:
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save config
        with open(output_dir / "config.json", "w") as f:
            json.dump(asdict(config), f, indent=2)

    # Setup GCS checkpointer
    gcs_checkpointer = None
    if config.gcs_bucket:
        bucket_name = config.gcs_bucket.replace("gs://", "").split("/")[0]
        gcs_checkpointer = GCSCheckpointer(bucket_name, prefix=f"checkpoints/{run_name}")

    # Create model
    model_config = MODEL_CONFIGS[config.model_config]
    model = LuminaModel(model_config)

    num_params = sum(p.numel() for p in model.parameters())
    if is_main:
        logger.info(f"Model parameters: {num_params:,}")

    model = model.to(device)

    # Mixed precision - MPS works better with float16, CUDA with bfloat16
    if device.type == "mps":
        dtype = torch.float16 if config.bf16 else torch.float32
    else:
        dtype = torch.bfloat16 if config.bf16 else torch.float32

    # Load data
    data_path = Path(config.data_dir)
    if data_path.exists() and (data_path / "merged_all_train.bin").exists():
        train_dataset = TokenizedDataset(data_path / "merged_all_train.bin", config.max_seq_length)
        eval_dataset = TokenizedDataset(data_path / "merged_all_val.bin", config.max_seq_length)
    else:
        # Fallback to streaming
        from transformers import GPT2Tokenizer
        tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
        train_dataset = StreamingDataset("wikitext", tokenizer, config.max_seq_length, max_samples=10000)
        eval_dataset = StreamingDataset("wikitext", tokenizer, config.max_seq_length, max_samples=500)

    # DataLoaders
    if world_size > 1:
        train_sampler = DistributedSampler(train_dataset)
    else:
        train_sampler = None

    train_loader = DataLoader(
        train_dataset,
        batch_size=config.batch_size,
        sampler=train_sampler,
        shuffle=(train_sampler is None),
        num_workers=4,
        pin_memory=True
    )

    eval_loader = DataLoader(
        eval_dataset,
        batch_size=config.batch_size,
        shuffle=False,
        num_workers=2,
        pin_memory=True
    )

    # Optimizer
    optimizer = AdamW(
        model.parameters(),
        lr=config.learning_rate,
        weight_decay=config.weight_decay,
        betas=(0.9, 0.95)
    )

    # Scheduler
    total_steps = len(train_loader) * config.epochs // config.gradient_accumulation_steps
    if config.max_steps:
        total_steps = min(total_steps, config.max_steps)

    warmup_scheduler = LinearLR(optimizer, start_factor=0.01, total_iters=config.warmup_steps)
    cosine_scheduler = CosineAnnealingLR(optimizer, T_max=total_steps - config.warmup_steps)
    scheduler = SequentialLR(
        optimizer,
        schedulers=[warmup_scheduler, cosine_scheduler],
        milestones=[config.warmup_steps]
    )

    # DeepSpeed
    if config.deepspeed:
        ds_config = {
            "train_batch_size": config.batch_size * world_size * config.gradient_accumulation_steps,
            "gradient_accumulation_steps": config.gradient_accumulation_steps,
            "bf16": {"enabled": config.bf16},
            "zero_optimization": {
                "stage": 2,
                "offload_optimizer": {"device": "none"},
                "contiguous_gradients": True,
                "overlap_comm": True
            },
            "gradient_clipping": config.max_grad_norm
        }
        model, optimizer, _, scheduler = deepspeed.initialize(
            model=model,
            optimizer=optimizer,
            lr_scheduler=scheduler,
            config=ds_config
        )

    # Resume from checkpoint
    start_step = 0
    if config.resume_from:
        if is_main:
            logger.info(f"Resuming from {config.resume_from}")

        if config.resume_from.startswith("gs://"):
            state_dict = gcs_checkpointer.load(config.resume_from)
        else:
            state_dict = torch.load(config.resume_from, map_location=device)

        model.load_state_dict(state_dict["model_state_dict"])
        optimizer.load_state_dict(state_dict["optimizer_state_dict"])
        if state_dict.get("scheduler_state_dict"):
            scheduler.load_state_dict(state_dict["scheduler_state_dict"])
        start_step = state_dict["step"]

        if is_main:
            logger.info(f"Resumed from step {start_step}")

    # Training loop
    if is_main:
        logger.info(f"Starting training for {total_steps} steps")

    model.train()
    global_step = start_step
    best_eval_loss = float("inf")
    accumulation_steps = 0
    accumulated_loss = 0.0

    for epoch in range(config.epochs):
        if train_sampler:
            train_sampler.set_epoch(epoch)

        progress_bar = tqdm(train_loader, disable=not is_main, desc=f"Epoch {epoch+1}")

        for batch in progress_bar:
            input_ids = batch["input_ids"].to(device)
            labels = batch["labels"].to(device)

            # Forward pass with mixed precision
            with torch.autocast(device_type=device.type, dtype=dtype, enabled=device.type != "cpu"):
                outputs = model(input_ids)
                losses = compute_loss(outputs, labels, config)
                loss = losses["loss"] / config.gradient_accumulation_steps

            # Backward pass
            if config.deepspeed:
                model.backward(loss)
            else:
                loss.backward()

            accumulated_loss += losses["loss"].item()
            accumulation_steps += 1

            # Optimizer step
            if accumulation_steps >= config.gradient_accumulation_steps:
                if not config.deepspeed:
                    torch.nn.utils.clip_grad_norm_(model.parameters(), config.max_grad_norm)
                    optimizer.step()
                    scheduler.step()
                    optimizer.zero_grad()
                else:
                    model.step()

                global_step += 1

                # Logging
                if is_main and global_step % config.log_steps == 0:
                    avg_loss = accumulated_loss / accumulation_steps
                    lr = scheduler.get_last_lr()[0] if not config.deepspeed else optimizer.param_groups[0]["lr"]
                    progress_bar.set_postfix({
                        "loss": f"{avg_loss:.4f}",
                        "lm": f"{losses['lm_loss'].item():.4f}",
                        "brier": f"{losses['brier_loss'].item():.4f}",
                        "lr": f"{lr:.2e}"
                    })

                accumulated_loss = 0.0
                accumulation_steps = 0

                # Evaluation
                if is_main and global_step % config.eval_steps == 0:
                    eval_metrics = evaluate_model(model, eval_loader, config, device, dtype)
                    logger.info(f"Step {global_step} eval: {eval_metrics}")

                    is_best = eval_metrics["eval_loss"] < best_eval_loss
                    if is_best:
                        best_eval_loss = eval_metrics["eval_loss"]

                    model.train()

                # Checkpointing
                if is_main and global_step % config.save_steps == 0:
                    save_checkpoint_local(
                        model=model.module if hasattr(model, 'module') else model,
                        optimizer=optimizer,
                        scheduler=scheduler,
                        step=global_step,
                        config=config,
                        metrics={"train_loss": losses["loss"].item()},
                        output_dir=output_dir,
                        gcs_checkpointer=gcs_checkpointer,
                        is_best=False
                    )

                if config.max_steps and global_step >= config.max_steps:
                    break

        if config.max_steps and global_step >= config.max_steps:
            break

    # Final save
    if is_main:
        final_metrics = evaluate_model(model, eval_loader, config, device, dtype)
        save_checkpoint_local(
            model=model.module if hasattr(model, 'module') else model,
            optimizer=optimizer,
            scheduler=scheduler,
            step=global_step,
            config=config,
            metrics=final_metrics,
            output_dir=output_dir,
            gcs_checkpointer=gcs_checkpointer,
            is_best=True
        )
        logger.info(f"Training complete! Final metrics: {final_metrics}")


def evaluate_model(
    model: nn.Module,
    eval_loader: DataLoader,
    config: TrainConfig,
    device: torch.device,
    dtype: torch.dtype,
    max_batches: int = 50
) -> Dict[str, float]:
    """Evaluate model on validation set."""
    model.eval()

    total_loss = 0.0
    total_lm_loss = 0.0
    total_brier = 0.0
    num_batches = 0

    with torch.no_grad():
        for batch in eval_loader:
            if num_batches >= max_batches:
                break

            input_ids = batch["input_ids"].to(device)
            labels = batch["labels"].to(device)

            with torch.autocast(device_type=device.type, dtype=dtype, enabled=device.type != "cpu"):
                outputs = model(input_ids)
                losses = compute_loss(outputs, labels, config)

            total_loss += losses["loss"].item()
            total_lm_loss += losses["lm_loss"].item()
            total_brier += losses["brier_loss"].item()
            num_batches += 1

    return {
        "eval_loss": total_loss / max(num_batches, 1),
        "eval_lm_loss": total_lm_loss / max(num_batches, 1),
        "eval_brier": total_brier / max(num_batches, 1)
    }


# ============================================================================
# CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Train Lumina on GCP H100")

    # Model
    parser.add_argument("--config", type=str, default="base", choices=["tiny", "small", "base", "medium"])

    # Data
    parser.add_argument("--data-dir", type=str, default="data/tokenized")
    parser.add_argument("--max-seq-length", type=int, default=1024)

    # Training
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--gradient-accumulation-steps", type=int, default=4)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--max-steps", type=int, default=None)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--warmup-steps", type=int, default=2000)

    # Checkpointing
    parser.add_argument("--output-dir", type=str, default="outputs")
    parser.add_argument("--gcs-bucket", type=str, default=None, help="GCS bucket for checkpoints (e.g., gs://my-bucket)")
    parser.add_argument("--save-steps", type=int, default=1000)
    parser.add_argument("--resume", type=str, default=None, help="Resume from checkpoint path")

    # Logging
    parser.add_argument("--log-steps", type=int, default=10)
    parser.add_argument("--eval-steps", type=int, default=500)

    # Distributed
    parser.add_argument("--deepspeed", action="store_true")
    parser.add_argument("--local_rank", type=int, default=-1)

    # Mixed precision
    parser.add_argument("--bf16", action="store_true", default=True)
    parser.add_argument("--no-bf16", action="store_false", dest="bf16")

    args = parser.parse_args()

    config = TrainConfig(
        model_config=args.config,
        data_dir=args.data_dir,
        max_seq_length=args.max_seq_length,
        batch_size=args.batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        epochs=args.epochs,
        max_steps=args.max_steps,
        learning_rate=args.lr,
        warmup_steps=args.warmup_steps,
        output_dir=args.output_dir,
        gcs_bucket=args.gcs_bucket,
        save_steps=args.save_steps,
        log_steps=args.log_steps,
        eval_steps=args.eval_steps,
        deepspeed=args.deepspeed,
        local_rank=args.local_rank,
        resume_from=args.resume,
        bf16=args.bf16
    )

    train(config)


if __name__ == "__main__":
    main()
