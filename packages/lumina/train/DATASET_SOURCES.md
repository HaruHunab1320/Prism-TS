# Dataset Sources for Lumina Training

This document catalogs all datasets needed for the 3-phase training plan, their sources, and preparation status.

---

## Phase 1: Foundation Pre-training (17M samples)

### The Pile (Subset) - 10M samples
| Attribute | Value |
|-----------|-------|
| **Status** | Available |
| **Source** | https://pile.eleuther.ai/ |
| **HuggingFace** | `EleutherAI/pile` |
| **License** | MIT |
| **Format** | JSONL (zstd compressed) |
| **Size** | ~825GB full, we need ~60GB subset |

**Recommended Subsets:**
- `Pile-CC` - Common Crawl (general web text)
- `Wikipedia (en)` - Factual knowledge
- `GitHub` - Code understanding
- `StackExchange` - Technical Q&A
- `ArXiv` - Scientific writing

**Download:**
```bash
# Via HuggingFace datasets
from datasets import load_dataset
pile = load_dataset("EleutherAI/pile", streaming=True)

# Or direct download
wget https://the-eye.eu/public/AI/pile/train/00.jsonl.zst
```

---

### GitHub Code (JS/TS/Python) - 5M samples
| Attribute | Value |
|-----------|-------|
| **Status** | Available |
| **Source** | The Stack (BigCode) |
| **HuggingFace** | `bigcode/the-stack` |
| **License** | Various (filtered for permissive) |
| **Format** | Parquet |

**Languages to Include:**
- JavaScript (closest to Prism syntax)
- TypeScript (typed JS patterns)
- Python (code structure, common patterns)

**Download:**
```python
from datasets import load_dataset

# Load specific languages
js_data = load_dataset("bigcode/the-stack", data_dir="data/javascript", split="train", streaming=True)
ts_data = load_dataset("bigcode/the-stack", data_dir="data/typescript", split="train", streaming=True)
py_data = load_dataset("bigcode/the-stack", data_dir="data/python", split="train", streaming=True)
```

---

### Wikipedia - 2M samples
| Attribute | Value |
|-----------|-------|
| **Status** | Available |
| **Source** | Wikimedia / HuggingFace |
| **HuggingFace** | `wikipedia` |
| **License** | CC BY-SA 3.0 |
| **Format** | Plain text |

**Download:**
```python
from datasets import load_dataset
wiki = load_dataset("wikipedia", "20220301.en", split="train")
```

---

## Phase 2: Uncertainty-Aware Fine-tuning (1M samples)

### arXiv Abstracts - 500K samples
| Attribute | Value |
|-----------|-------|
| **Status** | Available |
| **Source** | Kaggle / arXiv API |
| **Kaggle** | `Cornell-University/arxiv` |
| **License** | Fair use (abstracts) |
| **Value** | Rich in uncertainty language |

**Uncertainty Patterns to Extract:**
- "we hypothesize that..."
- "results suggest..."
- "with p < 0.05"
- "may indicate..."
- "preliminary findings show..."
- "further research is needed..."

**Download:**
```bash
# Kaggle
kaggle datasets download -d Cornell-University/arxiv

# Or via API
pip install arxiv
```

```python
import arxiv
search = arxiv.Search(query="all", max_results=500000)
for result in search.results():
    abstract = result.summary
```

---

### ConfidenceQA (Synthetic) - 100K samples
| Attribute | Value |
|-----------|-------|
| **Status** | TO CREATE |
| **Source** | Synthetic generation |
| **Format** | JSON |

**Generation Strategy:**

1. **High Confidence (40K)** - Well-established facts
```json
{
  "question": "What is the capital of France?",
  "answer": "Paris",
  "confidence": 0.99,
  "reasoning": "Undisputed geographical fact"
}
```

2. **Medium Confidence (30K)** - Subjective/contextual
```json
{
  "question": "Is Python a good language for beginners?",
  "answer": "Generally yes, due to readable syntax",
  "confidence": 0.75,
  "reasoning": "Widely accepted but context-dependent"
}
```

3. **Low Confidence (20K)** - Speculative/uncertain
```json
{
  "question": "Will AI surpass human intelligence by 2050?",
  "answer": "Predictions vary widely among experts",
  "confidence": 0.40,
  "reasoning": "Future prediction with high uncertainty"
}
```

4. **Very Low/Unknown (10K)** - Unknowable
```json
{
  "question": "What did Einstein dream about?",
  "answer": "Unknown - no historical record exists",
  "confidence": 0.10,
  "reasoning": "Fundamentally unknowable"
}
```

