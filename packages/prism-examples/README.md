# Prism Examples

This package contains comprehensive examples of Prism language features. Each example is a fully functional Prism script that demonstrates specific language features with expected outputs.

## Purpose

1. **Documentation**: Serve as living documentation for the Prism language
2. **LLM Training**: Provide verified working examples for training LLMs to understand Prism
3. **Testing**: Ensure all language features work correctly
4. **Learning**: Help developers learn Prism through examples

## Structure

```
examples/
├── 01-basic-syntax/          # Basic language features
├── 02-control-flow/          # If/else, loops, switch
├── 03-functions/             # Function declarations and calls
├── 04-objects-arrays/        # Data structures
├── 05-confidence-operators/  # Confident operators (~, ~?, etc.)
├── 06-modules/               # Module system and imports
├── 07-async-await/           # Asynchronous programming
├── 08-error-handling/        # Try/catch and error management
├── 09-advanced-features/     # Decorators, generators, etc.
├── 10-real-world/            # Complete applications
└── 11-patterns/              # Common patterns and idioms
```

## Running Examples

```bash
# Run all examples
npm test

# Run specific category
npm run test:basic-syntax

# Run single example
npx tsx examples/01-basic-syntax/variables.prism
```

## Example Format

Each example follows this structure:

```prism
// filename: example-name.prism
// description: What this example demonstrates
// tags: #feature1 #feature2
// expected: Description of expected output

// === CODE STARTS HERE ===

// Your Prism code here

// === EXPECTED OUTPUT ===
// Expected console output or results
```