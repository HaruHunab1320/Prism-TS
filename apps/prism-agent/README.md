# Prism Agent (Preview)

Local-first CLI coding agent targeting feature parity with Claude Code CLI, powered by Prism orchestrations.

## Status
Experimental scaffolding. Commands currently stream placeholder output while we build the orchestration + tool runners described in `dev-docs/CLI_AGENT_ROADMAP.md`.

## Scripts

```bash
# Run in dev mode with hot reload
pnpm --filter @prism-lang/prism-agent dev

# Build to dist/
pnpm --filter @prism-lang/prism-agent build

# Execute the compiled CLI
pnpm --filter @prism-lang/prism-agent start -- chat "Hello agent"
```

## Next Steps
- Flesh out chat/tool adapters using `@prism-lang/core` + `@prism-lang/llm`.
- Wire repo context indexing + plan execution.
- Integrate with Parallax for multi-agent execution once local MVP is stable.
