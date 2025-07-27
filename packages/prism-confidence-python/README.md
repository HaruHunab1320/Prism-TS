# Prism Confidence - Python Implementation

This is a Python port of the TypeScript `@prism-lang/confidence` library, providing confidence extraction capabilities for the Prism language ecosystem.

## Overview

The Prism Confidence library provides standardized patterns for extracting and calibrating confidence values from LLMs and other sources. This Python implementation maintains API compatibility with the TypeScript version while leveraging Python's rich data science ecosystem.

## Features

- Confidence extraction from various sources
- Calibration algorithms for confidence values
- Pattern matching for confidence expressions
- Ensemble methods for combining multiple confidence sources
- Integration with popular Python ML libraries

## Installation

```bash
pip install prism-confidence
```

## Usage

```python
from prism_confidence import ConfidenceExtractor, Calibrator

# Example usage will be added as the library is implemented
extractor = ConfidenceExtractor()
calibrator = Calibrator(method="platt")
```

## Development Status

This library is currently in development as a port of the TypeScript implementation. Core functionality is being implemented to match the original library's API.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/HaruHunab1320/Prism-TS.git
cd packages/prism-confidence-python

# Install in development mode
pip install -e .
```

## License

MIT