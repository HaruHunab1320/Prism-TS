# Scripts

## Publishing Packages

We standardize on **Changesets** for versioning and publishing.

### Recommended Flow

```bash
# 1) Create a changeset
pnpm release:create

# 2) Review what will be released
pnpm release:check

# 3) Apply version bumps + changelogs
pnpm release:version

# 4) Build + publish + push tags
pnpm release:publish
```

### Why Changesets

- Safely replaces `workspace:*` during publish
- Keeps versions in sync across packages
- Generates changelogs automatically

### Legacy Script (Manual Bumps)

`scripts/bump-version.mjs` still exists for emergency/manual version changes, but it is **not** the standard workflow.

```bash
pnpm bump-version --package @prism-lang/core --type patch
```
   
These tools automatically handle workspace protocol replacement during publishing.