**Generation Script Needed:** `scripts/generate_confidence_qa.py`

---

### Weather/Probabilistic Data - 100K samples
| Attribute | Value |
|-----------|-------|
| **Status** | Available |
| **Source** | NOAA / Weather APIs |
| **NOAA** | https://www.weather.gov/documentation/services-web-api |
| **License** | Public domain |

**Data Types:**
- Historical forecast vs actual (calibration data)
- Probability of precipitation
- Confidence intervals in predictions

**Alternative Sources:**
- Metaculus (prediction market)
- Good Judgment Open (forecasting)
- PredictIt historical data

---

### Code Reviews with Uncertainty - 200K samples
| Attribute | Value |
|-----------|-------|
| **Status** | Available |
| **Source** | GitHub PR comments |
| **HuggingFace** | `bigcode/the-stack-github-issues` |

**Uncertainty Markers to Extract:**
- "might break..."
- "not sure if..."
- "TODO: verify..."
- "FIXME: potential issue..."
- "I think this could..."
- "needs testing with..."

---

### Fact-Checked Content - 100K samples
| Attribute | Value |
|-----------|-------|
| **Status** | Available |
| **Sources** | Multiple |

**Datasets:**
1. **FEVER** (Fact Extraction and Verification)
   - HuggingFace: `fever`
   - Labels: SUPPORTED, REFUTED, NOT_ENOUGH_INFO

2. **LIAR** (Political statements)
   - Labels: pants-fire, false, barely-true, half-true, mostly-true, true

3. **Climate-FEVER**
   - Climate-specific claims with evidence

```python
from datasets import load_dataset
fever = load_dataset("fever", "v1.0")
```

---

## Phase 3: Prism Specialization (66K samples)

### Existing Prism Examples - 5K samples (extrapolated)
| Attribute | Value |
|-----------|-------|
| **Status** | PARTIAL - 3,956 lines exist |
| **Location** | `/packages/prism-examples/examples/` |
| **Coverage** | Good foundation, needs expansion |

**Current Coverage:**
- Basic syntax (407 lines)
- Control flow (612 lines)
- Functions (280 lines)
- Objects/Arrays (335 lines)
- Confidence operators (694 lines)
- Modules (302 lines)
- Uncertain control flow (577 lines)
- Pipeline operators (292 lines)
- Real-world examples (457 lines)

**Gaps to Fill:**
- [ ] More async patterns
- [ ] Error handling patterns
- [ ] LLM integration patterns
- [ ] Complex nested confidence
- [ ] Multi-file module examples

---

### Synthetic Prism Code - 50K samples
| Attribute | Value |
|-----------|-------|
| **Status** | TO CREATE |
| **Method** | Template + LLM generation |

**Generation Approaches:**

1. **Template-Based (20K)**
   - Variable substitution in patterns
   - Operator combination permutations
   - Control flow variations

2. **LLM-Assisted (20K)**
   - Use GPT-4/Claude to generate variations
   - Validate with Prism parser
   - Ensure syntactic correctness

3. **Translation-Based (10K)**
   - Convert TypeScript patterns to Prism
   - Add confidence annotations
   - Maintain semantic equivalence

**Required Coverage:**
```
Operators:
  ~>   Confidence assignment
  <~   Confidence extraction
  ~~   Confidence chaining
  ~??  Confidence coalescing
  ~&&  Confident AND
  ~||  Confident OR
  ~+   Confident addition
  ~-   Confident subtraction
  ~*   Confident multiplication
  ~/   Confident division
  ~==  Confident equality
  ~!=  Confident inequality
  ~<   Confident less than
  ~>   Confident greater than
  ~<=  Confident less or equal
  ~>=  Confident greater or equal
  ~@>  Threshold gate
  ~||> Parallel confidence
  ~|>  Confidence pipeline

Control Flow:
  uncertain if { high/medium/low/default }
  uncertain for
  uncertain while
  nested uncertain blocks

Patterns:
  LLM integration (llm.query, llm.generate)
  Async confidence propagation
  Module import/export with confidence
  Error handling with confidence
  Type annotations with confidence
```

**Generation Script Needed:** `scripts/generate_prism_corpus.py`

---

### Prism Documentation - 1K samples
| Attribute | Value |
|-----------|-------|
| **Status** | EXISTS |
| **Location** | `/apps/docs/docs/` |

**Documents to Process:**
- Language reference pages
- API documentation
- Tutorial content
- Quick reference

**Conversion:**
- Extract code blocks
- Parse markdown for concepts
- Create instruction-following pairs

---

