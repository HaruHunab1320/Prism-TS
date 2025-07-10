# Repository Consolidation Plan

## Overview
This document outlines the plan to consolidate the Prism-TS dual-repository structure into a single, maintainable codebase while preserving the `prism-uncertainty` npm package and ensuring zero disruption to existing users.

## Current State
- **Main repo**: Development hub at `/Prism-TS` (internal v1.0.0)
- **NPM package**: Public distribution at `/Prism-TS/npm-package` (v1.0.21)
- **Problem**: Manual synchronization, duplicate testing, confusion about source of truth
- **Opportunity**: Both directories now contain identical core functionality

## Goals
1. **Zero disruption** to npm users - package name, API, and functionality unchanged
2. **Single source of truth** for all code
3. **Simplified development** workflow
4. **Preserve download momentum** (maintaining package identity)
5. **Easy rollback** if needed

## Migration Strategy

### Phase 1: Preparation (1-2 hours)
1. Create new branch: `consolidation-refactor`
2. Full backup of current state
3. Document current npm package structure
4. Ensure all tests passing in both locations

### Phase 2: Restructure Main Repository (2-3 hours)

#### New Structure:
```
Prism-TS/
├── src/                    # All source code (unchanged)
├── tests/                  # Consolidated test suite
├── docs/                   # All documentation
├── examples/               # Example code
├── website/                # Website source
├── dist/                   # Build output (gitignored)
├── package.json            # NPM package configuration
├── package-main.json       # Backup of original
├── tsconfig.json          
├── jest.config.js         
├── .npmignore             # Controls what gets published
└── README.md              # User-facing readme
```

#### Key Changes:
1. **Merge package.json files**:
   ```json
   {
     "name": "prism-uncertainty",  // Keep npm package name!
     "version": "1.0.21",         // Keep current version
     "description": "Production-ready implementation of the Prism language",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "bin": {
       "prism": "./dist/cli.js"
     },
     // ... rest of npm-package config
   }
   ```

2. **Update .npmignore**:
   ```
   # Don't publish these to npm
   /tests/
   /examples/
   /website/
   /docs/internal/
   /benchmarks/
   *.test.ts
   *.spec.ts
   ARCHITECTURE.md
   DEVELOPMENT.md
   VISION.md
   ```

3. **Build process**:
   ```json
   "scripts": {
     "build": "tsc",
     "prepublishOnly": "npm run build && npm test",
     "test": "jest",
     "test:integration": "jest --testPathPattern=integration"
   }
   ```

### Phase 3: Consolidate Tests (1-2 hours)
1. Merge test files from both locations
2. Remove duplicates
3. Organize into:
   ```
   tests/
   ├── unit/          # Unit tests
   ├── integration/   # Integration tests
   └── fixtures/      # Test fixtures
   ```

### Phase 4: Update CI/CD (1 hour)
1. GitHub Actions for:
   - Test on PR
   - Build on merge to main
   - Publish to npm on version tag
2. Add `.github/workflows/publish.yml`:
   ```yaml
   name: Publish to NPM
   on:
     push:
       tags:
         - 'v*'
   jobs:
     publish:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npm test
         - run: npm run build
         - run: npm publish
           env:
             NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
   ```

### Phase 5: Migration Steps (2-3 hours)

```bash
# 1. Create branch
git checkout -b consolidation-refactor

# 2. Backup current package.json
cp package.json package-main.json

# 3. Copy npm-package files to root
cp npm-package/package.json .
cp npm-package/.eslintrc.js .
cp npm-package/.npmignore .

# 4. Merge dependencies
# (manually merge dev dependencies from package-main.json)

# 5. Copy missing tests
cp npm-package/src/core/*.test.ts src/core/

# 6. Update build configuration
# Ensure tsconfig.json outputs to dist/

# 7. Test build process
npm run build
npm test

# 8. Test npm pack locally
npm pack --dry-run
# Verify only desired files are included

# 9. Remove npm-package directory
rm -rf npm-package/

# 10. Update imports and paths if needed
```

### Phase 6: Testing & Validation (1 hour)
1. Run all tests
2. Build package
3. Test CLI locally: `node dist/cli.js`
4. Create test project and install local package:
   ```bash
   npm pack
   cd /tmp/test-prism
   npm install /path/to/prism-uncertainty-1.0.21.tgz
   # Test usage
   ```

### Phase 7: Documentation Updates (30 min)
1. Update README with contribution guidelines
2. Add CONTRIBUTING.md
3. Update development setup instructions
4. Archive migration notes

## Rollback Plan
If issues arise:
1. The `npm-package/` directory remains in git history
2. Can revert to previous commit
3. Original `package-main.json` preserved
4. No changes to npm until manually published

## Success Criteria
- [ ] All tests passing
- [ ] `npm pack` includes only production files
- [ ] CLI works correctly
- [ ] Can install and use package locally
- [ ] Documentation updated
- [ ] No breaking changes to API

## Timeline
- **Estimated total time**: 8-12 hours
- **Best done in one focused session** to avoid partial state
- **Test extensively** before npm publish

## Post-Migration Benefits
1. **Single place for changes** - no more sync scripts
2. **Unified testing** - run once, not twice
3. **Clear contribution path** - contributors know where to make changes
4. **Simplified releases** - tag and publish
5. **Better CI/CD** - automated publishing

## Notes for Implementation
- Keep the npm package name `prism-uncertainty` - don't break existing users!
- Version continues from 1.0.21
- First release after consolidation should be 1.0.22 (patch bump)
- Consider adding changelog generation
- Set up semantic versioning

## Commands Preserved for Users
Users will see no change:
```bash
npm install prism-uncertainty
npx prism run script.prism
```

Everything works exactly as before, just maintained more efficiently!