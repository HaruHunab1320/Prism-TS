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

### Legacy Script (Removed)

The old manual bump script was removed to avoid conflicting with Changesets.
   
These tools automatically handle workspace protocol replacement during publishing.
