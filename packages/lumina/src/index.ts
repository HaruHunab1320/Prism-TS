/**
 * Lumina: A Superposition-Native LLM Architecture
 *
 * Lumina is an experimental architecture designed to maintain probability distributions
 * through computation rather than collapsing to point estimates. It provides:
 *
 * - Distributional propagation (soft embeddings instead of hard token selection)
 * - Explicit confidence heads with calibration training
 * - Branching computation for parallel hypothesis exploration
 * - Confidence-gated attention mechanisms
 *
 * This architecture is designed to natively support the Prism programming language's
 * uncertainty-first paradigm.
 *
 * @packageDocumentation
 */

// Core types and confidence system
export * from './core';

// Neural network layers
export * from './layers';

// Inference components
export * from './inference';

// Training objectives
export * from './training';

/**
 * Lumina version.
 */
export const VERSION = '0.1.0';

/**
 * Architecture summary for documentation.
 */
export const ARCHITECTURE_SUMMARY = `
Lumina is a superposition-native LLM architecture that maintains probability
distributions through computation, collapsing only at explicit observation points.

Key Components:
1. Distributional Propagation - Soft embeddings instead of hard token selection
2. Confidence Head - Explicit, calibrated uncertainty estimation
3. Branching Computation - Fork on high entropy, prune on low confidence
4. Confidence-Gated Attention - Downweight uncertain information in reasoning

This architecture is designed to natively support Prism's uncertainty operators:
- ~> (confidence assignment) maps to confidence head output
- ~||> (parallel confidence) maps to branch selection
- uncertain if/while/for maps to branching computation

"The probability wave is the reality. Collapse is the approximation."
`;
