# Integration Test for prism-uncertainty

This script tests the published npm package to ensure everything works end-to-end.

## What it tests

1. **NPM Installation** - Installs `prism-uncertainty` from npm registry
2. **Library API** - Tests all major Prism class methods and runPrism function
3. **CLI Functionality** - Tests `prism eval` and `prism run` commands
4. **Operator Coverage** - Verifies all 18 confidence operators work correctly
5. **Language Features** - Tests uncertain if statements, contexts, etc.

## Running the test

```bash
./test-npm-package.js
```

Or:

```bash
node test-npm-package.js
```

## What you'll see

The script will:
- Create a temporary directory
- Install the package fresh from npm
- Run comprehensive tests
- Show detailed results for each test
- Clean up automatically

## Expected output

```
🧪 Integration Test: prism-uncertainty npm package
==================================================

📁 Created test directory: /tmp/prism-test-1234567890

1️⃣ Testing npm installation...
✅ Package installed successfully

2️⃣ Testing library API...
✅ All library API tests passed!

3️⃣ Testing CLI functionality...
✅ CLI eval test passed
✅ CLI file execution test passed

4️⃣ Testing operator coverage...
✅ Operator coverage tests passed

🎉 INTEGRATION TEST SUMMARY
============================
✅ NPM installation successful
✅ Library API functional
✅ CLI commands working
✅ All 18 operators operational
✅ Prism language features verified

🚀 prism-uncertainty package is ready for production use!
```

## Troubleshooting

If tests fail:
1. Ensure you have Node.js 16+ installed
2. Check npm registry connectivity
3. Verify package was published correctly
4. Check CLI permissions if global install fails

This test verifies that users will have a smooth experience installing and using Prism from npm.