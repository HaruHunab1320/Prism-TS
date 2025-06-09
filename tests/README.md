# Prism Test Suite

This directory contains all tests for the Prism language implementation, organized by category.

## Directory Structure

### `/operators`
Individual tests for each of the 18 confidence-aware operators:
- `test-confidence-extraction.ts` - Tests for `<~` operator
- `test-confidence-chaining.ts` - Tests for `~~` operator
- `test-confidence-coalesce.ts` - Tests for `~??` operator
- `test-confidence-logical.ts` - Tests for `~&&` and `~||` operators
- `test-confidence-arithmetic.ts` - Tests for `~+`, `~-`, `~*`, `~/` operators
- `test-confidence-comparison.ts` - Tests for `~==`, `~!=`, `~>`, `~<`, `~>=`, `~<=` operators
- `test-confidence-property.ts` - Tests for `~.` operator
- `test-parallel-confidence.ts` - Tests for `~||>` operator
- `test-threshold-gate.ts` - Tests for `~@>` operator

### `/integration`
System-level integration tests:
- `test-real-gemini.ts` - Real Gemini API integration tests
- `test-llm-providers.ts` - LLM provider system tests
- `test-repl-session.ts` - REPL functionality tests
- `test-edge-cases.ts` - Edge case handling tests
- `test-scoping-fixes.ts` - Variable scoping tests
- `comprehensive-real-test.ts` - Full system test suite

### `/benchmarks`
Performance benchmarks:
- `benchmark-comparison.ts` - Prism vs Traditional JavaScript comparison

### `/utils`
Test utilities and helpers (to be added as needed)

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Category
```bash
# Operator tests
npm test tests/operators

# Integration tests
npm test tests/integration

# Benchmarks
npm test tests/benchmarks
```

### Run Individual Test
```bash
npm test tests/operators/test-confidence-extraction.ts
```

## Test Coverage

Current test coverage: **100%** (191/191 tests passing)

- Core language features: ✅
- All 18 operators: ✅
- LLM integration: ✅
- REPL functionality: ✅
- Edge cases: ✅
- Variable scoping: ✅

## Writing New Tests

When adding new tests:
1. Place operator tests in `/operators`
2. Place integration tests in `/integration`
3. Place performance tests in `/benchmarks`
4. Follow the existing naming convention: `test-[feature-name].ts`
5. Ensure tests are self-contained and don't depend on external state

## Test Dependencies

Tests use the following:
- Jest for test framework
- TypeScript for type safety
- Mock LLM providers for offline testing
- Real LLM providers for integration tests (requires API keys)