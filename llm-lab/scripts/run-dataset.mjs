#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET = path.join(__dirname, '..', 'datasets', 'generated', 'prism_orchestration.jsonl');
const defaultAgents = [
  'atlas',
  'daedalus',
  'helix',
  'cobalt',
  'meridian',
  'patternComposer',
  'dataEnricher',
  'businessAnalyst',
  'premiumLLM',
  'standardLLM',
  'budgetLLM',
  'sentinel',
  'arbiter',
  'auditor',
  'voyager',
  'delta',
  'nova',
  'odyssey',
  'humanDesk',
  'policyBoard',
  'humanReviewer',
  'fallback',
  'escalation',
];

function loadDistExports() {
  const distEntry = path.join(__dirname, '..', '..', 'packages', 'prism-core', 'dist', 'index.js');
  if (!fs.existsSync(distEntry)) {
    console.error('Missing packages/prism-core/dist/index.js – run "pnpm --filter @prism-lang/core build" first.');
    process.exit(1);
  }
  return import(distEntry);
}

function buildPrelude(agentNames) {
  const agentDefs = agentNames
    .map((name) => `${name} = makeAgent("${name}")`)
    .join('\n');

  return `
mod = (value, divisor) => {
  remainder = value
  while (remainder >= divisor) {
    remainder = remainder - divisor
  }
  remainder
}

clamp = (value, minValue, maxValue) => {
  if (value < minValue) {
    return minValue
  }
  if (value > maxValue) {
    return maxValue
  }
  return value
}

agentInvocationTick = 0

computeConfidence = (identifier, payload) => {
  agentInvocationTick = agentInvocationTick + 1
  baseBucket = mod(identifier.length * 13 + agentInvocationTick, 40)
  base = 0.45 + (baseBucket / 100)
  penaltyTrigger = mod(identifier.length + agentInvocationTick, 5)
  if (penaltyTrigger == 0) {
    base = base - 0.15
  }
  clamp(base, 0.35, 0.97)
}

makeAgent = (name) => {
  agent = {
    name: name,
    invoke: (payload) => {
      confidence = computeConfidence(name, payload)
      status = confidence < 0.45 ? "needs_review" : "ok"
      return {
        agent: name,
        payload: payload,
        confidence: confidence,
        status
      }
    }
  }
  agent
}

patternRegistryItems = []
patternRegistry = {
  register: (entry) => {
    patternRegistryItems = patternRegistryItems.push(entry)
    entry
  },
  list: () => patternRegistryItems
}

knowledgeBaseRecords = []
knowledgeBase = {
  upsert: (record) => {
    knowledgeBaseRecords = knowledgeBaseRecords.push(record)
    record
  },
  list: () => knowledgeBaseRecords
}

agentFactoryRegistry = []
agentFactory = {
  create: (spec) => {
    agent = makeAgent(spec.name)
    agentFactoryRegistry = agentFactoryRegistry.push(agent)
    agent
  },
  list: () => agentFactoryRegistry
}

telemetryRecords = []
telemetrySignals = [
  { source: "uptime", severity: "low", confidence: 0.64 },
  { source: "latency", severity: "medium", confidence: 0.58 },
  { source: "traffic", severity: "critical", confidence: 0.83 },
  { source: "billing", severity: "medium", confidence: 0.61 }
]

telemetry = {
  record: (event) => {
    telemetryRecords = telemetryRecords.push(event)
    event
  },
  signals: () => telemetrySignals
}

diagnosticEntries = []
diagnostics = {
  info: (label, payload) => {
    entry = { level: "info", label, payload }
    diagnosticEntries = diagnosticEntries.push(entry)
    entry
  },
  warn: (label, payload) => {
    entry = { level: "warn", label, payload }
    diagnosticEntries = diagnosticEntries.push(entry)
    entry
  }
}

readinessState = { level: 0.55, confidence: 0.52 }
readinessSensor = {
  read: () => readinessState,
  settle: () => {
    readinessState = {
      level: readinessState.level + 0.12,
      confidence: readinessState.confidence + 0.06
    }
    readinessState
  },
  boost: () => {
    readinessState = {
      level: readinessState.level + 0.18,
      confidence: readinessState.confidence + 0.08
    }
    readinessState
  }
}

len = (arr) => arr.length

map = (items, fn) => {
  index = 0
  results = []
  while (index < items.length) {
    results = results.push(fn(items[index]))
    index = index + 1
  }
  results
}

all = (items, fn) => {
  index = 0
  while (index < items.length) {
    if (!fn(items[index])) {
      return false
    }
    index = index + 1
  }
  return true
}

normalize = (responses, fn) => map(responses, item => fn(item))

summarize = (input) => {
  summary = {
    summary: "mock summary",
    data: input
  }
  summary
}

log = {
  info: (label, value) => value
}

humanReviewer = makeAgent("humanReviewer")

${agentDefs}

input = {
  task: "demo",
  payload: {
    data: "example",
    priority: "high"
  },
  target_confidence: 0.85
}
`;
}

function now() {
  return Date.now();
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

function getAllAgentNames() {
  return Array.from(new Set(defaultAgents));
}

async function runSample(runtimeExports, preludeAST, sample) {
  const runtime = runtimeExports.createRuntime();
  await runtime.execute(preludeAST);
  const ast = runtimeExports.parse(sample.prism);
  return runtime.execute(ast);
}

async function main() {
  const samples = loadDataset();
  const agentNames = getAllAgentNames();
  const { parse, createRuntime } = await loadDistExports();
  const preludeAST = parse(buildPrelude(agentNames));
  let success = 0;
  let failures = 0;

  for (const sample of samples) {
    try {
      const runtime = createRuntime();
      await runtime.execute(preludeAST);
      const ast = parse(sample.prism);
      const result = await runtime.execute(ast);
      success++;
    } catch (error) {
      failures++;
      console.error(`Failed: ${sample.template}: ${error.message}`);
    }
  }

  console.log(`Executed dataset: ${success} succeeded, ${failures} failed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
