# LLM Lab

Experimental workspace for training and evaluating small models that speak Prism. Use this folder to store datasets, training configs, evaluation scripts, and any notes around calibration/uncertainty.

## Suggested Structure

```
llm-lab/
  datasets/               # Prism code + reasoning pairs (jsonl/parquet)
  scripts/                # Data prep / training / evaluation helpers
  notebooks/              # Exploration notebooks (.ipynb, etc.)
```

This folder is deliberately outside the pnpm/turbo pipelines—use whatever tooling (Python, PyTorch, Axolotl, etc.) makes sense.

## Generating Synthetic Orchestration Data

We ship a generator that instantiates common Prism orchestration templates, validates them, and saves the results as JSONL (metadata + execution plan + Prism source). Run:

```bash
# Build core once so dist/index.js exists
pnpm --filter @prism-lang/core build

# Generate 300+ Prism samples
node llm-lab/scripts/generate-dataset.mjs
```

The output lives under `llm-lab/datasets/generated/prism_orchestration.jsonl`. Each line looks like:

```json
{
  "template": "llm_fallback_chain",
  "metadata": { "threshold": 0.78 },
  "plan": [
    { "step": "premium_attempt", "capability": "premiumLLM" },
    { "step": "standard_attempt", "capability": "standardLLM" },
    { "step": "budget_attempt", "capability": "budgetLLM" }
  ],
  "brief": "Try premium, standard, then budget providers until one clears 0.78 confidence.",
  "planNarrative": [
    "Iterate through every provider in order.",
    "Stop once a candidate clears the target confidence.",
    "Fallback to the budget model if none succeed."
  ],
  "scenario": {
    "id": "launch_readiness_gate",
    "title": "Launch Readiness Gate",
    "description": "Production test checklist verifies infrastructure services, pattern demos, dashboards, and tracing before giving a go signal.",
    "structuredSpec": {
      "goal": "Certify the platform is production ready before a launch.",
      "inputs": [
        { "name": "test_suite", "type": "string", "values": ["full", "smoke"] },
        { "name": "services", "type": "list", "description": "Infra services (etcd, postgres, redis, etc.)." }
      ],
      "signals": [
        { "name": "infra_health", "source": "infrastructure monitors", "confidence": ">=0.9 requires all services healthy" }
      ],
      "decisionPoints": [
        { "name": "launch_gate", "condition": "dashboards & tracing live", "pass": "GO", "fail": "HOLD + escalate" }
      ],
      "escalationPaths": [
        { "trigger": "Observability offline", "destination": "SRE on-call", "actions": ["restart services", "open incident"] }
      ],
      "outputs": [
        { "name": "readiness_report", "description": "Checklist of gates + GO/NOGO decision." }
      ]
    }
  },
  "references": [
    {
      "source": "parallax/ROADMAP.md#LLM Provider Strategy",
      "summary": "Different LLM tiers can be sequenced to balance quality, latency, and cost.",
      "quote": "Premium vs standard vs budget LLMs provide trade-offs for orchestration."
    }
  ],
  "ticket": {
    "subject": "Readiness gate for EU launch",
    "body": "We need a GO/NO-GO call for tomorrow’s EU region rollout... (etc)"
  },
  "dialogue": [
    { "speaker": "SRE", "text": "Infra checks are green now, but observability lagged." },
    { "speaker": "Program Manager", "text": "Stakeholders need proof dashboards stream live before we flip the switch." }
  ],
  "prism": "/* Prism orchestration */"
}
```

Each row includes doc-grounded references **and** a structured scenario spec (expressed as JSON here, and exported below) so downstream tooling can cite why a pattern exists, reason about inputs/decision points, and validate agent orchestration requirements. Use those to condition LLM prompts or evaluate retrieval quality. After generation you can execute every sample against a mock runtime to ensure it actually runs end to end:

```bash
node llm-lab/scripts/run-dataset.mjs
```

Every sample captures both structured plans and natural-language context (`brief`, `planNarrative`, `ticket`, `dialogue`) so you can fine-tune NL→plan→Prism models or evaluate agents that reason over textual instructions.

### Scenario Specs
- Running `node llm-lab/scripts/generate-dataset.mjs` also refreshes `llm-lab/scenarios/scenarios.yaml`, a YAML catalog of every scenario (`goal`, `inputs`, `signals`, `decisionPoints`, `escalationPaths`, `outputs`, `references`).
- Edit `scenarioCatalog` inside `generate-dataset.mjs` to add or tweak canonical contexts (customer escalation, fraud triage, data egress review, incident response, experimentation loops, etc.); the YAML file is regenerated automatically for easy inspection or downstream tooling.
- These specs keep the NL briefs grounded and give you a schema to validate orchestrations independently of the Prism code.
- Use `node llm-lab/scripts/select-scenario.mjs <scenario-id> [--limit N] [--export DIR]` to grab ready-to-run Prism samples (plus ticket/dialogue context) before loading them into Parallax—see `SCENARIO_INTEGRATION.md` for the end-to-end flow.

This script injects mock agents/helpers (pattern registry, knowledge base, agent factory, telemetry, diagnostics, readiness sensors, etc.) before executing each sample with `@prism-lang/core`.

### Current Template Coverage
- Agent routers (single-shot, consensus, confidence router, LLM fallback)
- Exploration pipelines (parallel scouts, cascades, multi-validator governance, experimentation loops)
- Registry/KB workflows (meta pattern composer, enrichment, agent factory)
- Risk/compliance operations (fraud triage, data egress review, compliance audits, governance routers)
- Incident response + operations primitives (telemetry logging, diagnostics, readiness sensors, human escalation)
- Advanced control flow (do…while alignment, C-style `for`, `for … in`, `uncertain if/while`)

Feel free to add more orchestration archetypes—just keep the helper surface mirrored between `generate-dataset.mjs` and `run-dataset.mjs`, regenerate, and re-run to confirm `node llm-lab/scripts/run-dataset.mjs` stays green.
