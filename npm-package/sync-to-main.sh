#!/bin/bash

# Sync npm-package changes to main Prism-TS core

echo "Syncing npm-package changes to main Prism-TS..."

# Copy modified implementation files
echo "Copying modified implementation files..."
cp src/core/ast.ts ../../Prism-TS/src/core/
cp src/core/parser.ts ../../Prism-TS/src/core/
cp src/core/runtime.ts ../../Prism-TS/src/core/
cp src/core/tokenizer.ts ../../Prism-TS/src/core/

# Copy new test files
echo "Copying new test files..."
cp src/core/confidence-destructuring.test.ts ../../Prism-TS/src/core/
cp src/core/destructuring-params.test.ts ../../Prism-TS/src/core/
cp src/core/destructuring.test.ts ../../Prism-TS/src/core/
cp src/core/instanceof.test.ts ../../Prism-TS/src/core/
cp src/core/typeof.test.ts ../../Prism-TS/src/core/

# Copy modified test files
echo "Copying modified test files..."
cp src/core/loops.test.ts ../../Prism-TS/src/core/

# Copy documentation
echo "Copying documentation..."
cp docs/CONFIDENCE_DESTRUCTURING.md ../../Prism-TS/docs/

# Update FUTURE_FEATURES.md
echo "Updating FUTURE_FEATURES.md..."
cp ../docs/FUTURE_FEATURES.md ../../Prism-TS/docs/

echo "Sync complete!"
echo ""
echo "Files synced:"
echo "- Implementation: ast.ts, parser.ts, runtime.ts, tokenizer.ts"
echo "- New tests: confidence-destructuring.test.ts, destructuring-params.test.ts, destructuring.test.ts, instanceof.test.ts, typeof.test.ts"
echo "- Modified tests: loops.test.ts"
echo "- Documentation: CONFIDENCE_DESTRUCTURING.md, FUTURE_FEATURES.md"