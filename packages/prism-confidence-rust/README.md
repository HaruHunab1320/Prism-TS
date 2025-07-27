# Prism Confidence - Rust Implementation

This is a Rust port of the TypeScript `@prism-lang/confidence` library, providing confidence extraction capabilities for the Prism language ecosystem.

## Overview

The Prism Confidence library provides standardized patterns for extracting and calibrating confidence values from LLMs and other sources. This Rust implementation maintains API compatibility with the TypeScript version while leveraging Rust's performance and safety guarantees.

## Features

- Confidence extraction from various sources
- Calibration algorithms for confidence values
- Pattern matching for confidence expressions
- Ensemble methods for combining multiple confidence sources
- Zero-copy parsing where possible
- Thread-safe implementations

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
prism-confidence = "0.1.0"
```

## Usage

```rust
use prism_confidence::{ConfidenceExtractor, Calibrator, CalibrationMethod};

fn main() {
    // Example usage will be added as the library is implemented
    let extractor = ConfidenceExtractor::new();
    let calibrator = Calibrator::new(CalibrationMethod::Platt);
}
```

## Development Status

This library is currently in development as a port of the TypeScript implementation. Core functionality is being implemented to match the original library's API while taking advantage of Rust's type system and performance characteristics.

## Building

```bash
cargo build
cargo test
cargo doc --open
```

## License

MIT