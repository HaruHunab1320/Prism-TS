# Publishing Packages

We standardize on **Changesets** for versioning and publishing in this monorepo.

## Release Workflow (Recommended)

```bash
# 1) Create a changeset
pnpm release:create

# 2) Check what will be released
pnpm release:check

# 3) Apply version bumps + changelogs
pnpm release:version

# 4) Build + publish + push tags
pnpm release:publish
```

## Notes

- Do **not** run `pnpm publish` directly. It will not manage workspace protocols correctly.
- Changesets handles `workspace:*` dependency replacement during publishing.
- All @prism-lang/* packages should remain in sync via Changesets.

## Verify Published Packages

```bash
npm view @prism-lang/core
npm view @prism-lang/confidence
npm view @prism-lang/llm
```
