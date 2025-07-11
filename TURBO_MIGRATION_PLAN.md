# Turbo Repo Migration Plan

## Overview
Convert the current monolithic Prism-TS repository into a Turbo monorepo with pnpm workspaces. This will allow us to develop multiple packages (core, confidence library, CLI, etc.) in a coordinated way.

## Benefits
- **Better separation of concerns** - Core language vs tools vs libraries
- **Easier to add new packages** - Like the confidence extraction library
- **Shared dependencies** - pnpm's efficient node_modules handling
- **Parallel builds** - Turbo's caching and parallel execution
- **Easier versioning** - Independent package versions

## New Structure
```
prism-ts/
├── apps/
│   ├── cli/                    # CLI application
│   └── repl/                   # REPL application
├── packages/
│   ├── prism-core/            # Core language (parser, runtime, etc.)
│   ├── prism-confidence/      # Confidence extraction library (future)
│   └── prism-llm/             # LLM provider integrations
├── examples/                   # Example Prism programs
├── docs/                      # Documentation
├── turbo.json                 # Turbo configuration
├── pnpm-workspace.yaml        # pnpm workspace configuration
├── package.json               # Root package.json
└── tsconfig.json              # Root TypeScript config
```

## Migration Steps

### Step 1: Install Dependencies
```bash
npm install -g pnpm
pnpm add -D turbo -w
```

### Step 2: Create Configuration Files

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Step 3: Reorganize Code

1. **Create packages/prism-core/**
   - Move src/core/* → packages/prism-core/src/
   - Move src/confidence/* → packages/prism-core/src/confidence/
   - Move src/context/* → packages/prism-core/src/context/
   - Create packages/prism-core/package.json

2. **Create packages/prism-llm/**
   - Move src/llm/* → packages/prism-llm/src/
   - Create packages/prism-llm/package.json

3. **Create apps/cli/**
   - Move src/cli.ts → apps/cli/src/index.ts
   - Create apps/cli/package.json

4. **Create apps/repl/**
   - Move src/repl/* → apps/repl/src/
   - Move src/index.ts → apps/repl/src/cli.ts
   - Create apps/repl/package.json

### Step 4: Update Package.json Files

**Root package.json:**
```json
{
  "name": "prism-ts",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev --filter=@prism/repl"
  },
  "devDependencies": {
    "turbo": "latest",
    "@types/node": "^20.11.30",
    "typescript": "^5.4.3"
  }
}
```

**packages/prism-core/package.json:**
```json
{
  "name": "@prism/core",
  "version": "1.0.21",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@prism/llm": "workspace:*"
  }
}
```

**packages/prism-llm/package.json:**
```json
{
  "name": "@prism/llm",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "node-fetch": "^3.3.2",
    "dotenv": "^16.5.0"
  }
}
```

**apps/cli/package.json:**
```json
{
  "name": "@prism/cli",
  "version": "1.0.21",
  "bin": {
    "prism": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "@prism/core": "workspace:*",
    "@prism/repl": "workspace:*"
  }
}
```

### Step 5: Update Imports

Update all import statements to use the new package names:
```typescript
// Before
import { Parser } from '../core/parser';

// After
import { Parser } from '@prism/core';
```

### Step 6: Update CI/CD

Update GitHub Actions or other CI/CD pipelines to use pnpm:
```yaml
- uses: pnpm/action-setup@v2
  with:
    version: 8
- run: pnpm install
- run: pnpm build
- run: pnpm test
```

## Estimated Time: 2-3 hours

The migration is straightforward because:
1. The code is already well-organized into modules
2. No complex build configurations to migrate
3. Tests can remain mostly unchanged
4. The existing npm package can be published from packages/prism-core

## Risks & Mitigations

1. **Import path updates** - Use find/replace, TypeScript will catch any misses
2. **Test configuration** - May need to update Jest configs for each package
3. **Publishing workflow** - Need to update npm publish scripts

## Next Steps After Migration

1. Add the confidence extraction library as a new package
2. Consider splitting the REPL into its own publishable package
3. Add more specialized packages (prism-web, prism-security, etc.)

This migration sets up Prism for sustainable growth as an ecosystem rather than just a single package.