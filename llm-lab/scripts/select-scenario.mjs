#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET = path.join(__dirname, '..', 'datasets', 'generated', 'prism_orchestration.jsonl');

function usage() {
  console.log(`Usage: node select-scenario.mjs <scenario-id> [--limit N] [--export DIR]

Examples:
  node select-scenario.mjs launch_readiness_gate
  node select-scenario.mjs security_review_chain --limit 3 --export /tmp/parallax-samples
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (!args.length) {
    usage();
    process.exit(1);
  }

  let scenarioId;
  let limit = 1;
  let exportDir;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--limit') {
      const next = args[i + 1];
      if (!next) {
        console.error('Missing value after --limit');
        process.exit(1);
      }
      limit = Number(next);
      i++;
    } else if (arg === '--export') {
      const next = args[i + 1];
      if (!next) {
        console.error('Missing directory after --export');
        process.exit(1);
      }
      exportDir = next;
      i++;
    } else if (!scenarioId) {
      scenarioId = arg;
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
      process.exit(1);
    }
  }

  if (!scenarioId) {
    usage();
    process.exit(1);
  }

  return { scenarioId, limit, exportDir };
}

function loadDataset() {
  if (!fs.existsSync(DATASET)) {
    console.error(`Dataset not found at ${DATASET}. Run generate-dataset.mjs first.`);
    process.exit(1);
  }
  return fs
    .readFileSync(DATASET, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function exportSamples(samples, exportDir, scenarioId) {
  if (!exportDir) return;
  fs.mkdirSync(exportDir, { recursive: true });
  samples.forEach((sample, index) => {
    const baseName = `${scenarioId}-${index + 1}`;
    const prismPath = path.join(exportDir, `${baseName}.prism`);
    const metadataPath = path.join(exportDir, `${baseName}.json`);
    fs.writeFileSync(prismPath, sample.prism, 'utf8');
    const metadata = {
      template: sample.template,
      plan: sample.plan,
      brief: sample.brief,
      ticket: sample.ticket,
      dialogue: sample.dialogue,
      scenario: sample.scenario,
      references: sample.references,
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`Exported ${baseName}.prism + metadata`);
  });
}

function main() {
  const { scenarioId, limit, exportDir } = parseArgs();
  const dataset = loadDataset();
  const matches = dataset.filter((sample) => sample.scenario && sample.scenario.id === scenarioId);

  if (!matches.length) {
    console.error(`No samples found for scenario "${scenarioId}".`);
    process.exit(1);
  }

  const selected = matches.slice(0, Math.max(1, limit));
  selected.forEach((sample, index) => {
    console.log(`\n# Sample ${index + 1} (${sample.template})`);
    console.log(`Brief: ${sample.brief}`);
    if (sample.ticket) {
      console.log(`Ticket: ${sample.ticket.subject}`);
    }
    console.log(`Plan steps: ${sample.plan.map((step) => step.step || step).join(', ')}`);
    if (sample.dialogue) {
      console.log('Dialogue:');
      sample.dialogue.forEach((line) => {
        console.log(`  - ${line.speaker}: ${line.text}`);
      });
    }
  });

  exportSamples(selected, exportDir, scenarioId);
}

main();