### Prism Q&A Pairs - 10K samples
| Attribute | Value |
|-----------|-------|
| **Status** | TO CREATE |
| **Method** | LLM generation + manual curation |

**Format:**
```json
{
  "question": "How do I assign a value with 80% confidence in Prism?",
  "answer": "Use the confidence assignment operator: `const value = 42 ~> 0.8`",
  "category": "syntax"
}
```

**Categories:**
- Syntax questions (3K)
- Operator usage (2K)
- Best practices (2K)
- Error troubleshooting (2K)
- Comparison with JS/TS (1K)

---

## Dataset Preparation Pipeline

### Step 1: Download External Datasets
```bash
# Create data directory
mkdir -p data/raw/{phase1,phase2,phase3}

# Download The Pile subset
python scripts/download_pile_subset.py --output data/raw/phase1/pile

# Download The Stack (code)
python scripts/download_stack.py --languages js,ts,python --output data/raw/phase1/code

# Download Wikipedia
python scripts/download_wikipedia.py --output data/raw/phase1/wikipedia
```

### Step 2: Generate Synthetic Data
```bash
# Generate ConfidenceQA
python scripts/generate_confidence_qa.py --output data/raw/phase2/confidence_qa

# Generate Prism corpus
python scripts/generate_prism_corpus.py --output data/raw/phase3/prism_synthetic

# Generate Q&A pairs
python scripts/generate_prism_qa.py --output data/raw/phase3/prism_qa
```

### Step 3: Process and Tokenize
```bash
# Tokenize all datasets
python scripts/tokenize_datasets.py \
  --input data/raw \
  --output data/tokenized \
  --tokenizer gpt2

# Create train/val splits
python scripts/create_splits.py \
  --input data/tokenized \
  --output data/final \
  --val-ratio 0.05
```

### Step 4: Upload to GCS
```bash
# Upload to Google Cloud Storage
gsutil -m cp -r data/final gs://lumina-training-data/
```

---

## Status Summary

| Dataset | Phase | Samples | Status | Priority |
|---------|-------|---------|--------|----------|
| The Pile | 1 | 10M | Ready to download | HIGH |
| GitHub Code | 1 | 5M | Ready to download | HIGH |
| Wikipedia | 1 | 2M | Ready to download | HIGH |
| arXiv Abstracts | 2 | 500K | Ready to download | HIGH |
| ConfidenceQA | 2 | 100K | **TO CREATE** | HIGH |
| Weather Data | 2 | 100K | Ready to download | MEDIUM |
| Code Reviews | 2 | 200K | Ready to download | MEDIUM |
| Fact-Checked | 2 | 100K | Ready to download | MEDIUM |
| Prism Examples | 3 | 5K | Partial (expand) | HIGH |
| Synthetic Prism | 3 | 50K | **TO CREATE** | CRITICAL |
| Prism Docs | 3 | 1K | Ready to process | MEDIUM |
| Prism Q&A | 3 | 10K | **TO CREATE** | HIGH |

---

## Scripts to Create

1. `scripts/download_pile_subset.py` - Download and filter The Pile
2. `scripts/download_stack.py` - Download code from The Stack
3. `scripts/download_wikipedia.py` - Download Wikipedia dump
4. `scripts/download_arxiv.py` - Download arXiv abstracts
5. `scripts/generate_confidence_qa.py` - Generate ConfidenceQA dataset
6. `scripts/generate_prism_corpus.py` - Generate synthetic Prism code
7. `scripts/generate_prism_qa.py` - Generate Prism Q&A pairs
8. `scripts/extract_prism_docs.py` - Convert docs to training data
9. `scripts/tokenize_datasets.py` - Tokenize all datasets
10. `scripts/create_splits.py` - Create train/validation splits
11. `scripts/upload_to_gcs.py` - Upload to cloud storage

---

## Estimated Storage Requirements

| Phase | Raw Size | Tokenized | Notes |
|-------|----------|-----------|-------|
| Phase 1 | ~100GB | ~60GB | Compressed streaming possible |
| Phase 2 | ~5GB | ~3GB | Smaller, specialized data |
| Phase 3 | ~500MB | ~300MB | Small but critical |
| **Total** | ~106GB | ~64GB | |

---

## Next Steps

1. [ ] Create data download scripts for Phase 1
2. [ ] Build ConfidenceQA generator
3. [ ] Build Prism synthetic code generator
4. [ ] Expand existing Prism examples
5. [ ] Create tokenization pipeline
6. [ ] Set up GCS bucket
7. [ ] Port Lumina to PyTorch for H100
