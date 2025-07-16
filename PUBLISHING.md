# Publishing Packages

We use pnpm workspaces + Turborepo. Here's how to publish:

## Quick Commands

```bash
# Build all packages with Turbo
pnpm turbo run build

# Publish a single package
pnpm publish --filter @prism-lang/core --access public

# Publish all packages
pnpm publish -r --access public

# Bump version and publish
pnpm --filter @prism-lang/core version patch
pnpm publish --filter @prism-lang/core --access public
```

## That's it! 

pnpm automatically handles `workspace:*` → version conversion during publish.

## Publishing Order

If you need to publish in order due to dependencies:
```bash
pnpm publish --filter @prism-lang/core --access public
pnpm publish --filter @prism-lang/confidence --access public  
pnpm publish --filter @prism-lang/llm --access public
pnpm publish --filter @prism-lang/repl --access public
pnpm publish --filter @prism-lang/cli --access public
```

## Verify Published Packages

```bash
npm view @prism-lang/core
npm view @prism-lang/confidence
npm view @prism-lang/llm
```