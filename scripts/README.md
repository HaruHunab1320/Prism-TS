# Scripts

## Publishing Packages

### The workspace:* Protocol

When working in a monorepo with pnpm/npm/yarn workspaces, dependencies between packages in the same repo use the `workspace:*` protocol. This is **essential for development** as it ensures:
- Changes in one package are immediately reflected in others
- No need to publish packages to test changes locally
- Faster development workflow

However, `workspace:*` **must be replaced with actual version numbers before publishing to npm**.

### Why This Matters

If you publish packages with `workspace:*` dependencies, users outside your monorepo will get errors like:
```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND  "@prism-lang/core@workspace:*" is in the dependencies 
but no package named "@prism-lang/core" is present in the workspace
```

### Solution

Use the `publish-packages.js` script which:
1. **Temporarily** replaces `workspace:*` with actual version numbers
2. Builds all packages
3. Publishes packages in the correct order (dependencies first)
4. **Restores** the original `workspace:*` references after publishing
5. Checks if versions are already published to avoid duplicates

### Usage

```bash
# Just run the script - it handles everything!
node scripts/publish-packages.js

# To see what would be changed without publishing:
node scripts/publish-packages.js --dry-run
```

### How It Works

1. **Before Publishing**: Your package.json files keep `workspace:*`
2. **During Publishing**: Script temporarily replaces with real versions
3. **After Publishing**: Script restores `workspace:*` for continued development

This means you get the best of both worlds:
- Local development uses workspace protocol
- Published packages have proper version numbers

### Manual Publishing

If you need to publish manually:

```bash
# 1. Build everything first
pnpm turbo run build

# 2. Publish in dependency order
cd packages/prism-core && npm publish
cd packages/prism-confidence && npm publish  
cd packages/prism-llm && npm publish
cd apps/repl && npm publish
cd apps/cli && npm publish
```

### Preventing Future Issues

1. Always use the publish script instead of publishing directly
2. Consider using tools like:
   - [changesets](https://github.com/changesets/changesets)
   - [lerna](https://lerna.js.org/)
   - [nx release](https://nx.dev/features/manage-releases)
   
These tools automatically handle workspace protocol replacement during publishing.