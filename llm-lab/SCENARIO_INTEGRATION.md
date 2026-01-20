# Scenario → Parallax Integration

Use this playbook to take a scenario from the synthetic dataset and exercise it inside the Parallax stack.

## 1. Select a Scenario Sample

```bash
# Regenerate dataset to ensure samples + YAML are up to date
pnpm --filter @prism-lang/core build
node llm-lab/scripts/generate-dataset.mjs

# Inspect and optionally export samples for a scenario
node llm-lab/scripts/select-scenario.mjs launch_readiness_gate --limit 2 --export /tmp/parallax-samples
```

This command prints ticket/dialogue context for the first two samples and writes:
- `/tmp/parallax-samples/launch_readiness_gate-1.prism`
- `/tmp/parallax-samples/launch_readiness_gate-1.json` (plan + metadata)

Repeat for other scenario IDs (see `llm-lab/scenarios/scenarios.yaml` for the canonical list).

## 2. Load into Parallax
1. Copy the exported `.prism` file into the Parallax repo (e.g., `parallax/patterns/custom/launch-readiness-gate.prism`).
2. Start Parallax (from `/Users/jakobgrant/Workspaces/parallax`):
   ```bash
   pnpm install
   pnpm start          # or pnpm run dev:monitor for observability
   ```
3. Register mock agents or real services required by the scenario (consult the `structuredSpec` in `scenarios.yaml` for required capabilities).
4. Execute the pattern via the Parallax CLI or API:
   ```bash
   pnpm run demo:patterns -- --pattern custom/launch-readiness-gate.prism --input ./input.json
   ```
   where `input.json` matches the scenario’s `inputs` definition.

## 3. Capture Results
- Store execution logs/metrics next to the exported sample so you can compare Prism runtime vs Parallax runtime.
- Update `llm-lab/scenarios/scenarios.yaml` if you discover new decision points, escalations, or agent requirements during the Parallax run.

## Tips
- Tickets/dialogues in each sample can seed user stories or incident write-ups inside Parallax dashboards.
- The `plan` array is intentionally simple—map each step to an existing Parallax agent or pattern, or implement lightweight mocks to simulate responses.
- If a scenario needs additional helpers (e.g., telemetry stubs), add them to both the Parallax prelude and `llm-lab/scripts/run-dataset.mjs` to keep behavior aligned.
