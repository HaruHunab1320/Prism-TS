#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'datasets', 'generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'prism_orchestration.jsonl');
const SAMPLES_PER_TEMPLATE = 50;

function formatList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const referenceLibrary = {
  single_agent_exec: [
    {
      source: 'parallax/README.md#The Orchestra Philosophy',
      summary: 'Agents stay focused on their expertise while the orchestrator delegates tasks.',
      quote: 'Agents focus solely on their expertise... no coordination logic, no negotiation protocols.'
    }
  ],
  consensus_pattern: [
    {
      source: 'parallax/README.md#Coordination Patterns',
      summary: 'Consensus Builder combines multiple experts to produce a weighted outcome.',
      quote: 'Consensus Builder - Builds weighted consensus from multiple agents.'
    }
  ],
  confidence_router: [
    {
      source: 'parallax/README.md#Coordination Patterns',
      summary: 'Uncertainty Router directs tasks based on confidence thresholds.',
      quote: 'Uncertainty Router - Routes tasks based on confidence levels.'
    }
  ],
  parallel_exploration: [
    {
      source: 'parallax/README.md#Coordination Patterns',
      summary: 'Parallel Exploration launches multiple solution paths simultaneously.',
      quote: 'Parallel Exploration - Explores multiple solution paths.'
    }
  ],
  confidence_cascade: [
    {
      source: 'parallax/README.md#Coordination Patterns',
      summary: 'Confidence Cascade progresses through agents until a target confidence is met.',
      quote: 'Confidence Cascade - Cascades through agents until target confidence.'
    }
  ],
  multi_validator: [
    {
      source: 'parallax/README.md#Coordination Patterns',
      summary: 'Multi-Validator cross-checks proposals across several validators.',
      quote: 'Multi-Validator - Validates across multiple validators.'
    }
  ],
  meta_pattern_composer: [
    {
      source: 'parallax/patterns/',
      summary: 'Patterns are stored and reused across orchestrations.',
      quote: 'patterns/ directory contains coordination templates ready for reuse.'
    }
  ],
  data_enrichment_pipeline: [
    {
      source: 'parallax/ARCHITECTURE.md#Data Plane',
      summary: 'Data-plane services enrich and persist contextual knowledge for agents.',
      quote: 'Data Plane... handles execution engine, caching, and knowledge updates.'
    }
  ],
  human_escalation_loop: [
    {
      source: 'parallax/README.md#Key Features',
      summary: 'Uncertainty-aware coordination treats human escalation as a first-class fallback.',
      quote: 'When experts disagree... reveals trade-offs and suggests parallel exploration paths.'
    }
  ],
  llm_fallback_chain: [
    {
      source: 'parallax/ROADMAP.md#LLM Provider Strategy',
      summary: 'Different LLM tiers can be sequenced to balance quality, latency, and cost.',
      quote: 'Premium vs standard vs budget LLMs provide trade-offs for orchestration.'
    }
  ],
  disagreement_detector: [
    {
      source: 'parallax/README.md#Overview',
      summary: 'Disagreement between experts is valuable signal to capture, not suppress.',
      quote: 'When expert AI agents disagree with high confidence, that\'s not a bug...'
    }
  ],
  meta_agent_factory: [
    {
      source: 'parallax/ARCHITECTURE_V2.md#Agent Registry',
      summary: 'Agent factories provision domain-specific capabilities into the registry.',
      quote: 'The agent registry tracks capabilities and allows dynamic provisioning.'
    }
  ],
  uncertain_governance_router: [
    {
      source: 'parallax/PRODUCTION_DEPLOYMENT_CHECKLIST.md#Governance',
      summary: 'Governance flows route requests through validators, policy boards, and human desks.',
      quote: 'Escalation pathways should include automated reviewers and policy boards.'
    }
  ],
  alignment_do_while: [
    {
      source: 'parallax/ARCHITECTURE.md#Telemetry',
      summary: 'Telemetry captures iterative attempts for later analysis.',
      quote: 'Telemetry and observability are essential for iterative orchestration.'
    }
  ],
  module_quality_audit: [
    {
      source: 'parallax/PRODUCTION_TEST_RESULTS.md',
      summary: 'Module audits capture diagnostics and halt when confidence drops.',
      quote: 'Diagnostics highlight modules that require remediation before proceeding.'
    }
  ],
  readiness_uncertain_loop: [
    {
      source: 'parallax/PRODUCTION_TEST_STATUS.md#Readiness Gates',
      summary: 'Readiness sensors feed uncertain signals to determine go/no-go status.',
      quote: 'Signals are bucketed into high/medium/low readiness bands before launch.'
    }
  ],
  telemetry_signal_inspector: [
    {
      source: 'parallax/monitoring/',
      summary: 'Telemetry pipelines prioritize critical alerts and log informational events.',
      quote: 'Monitoring stack emits signals tagged with severity for triage.'
    }
  ],
};

const scenarioCatalog = {
  customer_escalation_playbook: {
    title: 'Customer Escalation Playbook',
    description: 'Executive, analyst, and risk agents score a proposal before either executing autonomously or escalating to a board review depending on confidence bands.',
    structuredSpec: {
      goal: 'Resolve a Sev-1 customer escalation using multi-agent review and uncertainty thresholds.',
      inputs: [
        { name: 'proposal', type: 'object', description: 'Remediation plan or decision under review.' },
        { name: 'urgency', type: 'string', values: ['sev1', 'sev2', 'sev3'] },
        { name: 'impact_estimate', type: 'number', description: 'Financial or customer impact estimate.' }
      ],
      signals: [
        { name: 'executive_assessment', source: 'agents.executive', confidence: '>=0.8 executes autonomously' },
        { name: 'impact_review', source: 'agents.analyst', confidence: '>=0.75 indicates reliable impact sizing' },
        { name: 'risk_review', source: 'agents.risk', confidence: '>=0.75 indicates mitigated risk' }
      ],
      decisionPoints: [
        {
          name: 'autonomy_gate',
          logic: 'uncertain if (~decision && ~impact && ~risk)',
          outcomes: {
            high: 'Auto execute or notify stakeholders',
            medium: 'Structured review package and conditional execution',
            low: 'Human/board escalation'
          }
        }
      ],
      escalationPaths: [
        { trigger: 'low confidence or impact_estimate > 1_000_000', destination: 'Board meeting', owners: ['ceo', 'cfo', 'risk_officer'] }
      ],
      outputs: [
        { name: 'escalation_result', description: 'Action to take plus presenters/monitoring hooks.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'Sev-1 escalation: Fortune 500 outage fix needed',
          body: `Customer Success flagged a Sev-1 escalation from Apex Systems. Their customer-facing APIs have been down for 47 minutes.
- Latest remediation proposal attached (v3) but the executive sponsor wants confidence-backed sign-off.
- Impact estimate: $2.4M ARR at risk if not resolved in the next hour.
Need an orchestrated decision: auto-execute if we're >0.8 confident, otherwise escalate to the board bridge.`
        },
        {
          subject: 'Follow-up escalation readiness',
          body: `Board meeting scheduled in 45 minutes. Need status on the Apex Systems incident, including confidence bands, before executives join the call.`
        }
      ],
      dialogues: [
        [
          { speaker: 'Support Lead', text: 'We’ve applied two mitigations but telemetry still shows partial failures. Do we trust the latest fix?' },
          { speaker: 'Executive Liaison', text: 'C-level stakeholders demand confirmation within 20 minutes. If risk is still high we must escalate.' },
          { speaker: 'Risk Officer', text: 'My model says confidence is 0.72; not enough for autonomous execution.' },
          { speaker: 'Ops Captain', text: 'Telemetry trace 8471 suggests the blast radius is limited now.' },
          { speaker: 'Support Lead', text: 'Let’s run the multi-agent review and see if any path reaches 0.8 before paging the board.' }
        ],
        [
          { speaker: 'CEO Agent', text: 'Give me a binary answer: can we roll back without customer data loss?' },
          { speaker: 'Risk Analyst', text: 'Rollback carries moderate risk; best path is executing the new fix with strict monitoring.' },
          { speaker: 'Governance Liaison', text: 'If we can’t cross the high-confidence gate we’ll default to human override.' },
          { speaker: 'Support Lead', text: 'Understood—kicking off the escalation playbook now.' }
        ]
      ]
    },
    references: [
      {
        source: 'docs/AUTONOMOUS_COMPANY_GUIDE.md#HumanEscalation',
        summary: 'Guide shows an uncertain-if escalation path where high confidence executes autonomously, medium triggers structured review, and low calls a board meeting.',
        quote: 'escalationPath = uncertain if (~decision && ~impact && ~risk) { high { ... } medium { ... } low { ... } }'
      }
    ],
  },
  launch_readiness_gate: {
    title: 'Launch Readiness Gate',
    description: 'Production test checklist verifies infrastructure services, pattern demos, dashboards, and tracing before giving a go signal.',
    structuredSpec: {
      goal: 'Certify the platform is production ready before a launch.',
      inputs: [
        { name: 'test_suite', type: 'string', values: ['full', 'smoke'] },
        { name: 'services', type: 'list', description: 'Infra services (etcd, postgres, redis, etc.).' },
        { name: 'dashboards', type: 'list', description: 'Grafana dashboards to verify.' }
      ],
      signals: [
        { name: 'infra_health', source: 'infrastructure monitors', confidence: '>=0.9 requires all services healthy' },
        { name: 'pattern_demo', source: 'patternEngine', confidence: '>=0.85 indicates run success' },
        { name: 'observability_stack', source: 'telemetry', confidence: '>=0.8 ensures metrics/traces flowing' }
      ],
      decisionPoints: [
        { name: 'infra_gate', condition: 'all services healthy', pass: 'run tests', fail: 'restart stack' },
        { name: 'test_gate', condition: 'test_suite results stable', pass: 'check monitoring', fail: 'file incident' },
        { name: 'launch_gate', condition: 'dashboards & tracing live', pass: 'GO', fail: 'HOLD + escalate' }
      ],
      escalationPaths: [
        { trigger: 'Observability offline or repeated test failures', destination: 'SRE on-call', actions: ['restart services', 'open incident'] }
      ],
      outputs: [
        { name: 'readiness_report', description: 'Checklist of gates, outstanding issues, GO/NOGO decision.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'Readiness gate for EU launch',
          body: `We need a GO/NO-GO call for tomorrow’s EU region rollout.
- Control plane + etcd restarts completed, but Grafana alerts lagged.
- Pattern demo suite passed once, failed once due to latency blip.
Please run the launch readiness orchestration and produce a report with any blockers.`
        },
        {
          subject: 'Launch retro gating',
          body: `Ops review flagged inconsistent metrics from Jaeger after last rollout. Update the readiness checklist output with telemetry drift notes.`
        }
      ],
      dialogues: [
        [
          { speaker: 'SRE', text: 'Infra checks are green now, but observability took 30s to recover. Do we count that as a fail?' },
          { speaker: 'Program Manager', text: 'Stakeholders want proof the dashboards stream live before we flip the switch.' },
          { speaker: 'Control Plane Lead', text: 'Let’s run the gate pattern: if tests and telemetry are confident we recommend GO, otherwise HOLD.' },
          { speaker: 'Compliance Liaison', text: 'Remember to capture evidence for SOC2 after the run.' }
        ],
        [
          { speaker: 'Platform Lead', text: 'Has the pattern demo been stable for the last three runs?' },
          { speaker: 'Telemetry Analyst', text: 'Two green, one yellow due to collector restart. Confidence is 0.81.' },
          { speaker: 'Program Manager', text: 'If the final gate stays medium we’ll delay launch by one day.' },
          { speaker: 'SRE', text: 'Copy—running readiness gate now and will attach the report.' }
        ]
      ]
    },
    references: [
      {
        source: 'PRODUCTION_TEST_STATUS.md#✅ Success Criteria',
        summary: 'Document lists the exact conditions required before declaring the system production ready.',
        quote: 'Your production system is ready when: [x] All infrastructure services running ... [ ] Grafana dashboards show data ... [ ] Jaeger shows traces.'
      }
    ],
  },
  security_review_chain: {
    title: 'Security Review with Escalation',
    description: 'Generated pattern composes primitives to gather security agent inputs, build consensus, enforce confidence thresholds, and escalate to a security architect as needed.',
    structuredSpec: {
      goal: 'Review code or infrastructure changes for security risks before deployment.',
      inputs: [
        { name: 'change_request', type: 'object', description: 'Pull request or architecture diff.' },
        { name: 'severity', type: 'string', values: ['low', 'medium', 'high'] }
      ],
      signals: [
        { name: 'static_analysis', source: 'securityAgents', confidence: '>=0.8 indicates safe' },
        { name: 'threat_model', source: 'threatModeler', confidence: '>=0.85 indicates validated mitigations' },
        { name: 'compliance_review', source: 'complianceAgent', confidence: '>=0.8 indicates policy alignment' }
      ],
      decisionPoints: [
        { name: 'consensus_gate', condition: 'consensus(securityResults, 0.8)', pass: 'threshold step', fail: 'escalate to security-architect' },
        { name: 'threshold_gate', condition: 'confidence >= 0.9', pass: 'approve', fail: 'escalate' }
      ],
      escalationPaths: [
        { trigger: 'threshold not met', destination: 'security-architect', action: 'manual review' }
      ],
      outputs: [
        { name: 'security_report', description: 'Decision + mitigations + escalations' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'Security review needed: Data egress proxy patch',
          body: `Major PR modifies the egress proxy (TLS termination + logging). Severity HIGH.
Security wants consensus and a 0.9 threshold before merge. Run the orchestration and escalate if we fall short.`
        },
        {
          subject: 'Prod hotfix review: secrets service',
          body: `Emergency change to secrets service requested. Confirm static analysis + compliance pass and document escalation path if target confidence isn’t met.`
        }
      ],
      dialogues: [
        [
          { speaker: 'Security Analyst', text: 'Static analysis looks fine, but threat modeling flagged a downgrade risk.' },
          { speaker: 'Compliance Lead', text: 'Controls mapping is incomplete; we need proof this meets SOC2.' },
          { speaker: 'Security Architect', text: 'If consensus confidence stays below 0.9 we’ll do a manual review.' },
          { speaker: 'Dev Lead', text: 'I can ship mitigations if you tell me what’s missing.' }
        ],
        [
          { speaker: 'Security Architect', text: 'We’re at 0.86 confidence. What’s holding us back?' },
          { speaker: 'Threat Modeler', text: 'Need proof of downgrade mitigation. Without it, I recommend escalating.' },
          { speaker: 'Compliance Lead', text: 'Agreed—without evidence we can’t certify the change.' },
          { speaker: 'Security Architect', text: 'Okay, escalation path engaged.' }
        ]
      ]
    },
    references: [
      {
        source: 'ARCHITECTURE_V2.md#Pattern Generation & Execution',
        summary: 'Architecture doc walks through composing a SecurityReview pattern with consensus and escalation primitives.',
        quote: '@name SecurityReview ... goal: "Security review with escalation" ... final = validated ~> 0.9 ? validated : escalate("security-architect")'
      }
    ],
  },
  runway_finance_monitoring: {
    title: 'Runway Monitoring & Cashflow Actions',
    description: 'Financial agents monitor runway confidence, trigger revenue acceleration tasks, or convene emergency meetings when uncertainty spikes.',
    structuredSpec: {
      goal: 'Continuously monitor company runway and trigger interventions based on confidence.',
      inputs: [
        { name: 'cashflow', type: 'object', description: 'Cash balance, burn, runway in months.' },
        { name: 'receivables', type: 'object', description: 'Outstanding invoices and probabilities.' }
      ],
      signals: [
        { name: 'runway_confidence', source: 'finance agents', confidence: '>=0.9 indicates reliable runway projection' },
        { name: 'forecast', source: 'analyst.forecastCashflow', confidence: '>=0.8 indicates trustworthy forecast' }
      ],
      decisionPoints: [
        { name: 'runway_gate', logic: 'uncertain if (cashflow.runway ~> 0.9)', outcomes: { high: 'execute playbooks', medium: 'investigate deeper', low: 'board meeting' } }
      ],
      escalationPaths: [
        { trigger: 'low confidence runway', destination: 'Board meeting', actions: ['analyst briefing', 'risk worst-case analysis'] }
      ],
      outputs: [
        { name: 'financial_health', description: 'Summary of cashflow, actions taken, health label.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'Runway alert: Burn accelerated last week',
          body: `Finance bot noticed burn rate spiking 18% WoW. Receivables slipped, runway confidence now 0.58.
Need orchestrated actions: revenue acceleration vs cost controls vs board briefing.`
        },
        {
          subject: 'Board prep: runway sensitivity',
          body: `Board wants scenarios for 6/9/12 month runway under different burn profiles. Include confidence commentary per action.`
        }
      ],
      dialogues: [
        [
          { speaker: 'Finance Analyst', text: 'Forecast says 7 months runway but confidence is shaky.' },
          { speaker: 'CEO Agent', text: 'Do we trigger the revenue push or wait for collections to land?' },
          { speaker: 'Risk Watch', text: 'If confidence stays low we must brief the board tonight.' },
          { speaker: 'Ops Lead', text: 'I can implement cost controls immediately if requested.' }
        ],
        [
          { speaker: 'Finance Analyst', text: 'New receivables report bumped confidence to 0.69.' },
          { speaker: 'CFO Agent', text: 'Still below our 0.75 target; consider soft cost freezes.' },
          { speaker: 'CEO Agent', text: 'Let’s see what the orchestration recommends before the investor call.' }
        ]
      ]
    },
    references: [
      {
        source: 'docs/AUTONOMOUS_COMPANY_GUIDE.md#Monitoring & Governance',
        summary: 'Guide showcases a runwayActions uncertain-if block that branches between proactive actions, deeper investigation, and board meetings.',
        quote: 'runwayActions = uncertain if (cashflow.runway ~> 0.9) { high { ... } medium { ... } low { agents.governance.callBoardMeeting("urgent_financial") } }'
      }
    ],
  },
  telemetry_signal_triage: {
    title: 'Telemetry Signal Triage',
    description: 'Observability package instruments pattern execution and agent calls so critical alerts can be prioritized with tracing metadata.',
    structuredSpec: {
      goal: 'Ingest telemetry signals, prioritize critical alerts, and emit diagnostics.',
      inputs: [
        { name: 'signals', type: 'list', description: 'Telemetry events with severity + confidence.' }
      ],
      signals: [
        { name: 'otel_traces', source: '@parallax/telemetry', confidence: '>=0.8 ensures tracing coverage' },
        { name: 'alert_stream', source: 'telemetry.signals()', confidence: '>=0.75 indicates reliable severity tags' }
      ],
      decisionPoints: [
        { name: 'severity_filter', condition: 'signal.severity == "critical"', action: 'prioritize list' },
        { name: 'info_logging', condition: 'non-critical signals', action: 'diagnostics.info' }
      ],
      escalationPaths: [
        { trigger: 'Multiple critical signals', destination: 'on-call', actions: ['page SRE', 'attach trace IDs'] }
      ],
      outputs: [
        { name: 'telemetry_summary', description: 'Counts plus prioritized critical entries.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'Telemetry stream noisy—need prioritization',
          body: `PagerDuty fired twice due to conflicting alerts. Need prioritized telemetry summary with confidence for the incident commander.`
        },
        {
          subject: 'Observability catch-up',
          body: `Yesterday’s incident review flagged missing severity annotations. Generate telemetry summary showing how confident we are in each signal.`
        }
      ],
      dialogues: [
        [
          { speaker: 'Observability Lead', text: 'We’re drowning in warnings. Which ones are truly critical?' },
          { speaker: 'SRE On-call', text: 'Give me a list sorted by severity and confidence so I can focus the response.' },
          { speaker: 'Telemetry Bot', text: 'I can provide trace IDs for the top alerts once prioritized.' }
        ],
        [
          { speaker: 'Incident Commander', text: 'How many alerts are we treating as P1 right now?' },
          { speaker: 'Observability Lead', text: 'Three, but confidence ranges from 0.6 to 0.9.' },
          { speaker: 'Incident Commander', text: 'Run the triage pattern and only escalate those above 0.8.' }
        ]
      ]
    },
    references: [
      {
        source: 'docs/observability/opentelemetry-setup.md#Instrumentation',
        summary: 'Observability guide details automatic instrumentation for HTTP, gRPC, and pattern execution with @parallax/telemetry.',
        quote: 'The platform automatically instruments: HTTP requests, gRPC calls, pattern execution, agent communication.'
      }
    ],
  },
  fraud_triage_matrix: {
    title: 'Fraud Triage Matrix',
    description: 'Risk, machine-learning, and compliance agents score suspicious transactions before escalating to humans.',
    structuredSpec: {
      goal: 'Identify and triage fraudulent transactions using multi-agent voting and escalation.',
      inputs: [
        { name: 'transactions', type: 'list', description: 'Batch of transactions with metadata and confidence.' },
        { name: 'risk_policy', type: 'object', description: 'Thresholds for auto-freeze vs manual review.' }
      ],
      signals: [
        { name: 'ml_score', source: 'agents.ml', confidence: '>=0.85 indicates strong fraud signal' },
        { name: 'rules_engine', source: 'agents.rules', confidence: '>=0.75 indicates policy violation' },
        { name: 'compliance_review', source: 'agents.compliance', confidence: '>=0.8 indicates regulatory concern' }
      ],
      decisionPoints: [
        {
          name: 'triage_gate',
          logic: 'uncertain if (~ml_score && ~rules_engine)',
          outcomes: {
            high: 'Auto freeze account + notify compliance',
            medium: 'Queue for compliance review with risk summary',
            low: 'Log and monitor'
          }
        }
      ],
      escalationPaths: [
        { trigger: 'High confidence fraud combined with compliance flag', destination: 'fraud_bridge', actions: ['page human investigator', 'file SAR draft'] }
      ],
      outputs: [
        { name: 'fraud_actions', description: 'List of frozen accounts, queued investigations, and monitoring notes.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'Spike in card-not-present fraud',
          body: `Risk team detected anomalies from LATAM merchants. Run fraud triage now to decide auto-freeze vs manual review for 42 accounts.`
        },
        {
          subject: 'Weekend fraud sweep',
          body: `Weekend transactions show elevated ML scores. Need a nightly triage summary with confidence per merchant.` 
        }
      ],
      dialogues: [
        [
          { speaker: 'Fraud Analyst', text: 'ML score is 0.92 but compliance is nervous about false positives.' },
          { speaker: 'Risk Lead', text: 'If both ML and rules agree at high confidence, we freeze automatically.' },
          { speaker: 'Compliance Officer', text: 'Log every auto-freeze with rationale for regulators.' }
        ],
        [
          { speaker: 'Fraud Bot', text: 'Three merchants triggered our high-risk rules in the last hour.' },
          { speaker: 'Risk Lead', text: 'Send them to manual review unless the triage matrix hits high confidence.' },
          { speaker: 'Compliance Officer', text: 'We need evidence to show SAR filings if required.' }
        ]
      ]
    },
    references: [
      {
        source: 'docs/archive/COMPLETE_IMPLEMENTATION_ROADMAP_ARCHIVED.md#@parallax-patternsfraud-detection',
        summary: 'Roadmap lists a fraud-detection pattern that aggregates ML, analysis, and compliance capabilities.',
        quote: '"@parallax-patterns/fraud-detection" ... requiredCapabilities: ["fraud", "ml", "analysis"]'
      }
    ],
  },
  compliance_audit_chain: {
    title: 'Compliance Audit Chain',
    description: 'Legal, compliance, and audit agents collaborate on reviews with confidence thresholds and escalation hooks.',
    structuredSpec: {
      goal: 'Perform automated compliance audits with multi-agent validation before notifying humans.',
      inputs: [
        { name: 'policy_area', type: 'string', values: ['gdpr', 'hipaa', 'sox'] },
        { name: 'evidence_package', type: 'object', description: 'Artifacts gathered for the audit.' }
      ],
      signals: [
        { name: 'legal_review', source: 'agents.legal', confidence: '>=0.8 indicates policy alignment' },
        { name: 'control_validation', source: 'agents.audit', confidence: '>=0.8 indicates control effectiveness' },
        { name: 'compliance_score', source: 'agents.compliance', confidence: '>=0.85 indicates clean audit' }
      ],
      decisionPoints: [
        { name: 'audit_gate', logic: 'uncertain if (~legal_review && ~control_validation)', outcomes: { high: 'auto certify', medium: 'request remediations', low: 'escalate to compliance officer' } }
      ],
      escalationPaths: [
        { trigger: 'low confidence or repeated failures', destination: 'compliance_officer', actions: ['schedule review', 'attach evidence_package'] }
      ],
      outputs: [
        { name: 'audit_report', description: 'Certification status, remediation checklist, escalation info.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'Quarterly GDPR audit package',
          body: `Legal needs an automated compliance sweep for EU data residency controls. Attach remediation requests if confidence drops below 0.8.`
        },
        {
          subject: 'SOX evidence refresh',
          body: `Audit partner asked for updated control evidence on logging + access review. Run the compliance chain and export the remediation checklist.`
        }
      ],
      dialogues: [
        [
          { speaker: 'Compliance Bot', text: 'Control validation looks good except for the new logging cluster.' },
          { speaker: 'Legal Advisor', text: 'If we can’t reach 0.85 confidence we’ll schedule a human review.' },
          { speaker: 'Audit Lead', text: 'Document any medium-confidence findings for remediation follow-up.' }
        ],
        [
          { speaker: 'Legal Advisor', text: 'What’s our confidence that policy updates shipped last week?' },
          { speaker: 'Compliance Bot', text: '0.78—control evidence from region A is missing.' },
          { speaker: 'Audit Lead', text: 'Okay, route it through the human review path.' }
        ]
      ]
    },
    references: [
      {
        source: 'docs/AUTONOMOUS_COMPANY_GUIDE.md#Legal & Compliance',
        summary: 'Guide outlines automated legal/compliance agents handling contract review and compliance checks.',
        quote: 'capabilities = [\'contract-review\', \'compliance-check\', \'risk-assessment\'];'
      },
      {
        source: 'PRODUCTION_DEPLOYMENT_CHECKLIST.md#Security',
        summary: 'Checklist emphasizes GDPR/privacy compliance milestones before launch.',
        quote: '- GDPR/privacy compliance'
      }
    ],
  },
  data_egress_review: {
    title: 'Data Egress Review',
    description: 'Security and governance agents vet data egress requests with policy checks and human escalation.',
    structuredSpec: {
      goal: 'Review outbound data transfers to ensure they comply with security and privacy policies.',
      inputs: [
        { name: 'egress_request', type: 'object', description: 'Dataset metadata, destination, requester justification.' },
        { name: 'classification', type: 'string', values: ['public', 'internal', 'restricted'] }
      ],
      signals: [
        { name: 'security_review', source: 'agents.security', confidence: '>=0.85 indicates safe transfer' },
        { name: 'privacy_check', source: 'agents.privacy', confidence: '>=0.8 indicates privacy compliance' },
        { name: 'governance_policy', source: 'agents.governance', confidence: '>=0.8 indicates policy alignment' }
      ],
      decisionPoints: [
        { name: 'egress_gate', logic: 'uncertain if (~security_review && ~privacy_check)', outcomes: { high: 'approve with logging', medium: 'apply redaction & re-run checks', low: 'escalate to governance board' } }
      ],
      escalationPaths: [
        { trigger: 'low confidence or restricted classification', destination: 'governance_board', actions: ['create briefing', 'attach mitigations'] }
      ],
      outputs: [
        { name: 'egress_decision', description: 'Approve/deny plus conditions and audit trail.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'Data egress request: Research vendor export',
          body: `Research wants to export anonymized datasets to an external vendor. Ensure security/privacy approvals are confident before granting access.`
        },
        {
          subject: 'Follow-up on egress exception',
          body: `Last week’s exception is expiring; rerun the egress review with updated classification and attach confidence bands for governance.`
        }
      ],
      dialogues: [
        [
          { speaker: 'Security Analyst', text: 'Classification is restricted; I’m not comfortable approving without redaction.' },
          { speaker: 'Governance Chair', text: 'Let’s see what the policy agent says and escalate if either signal is low.' },
          { speaker: 'Privacy Officer', text: 'Remember to capture audit logs for the transfer.' }
        ],
        [
          { speaker: 'Research Lead', text: 'We need the data out before Monday. What’s blocking us?' },
          { speaker: 'Policy Agent', text: 'Privacy confidence is 0.62 because justification is thin.' },
          { speaker: 'Governance Chair', text: 'In that case we escalate to the board for sign-off.' }
        ]
      ]
    },
    references: [
      {
        source: 'PRODUCTION_DEPLOYMENT_CHECKLIST.md#Security',
        summary: 'Checklist calls out security/privacy checks before deployment.',
        quote: 'Security review complete · GDPR/privacy compliance'
      },
      {
        source: 'ARCHITECTURE_V2.md#Pattern Generation & Execution',
        summary: 'Security review pattern demonstrates consensus + escalation flows for governance decisions.',
        quote: 'goal: "Security review with escalation"... escalate("security-architect")'
      }
    ],
  },
  incident_response_bridge: {
    title: 'Incident Response Bridge',
    description: 'Telemetry, incident commander, and SRE agents coordinate mitigations with uncertain branching and escalation.',
    structuredSpec: {
      goal: 'Coordinate automated incident response with clear escalation to humans when uncertainty is high.',
      inputs: [
        { name: 'incident_signal', type: 'object', description: 'Alert payload, severity, affected services.' },
        { name: 'runbook', type: 'string', description: 'Runbook identifier or remediation plan.' }
      ],
      signals: [
        { name: 'telemetry_view', source: 'telemetry', confidence: '>=0.8 indicates reliable telemetry' },
        { name: 'impact_assessment', source: 'agents.analyst', confidence: '>=0.75 indicates bounded impact' },
        { name: 'mitigation_effectiveness', source: 'agents.sre', confidence: '>=0.8 indicates fix applied' }
      ],
      decisionPoints: [
        { name: 'response_gate', logic: 'uncertain if (~telemetry_view && ~impact_assessment)', outcomes: { high: 'auto run mitigation + notify stakeholders', medium: 'engage incident commander + partial mitigation', low: 'page full incident response team' } }
      ],
      escalationPaths: [
        { trigger: 'low confidence or critical severity', destination: 'incident_bridge', actions: ['page on-call', 'open war room', 'attach traces'] }
      ],
      outputs: [
        { name: 'incident_report', description: 'Mitigations executed, outstanding risks, escalation state.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'P1 incident bridge activation',
          body: `Control-plane latency spiked to 900ms. Initiate the incident response bridge to decide if we auto-mitigate or page the entire on-call crew.`
        },
        {
          subject: 'Retroactive incident drill',
          body: `Run the incident bridge against last week’s simulated outage to ensure telemetry + mitigation hooks behave as expected.`
        }
      ],
      dialogues: [
        [
          { speaker: 'Telemetry Bot', text: 'Confidence in the signal is 0.82; looks real.' },
          { speaker: 'Incident Commander', text: 'If mitigation confidence stays low we pull everyone into the war room.' },
          { speaker: 'SRE', text: 'Mitigation script is ready but untested this week.' }
        ],
        [
          { speaker: 'Incident Commander', text: 'Status update?' },
          { speaker: 'SRE', text: 'Latency still high, mitigation effectiveness confidence 0.51.' },
          { speaker: 'Comms Lead', text: 'Customers are asking for ETA.' },
          { speaker: 'Incident Commander', text: 'Escalating to full bridge now.' }
        ]
      ]
    },
    references: [
      {
        source: 'ROADMAP.md#Production Hardening',
        summary: 'Roadmap highlights automated incident response as a goal under production hardening.',
        quote: '- [ ] Automated incident response'
      },
      {
        source: 'PRODUCTION_TEST_STATUS.md#Run Pattern Demo',
        summary: 'Production checklist suggests running pattern demos to generate metrics/traces useful during incidents.',
        quote: 'This will: Execute all patterns · Generate metrics · Create traces'
      }
    ],
  },
  experimentation_loop: {
    title: 'Experimentation Orchestration',
    description: 'Meta-orchestration agents compose primitives to explore hypotheses with telemetry feedback.',
    structuredSpec: {
      goal: 'Generate, evaluate, and deploy experiments using primitive-based orchestration.',
      inputs: [
        { name: 'hypothesis', type: 'string', description: 'Experiment hypothesis or objective.' },
        { name: 'metrics', type: 'list', description: 'Success metrics to monitor.' }
      ],
      signals: [
        { name: 'pattern_generator', source: '@parallax/pattern-sdk', confidence: '>=0.8 indicates viable pattern composition' },
        { name: 'telemetry_feedback', source: 'telemetry', confidence: '>=0.75 indicates trustworthy metrics' }
      ],
      decisionPoints: [
        { name: 'pattern_selection', condition: 'generator.compose(...)', pass: 'register + execute pattern', fail: 'fallback to manual design' },
        { name: 'go_no_go', logic: 'uncertain if (~telemetry_feedback)', outcomes: { high: 'promote experiment', medium: 'run additional cycles', low: 'sunset experiment' } }
      ],
      escalationPaths: [
        { trigger: 'low confidence telemetry or high risk', destination: 'product_council', actions: ['share metrics', 'recommend pivot'] }
      ],
      outputs: [
        { name: 'experiment_catalog', description: 'Registered patterns, metrics, promotion decisions.' }
      ]
    },
    nlArtifacts: {
      tickets: [
        {
          subject: 'New onboarding experiment proposal',
          body: `Product wants to test a guided onboarding flow. Need the experimentation orchestrator to generate a pattern, monitor metrics, and recommend promote/pivot/sunset.`
        },
        {
          subject: 'Experiment sunset review',
          body: `Conversion dropped 2%. Run the experimentation loop to decide if we pivot, collect more data, or sunset entirely.`
        }
      ],
      dialogues: [
        [
          { speaker: 'Product Lead', text: 'Our hypothesis is conversion improves 10%. Can we automate the experiment lifecycle?' },
          { speaker: 'Meta-Agent', text: 'I’ll compose a pattern from primitives and watch telemetry for promotion confidence.' },
          { speaker: 'Data Scientist', text: 'Please log metrics per cohort so we can validate uplift.' }
        ],
        [
          { speaker: 'Product Lead', text: 'Telemetry shows mixed results. Promote or keep iterating?' },
          { speaker: 'Meta-Agent', text: 'Confidence is 0.64; we need another cycle.' },
          { speaker: 'Growth PM', text: 'Alright, run another loop and send me the catalog.' }
        ]
      ]
    },
    references: [
      {
        source: 'docs/META_ORCHESTRATION.md',
        summary: 'Meta-orchestration doc describes primitive-based generation, pattern marketplaces, and learning loops.',
        quote: 'Meta-agents learn from deployment outcomes ... share successful patterns across deployments.'
      }
    ],
  },
};

const templateScenarioMap = {
  single_agent_exec: ['customer_escalation_playbook', 'telemetry_signal_triage', 'fraud_triage_matrix'],
  consensus_pattern: ['launch_readiness_gate', 'security_review_chain', 'fraud_triage_matrix', 'experimentation_loop', 'compliance_audit_chain'],
  confidence_router: ['customer_escalation_playbook', 'security_review_chain', 'fraud_triage_matrix', 'data_egress_review'],
  parallel_exploration: ['security_review_chain', 'launch_readiness_gate', 'experimentation_loop', 'incident_response_bridge'],
  confidence_cascade: ['security_review_chain', 'experimentation_loop', 'fraud_triage_matrix'],
  multi_validator: ['launch_readiness_gate', 'security_review_chain', 'fraud_triage_matrix', 'compliance_audit_chain'],
  meta_pattern_composer: ['security_review_chain', 'experimentation_loop', 'compliance_audit_chain'],
  data_enrichment_pipeline: ['security_review_chain', 'compliance_audit_chain', 'data_egress_review'],
  human_escalation_loop: ['customer_escalation_playbook', 'data_egress_review', 'fraud_triage_matrix'],
  llm_fallback_chain: ['launch_readiness_gate', 'telemetry_signal_triage', 'incident_response_bridge'],
  disagreement_detector: ['customer_escalation_playbook', 'launch_readiness_gate', 'fraud_triage_matrix', 'compliance_audit_chain'],
  meta_agent_factory: ['security_review_chain', 'experimentation_loop', 'compliance_audit_chain'],
  uncertain_governance_router: ['customer_escalation_playbook', 'data_egress_review'],
  alignment_do_while: ['runway_finance_monitoring', 'incident_response_bridge'],
  module_quality_audit: ['launch_readiness_gate', 'telemetry_signal_triage', 'compliance_audit_chain'],
  readiness_uncertain_loop: ['runway_finance_monitoring', 'incident_response_bridge'],
  telemetry_signal_inspector: ['telemetry_signal_triage', 'incident_response_bridge'],
};

function pickScenarioForTemplate(templateName) {
  const choices = templateScenarioMap[templateName] || Object.keys(scenarioCatalog);
  if (!choices.length) {
    return undefined;
  }
  const scenarioId = randomItem(choices);
  const scenario = scenarioCatalog[scenarioId];
  if (!scenario) {
    return undefined;
  }
  return { id: scenarioId, ...scenario };
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function pickNlArtifacts(scenario) {
  if (!scenario) {
    return {
      ticket: {
        subject: 'Generic orchestration request',
        body: `Please run the "${scenario?.title || 'unknown'}" pattern and report back.`
      },
      dialogue: [
        { speaker: 'Operator', text: 'Need orchestration help for this scenario.' },
        { speaker: 'Coordinator', text: 'Running Prism pattern now.' }
      ]
    };
  }
  const artifacts = scenario.nlArtifacts || {};
  const ticket =
    artifacts.tickets && artifacts.tickets.length
      ? randomItem(artifacts.tickets)
      : {
          subject: `${scenario.title} request`,
          body: scenario.description
        };
  const dialogue =
    artifacts.dialogues && artifacts.dialogues.length
      ? randomItem(artifacts.dialogues)
      : [
          { speaker: 'Requester', text: `Can we execute ${scenario.title}?` },
          { speaker: 'Coordinator', text: 'Yes, triggering the orchestration now.' }
        ];
  return { ticket, dialogue };
}

function formatPrimitive(value) {
  if (typeof value === 'string') {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${escaped}"`;
  }
  if (value === null) {
    return 'null';
  }
  return String(value);
}

function toYAML(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${pad}[]`;
    }
    return value
      .map((item) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          const nested = toYAML(item, indent + 1);
          return `${pad}-\n${nested}`;
        }
        return `${pad}- ${formatPrimitive(item)}`;
      })
      .join('\n');
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (!entries.length) {
      return `${pad}{}`;
    }
    return entries
      .map(([key, val]) => {
        if (isPlainObject(val) || Array.isArray(val)) {
          const nested = toYAML(val, indent + 1);
          return `${pad}${key}:\n${nested}`;
        }
        return `${pad}${key}: ${formatPrimitive(val)}`;
      })
      .join('\n');
  }
  return `${pad}${formatPrimitive(value)}`;
}

function writeScenarioCatalogFile() {
  const scenarioDir = path.join(__dirname, '..', 'scenarios');
  fs.mkdirSync(scenarioDir, { recursive: true });
  const serialized = {};
  for (const [id, info] of Object.entries(scenarioCatalog)) {
    serialized[id] = { id, ...info };
  }
  const yaml = toYAML(serialized).trimStart() + '\n';
  fs.writeFileSync(path.join(scenarioDir, 'scenarios.yaml'), yaml, 'utf8');
}
const agentNames = [
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
  'budgetLLM'
];
const validatorNames = ['sentinel', 'arbiter', 'auditor'];
const explorerNames = ['voyager', 'delta', 'nova', 'odyssey'];
const requirementPool = [
  'incident triage',
  'regional launch',
  'data egress approval',
  'customer escalation',
  'regulatory update',
  'architecture review'
];
const enrichmentDomains = ['crm', 'marketing', 'support', 'billing'];
const capabilitySpecs = [
  { name: 'orchestrator', capability: 'coordination' },
  { name: 'riskMonitor', capability: 'risk' },
  { name: 'qualityGate', capability: 'validation' },
  { name: 'triageLead', capability: 'triage' }
];

const templates = [
  {
    name: 'single_agent_exec',
    description: 'Invoke a single agent with payload and log result',
    generate() {
      const agent = randomItem(agentNames);
      const task = randomItem(['analysis', 'explain', 'summarize']);
      const importance = randomItem(['high', 'medium', 'low']);
      const plan = [{ step: 'invoke', capability: agent }];
      const brief = `Handle a ${importance} priority ${task} request by delegating to ${agent}.`;
      const planNarrative = [
        `Assemble a payload that explains the ${task} context and urgency.`,
        `Ask ${agent} to work the task and capture its confidence.`,
        `Log the response so other orchestrations can inspect it later.`
      ];
      const code = `/**
 * @name SingleAgentExec
 * @description Execute ${agent} for ${task}
 */
payload = {
  task: "${task}",
  importance: "${importance}"
}

response = ${agent}.invoke(payload)
log.info("${agent}_result", response)
single_agent_result = response`;
      return { code, metadata: { agent, task, importance }, plan, brief, planNarrative };
    },
  },
  {
    name: 'consensus_pattern',
    description: 'Collect responses and compute average confidence',
    generate() {
      const participants = sample(agentNames, 3);
      const topic = randomItem(['security posture', 'customer feedback', 'roadmap planning']);
      const plan = [
        { step: 'collect', capabilities: participants },
        { step: 'aggregate', capability: 'summarizer' }
      ];
      const brief = `Compare how ${formatList(participants)} describe ${topic} and report the average confidence.`;
      const planNarrative = [
        `Iterate through ${participants.length} delegates and ask each for input on ${topic}.`,
        `Track every raw response plus its confidence.`,
        `Compute the mean confidence and return a summary bundle.`
      ];
      const code = `/**
 * @name ConsensusPattern
 * @description Aggregate ${topic} responses
 */
agents = [${participants.map((a) => `${a}`).join(', ')}]
responses = []
index = 0
totalConfidence = 0
while (index < len(agents)) {
  agent = agents[index]
  response = agent.invoke({ topic: "${topic}" })
  responses = responses.push(response)
  totalConfidence = totalConfidence + response.confidence
  index = index + 1
}

avgConfidence = totalConfidence / len(agents)
consensus_summary = {
  topic: "${topic}",
  responses,
  average_confidence: avgConfidence
}`;
      return { code, metadata: { participants, topic }, plan, brief, planNarrative };
    },
  },
  {
    name: 'confidence_router',
    description: 'Route response based on confidence thresholds',
    generate() {
      const agent = randomItem(agentNames);
      const validator = randomItem(validatorNames);
      const fallback = randomItem(['humanDesk', 'policyBoard']);
      const minConfidence = randomFloat(0.6, 0.9);
      const plan = [
        { step: 'evaluate', capability: agent },
        { step: 'validate', capability: validator },
        { step: 'escalate', capability: fallback }
      ];
      const brief = `Route ${agent}'s answer using ${validator} and ${fallback} so low confidence paths still get handled.`;
      const planNarrative = [
        `Send the current payload to ${agent} and inspect the reported confidence.`,
        `If confidence falls in the warning band rerun the idea past ${validator}.`,
        `Escalate to ${fallback} when confidence is too low, otherwise keep the original answer.`
      ];
      const code = `/**
 * @name ConfidenceRouter
 * @description Route ${agent} output based on confidence
 */
response = ${agent}.invoke(input)
conf = response.confidence

routed = response

if (conf > ${minConfidence.toFixed(2)}) {
  routed = response
} else if (conf > ${Math.max(0.4, minConfidence - 0.1).toFixed(2)}) {
  routed = ${validator}.invoke({ proposal: response })
} else {
  routed = ${fallback}.invoke({ draft: response, confidence: conf })
}

routing_decision = routed`;
      return { code, metadata: { agent, validator, fallback, minConfidence }, plan, brief, planNarrative };
    },
  },
  {
    name: 'parallel_exploration',
    description: 'Run explorers in parallel and aggregate findings',
    generate() {
      const explorers = sample(explorerNames, 3);
      const topic = randomItem(['market analysis', 'tech research', 'incident triage']);
      const plan = [
        { step: 'explore', capabilities: explorers },
        { step: 'summarize', capability: 'aggregator' }
      ];
      const brief = `Launch ${formatList(explorers)} to explore ${topic} in parallel and capture every experiment result.`;
      const planNarrative = [
        `Assemble the ${explorers.length} explorers into a list.`,
        `Iterate over the list, invoking each explorer with a uniform topic payload.`,
        `Return a combined summary containing every experiment and the total count.`
      ];
      const code = `/**
 * @name ParallelExploration
 * @description Explore ${topic} across multiple explorers
 */
explorers = [${explorers.join(', ')}]
experiments = []
index = 0
while (index < len(explorers)) {
  agent = explorers[index]
  response = agent.invoke({ topic: "${topic}" })
  experiments = experiments.push({ agent: agent.name, response })
  index = index + 1
}

parallel_summary = {
  experiments,
  count: len(experiments)
}`;
      return { code, metadata: { explorers, topic }, plan, brief, planNarrative };
    },
  },
  {
    name: 'confidence_cascade',
    description: 'Refine output until target confidence reached',
    generate() {
      const seed = randomItem(agentNames);
      const refiners = sample(agentNames.filter((a) => a !== seed), 2);
      const target = randomFloat(0.75, 0.95);
      const plan = [
        { step: 'seed', capability: seed },
        { step: 'refine', capabilities: refiners }
      ];
      const brief = `Start with ${seed}, then let ${formatList(refiners)} refine the output until confidence exceeds ${target.toFixed(2)}.`;
      const planNarrative = [
        `Invoke ${seed} once to obtain the starter candidate.`,
        `Loop through refiners while the candidate confidence is below the target.`,
        `Return whichever candidate crossed the threshold or the last refiner output.`
      ];
      const code = `/**
 * @name ConfidenceCascade
 */
current = ${seed}.invoke(input)
refiners = [${refiners.join(', ')}]
target = ${target.toFixed(2)}

index = 0
while (current.confidence < target && index < len(refiners)) {
  nextAgent = refiners[index]
  current = nextAgent.invoke({ base: current })
  index = index + 1
}

final_candidate = current`;
      return { code, metadata: { seed, refiners, target }, plan, brief, planNarrative };
    },
  },
  {
    name: 'multi_validator',
    description: 'Validate proposal across multiple validators',
    generate() {
      const proposer = randomItem(agentNames);
      const validators = sample(validatorNames, 2);
      const plan = [
        { step: 'propose', capability: proposer },
        { step: 'validate', capabilities: validators }
      ];
      const brief = `Ask ${proposer} for a proposal, then have ${formatList(validators)} validate it with confidence reports.`;
      const planNarrative = [
        `Collect an initial answer from ${proposer}.`,
        `Send the proposal to each validator and record their confidence.`,
        `Bundle the final proposal with the validator check summary.`
      ];
      const code = `/**
 * @name MultiValidator
 */
proposal = ${proposer}.invoke(input)
validators = [${validators.join(', ')}]
checks = []
index = 0
while (index < len(validators)) {
  response = validators[index].invoke({ proposal })
  check = { agent: validators[index].name, confidence: response.confidence }
  checks = checks.push(check)
  index = index + 1
}

validation_summary = { status: "validated", proposal, checks }`;
      return { code, metadata: { proposer, validators }, plan, brief, planNarrative };
    },
  },
  {
    name: 'meta_pattern_composer',
    description: 'Compose orchestrations for multiple requirements and register them',
    generate() {
      const requirements = sample(requirementPool, 3);
      const plan = [
        { step: 'gather_requirements', items: requirements },
        { step: 'compose_patterns', capability: 'patternComposer' },
        { step: 'register_patterns', capability: 'patternRegistry' }
      ];
      const brief = `Take requirements like ${formatList(requirements)} and use patternComposer + patternRegistry to publish orchestration drafts.`;
      const planNarrative = [
        `Iterate through every requirement string.`,
        `Invoke patternComposer for a tailored orchestration draft.`,
        `Register each draft in patternRegistry so other agents can reuse it.`
      ];
      const code = `/**
 * @name MetaPatternComposer
 */
requirements = ["${requirements.join('", "')}"]
index = 0
composed = []
while (index < len(requirements)) {
  requirement = requirements[index]
  draft = patternComposer.invoke({ requirement })
  patternRegistry.register({ requirement, draft })
  composed = composed.push({ requirement, draft })
  index = index + 1
}

pattern_catalog = {
  requirements,
  composed
}`;
      return { code, metadata: { requirements }, plan, brief, planNarrative };
    },
  },
  {
    name: 'data_enrichment_pipeline',
    description: 'Enrich batched records and persist to the knowledge base',
    generate() {
      const domain = randomItem(enrichmentDomains);
      const records = Array.from({ length: 3 }, (_, idx) => ({
        id: `${domain}-${idx + 1}`,
        source: domain,
      }));
      const plan = [
        { step: 'collect', domain },
        { step: 'enrich', capability: 'dataEnricher' },
        { step: 'persist', capability: 'knowledgeBase' }
      ];
      const brief = `Enrich ${records.length} ${domain.toUpperCase()} records with dataEnricher and persist them into the knowledge base.`;
      const planNarrative = [
        `Load the synthetic ${domain} records into a list.`,
        `Run each entry through dataEnricher to augment it.`,
        `Upsert every enriched record into knowledgeBase and return the summary.`
      ];
      const recordLiterals = records
        .map((record) => `{ id: "${record.id}", source: "${record.source}" }`)
        .join(', ');
      const code = `/**
 * @name DataEnrichmentPipeline
 */
records = [${recordLiterals}]
index = 0
enriched = []
while (index < len(records)) {
  record = records[index]
  enrichedRecord = dataEnricher.invoke({ record })
  knowledgeBase.upsert({ id: record.id, enriched: enrichedRecord })
  enriched = enriched.push({ id: record.id, enriched: enrichedRecord })
  index = index + 1
}

enrichment_summary = {
  domain: "${domain}",
  total: len(enriched),
  enriched
}`;
      return { code, metadata: { domain, records }, plan, brief, planNarrative };
    },
  },
  {
    name: 'human_escalation_loop',
    description: 'Iterate on proposals and escalate to humans when validation fails',
    generate() {
      const primary = randomItem(agentNames);
      const validator = randomItem(validatorNames);
      const plan = [
        { step: 'draft', capability: primary },
        { step: 'validate', capability: validator },
        { step: 'escalate', capability: 'humanDesk' }
      ];
      const brief = `Iterate proposals from ${primary}, let ${validator} certify them, and escalate to the human desk if nothing passes review.`;
      const planNarrative = [
        `Loop up to three attempts, calling ${primary} each round.`,
        `Send every draft to ${validator} and accept when confidence exceeds 0.78.`,
        `If validation never passes, escalate the final draft to humanDesk.`
      ];
      const code = `/**
 * @name HumanEscalationLoop
 */
attempt = 0
 maxAttempts = 3
latestProposal = {}
resolution = { status: "pending" }
while (attempt < maxAttempts && resolution.status == "pending") {
  latestProposal = ${primary}.invoke({ task: input.task, attempt })
  review = ${validator}.invoke({ proposal: latestProposal })
  if (review.confidence > 0.78) {
    resolution = { status: "accepted", proposal: latestProposal, reviewer: "${validator}" }
  }
  attempt = attempt + 1
}

if (resolution.status == "pending") {
  resolution = humanDesk.invoke({ latest: latestProposal, attempt })
}

escalation_result = resolution`;
      return { code, metadata: { primary, validator }, plan, brief, planNarrative };
    },
  },
  {
    name: 'llm_fallback_chain',
    description: 'Try premium → standard → budget LLMs until threshold met',
    generate() {
      const threshold = randomFloat(0.68, 0.88).toFixed(2);
      const plan = [
        { step: 'premium_attempt', capability: 'premiumLLM' },
        { step: 'standard_attempt', capability: 'standardLLM' },
        { step: 'budget_attempt', capability: 'budgetLLM' }
      ];
      const brief = `Try premium, standard, then budget LLMs until one hits ${threshold} confidence for the user prompt.`;
      const planNarrative = [
        `Iterate over the ordered provider list.`,
        `Stop at the first candidate whose confidence meets or exceeds ${threshold}.`,
        `Fallback to budgetLLM with a special payload if none cleared the bar.`
      ];
      const code = `/**
 * @name LLMFallbackChain
 */
providers = [premiumLLM, standardLLM, budgetLLM]
index = 0
selection = {}
hasDecision = false
while (index < len(providers) && !hasDecision) {
  candidate = providers[index].invoke({ prompt: input.task, target: ${threshold} })
  if (candidate.confidence >= ${threshold}) {
    selection = candidate
    hasDecision = true
  }
  index = index + 1
}

if (!hasDecision) {
  selection = budgetLLM.invoke({ prompt: input.task, fallback: true })
}

llm_fallback_result = selection`;
      return { code, metadata: { threshold }, plan, brief, planNarrative };
    },
  },
  {
    name: 'disagreement_detector',
    description: 'Detect conflicting validator stances and escalate disagreements',
    generate() {
      const stances = ['approve', 'reject', 'needs work'];
      const plan = [
        { step: 'collect', capabilities: validatorNames },
        { step: 'compare', capability: 'disagreementDetector' },
        { step: 'escalate', capability: 'policyBoard' }
      ];
      const brief = `Capture how ${formatList(validatorNames)} respond to a proposal, detect disagreements, and escalate to policyBoard if needed.`;
      const planNarrative = [
        `Ask every validator for their stance.`,
        `Compare stances to determine alignment.`,
        `Send the panel summary to policyBoard whenever anyone disagrees.`
      ];
      const code = `/**
 * @name DisagreementDetector
 */
panel = [${validatorNames.join(', ')}]
stances = ["${stances.join('", "')}"]
index = 0
observations = []
while (index < len(panel)) {
  stance = stances[index]
  agent = panel[index]
  response = agent.invoke({ proposal: input, stance })
  observations = observations.push({ agent: agent.name, stance })
  index = index + 1
}

agree = true
comparisonIndex = 0
first = observations[0].stance
while (comparisonIndex < len(observations)) {
  if (observations[comparisonIndex].stance != first) {
    agree = false
  }
  comparisonIndex = comparisonIndex + 1
}

disagreement_report = {
  status: agree ? "aligned" : "disagreement",
  observations,
  escalation: agree ? {} : policyBoard.invoke({ observations })
}`;
      return { code, metadata: { stances }, plan, brief, planNarrative };
    },
  },
  {
    name: 'meta_agent_factory',
    description: 'Provision task-specific agents from capability specs',
    generate() {
      const specs = sample(capabilitySpecs, 3);
      const plan = [
        { step: 'define_specs', specs },
        { step: 'provision', capability: 'agentFactory' },
        { step: 'catalog', capability: 'agentFactory.list' }
      ];
      const brief = `Provision agents for specs like ${formatList(specs.map((s) => s.name))} and list the resulting registry.`;
      const planNarrative = [
        `Iterate across every capability spec.`,
        `Call agentFactory.create for each spec to instantiate an agent.`,
        `Gather the registry contents so orchestrators can see what's available.`
      ];
      const specLiteral = specs
        .map((spec) => `{ name: "${spec.name}", capability: "${spec.capability}" }`)
        .join(', ');
      const code = `/**
 * @name MetaAgentFactory
 */
specs = [${specLiteral}]
index = 0
created = []
while (index < len(specs)) {
  spec = specs[index]
  agent = agentFactory.create(spec)
  created = created.push({ name: agent.name, capability: spec.capability })
  index = index + 1
}

factory_report = {
  requested: specs,
  created,
  available: agentFactory.list()
}`;
      return { code, metadata: { specs }, plan, brief, planNarrative };
    },
  },
  {
    name: 'uncertain_governance_router',
    description: 'Route governance outcome using uncertain confidence branches',
    generate() {
      const validator = randomItem(validatorNames);
      const plan = [
        { step: 'assess', capability: validator },
        { step: 'high_route', capability: validator },
        { step: 'medium_route', capability: 'policyBoard' },
        { step: 'low_route', capability: 'humanDesk' }
      ];
      const brief = `Have ${validator} assess a request, then branch via uncertain-if to policyBoard or humanDesk when confidence drops.`;
      const planNarrative = [
        `Invoke ${validator} to create the base assessment.`,
        `Convert the confidence into an uncertain signal.`,
        `Use uncertain branches to auto-approve, escalate to policyBoard, or defer to humanDesk.`
      ];
      const code = `/**
 * @name UncertainGovernanceRouter
 */
assessment = ${validator}.invoke({ request: input })
signal = assessment.confidence ~> assessment.confidence
decision = { status: "pending" }

uncertain if (signal) {
  high {
    decision = { status: "auto_approved", reviewer: "${validator}" }
  }
  medium {
    decision = policyBoard.invoke({ assessment })
  }
  low {
    decision = humanDesk.invoke({ assessment })
  }
  default {
    decision = { status: "deferred" }
  }
}

governance_decision = decision`;
      return { code, metadata: { validator }, plan, brief, planNarrative };
    },
  },
  {
    name: 'alignment_do_while',
    description: 'Iteratively align outputs using a do-while loop with telemetry logging',
    generate() {
      const agent = randomItem(agentNames);
      const target = randomFloat(0.72, 0.9);
      const plan = [
        { step: 'seed', capability: agent },
        { step: 'iterate', pattern: 'do_while' },
        { step: 'log', capability: 'telemetry' }
      ];
      const brief = `Use ${agent} in a do-while loop, logging telemetry each attempt until confidence reaches ${target.toFixed(2)}.`;
      const planNarrative = [
        `Kick off an attempt counter and run ${agent} at least once.`,
        `Record every attempt to telemetry with the observed confidence.`,
        `Stop when confidence crosses the goal or attempts exceed the maximum.`
      ];
      const code = `/**
 * @name AlignmentDoWhile
 */
attempt = 0
maxAttempts = 4
target = ${target.toFixed(2)}
history = []
candidate = {}

do {
  attempt = attempt + 1
  candidate = ${agent}.invoke({ attempt, context: input })
  telemetry.record({ attempt, confidence: candidate.confidence })
  history = history.push({ attempt, confidence: candidate.confidence })
} while (candidate.confidence < target && attempt < maxAttempts)

alignment_report = {
  attempts: attempt,
  history,
  final: candidate
}`;
      return { code, metadata: { agent, target }, plan, brief, planNarrative };
    },
  },
  {
    name: 'module_quality_audit',
    description: 'Audit modules with a C-style for loop, diagnostics, and early break',
    generate() {
      const inspector = randomItem(validatorNames);
      const modules = sample(['ingest', 'sync', 'notify', 'billing', 'analytics', 'governance'], 4);
      const plan = [
        { step: 'audit_modules', capability: inspector },
        { step: 'record_diagnostics', capability: 'diagnostics' },
        { step: 'persist', capability: 'knowledgeBase' }
      ];
      const brief = `March through ${formatList(modules)} with ${inspector}, log diagnostics, and break early if multiple modules fail confidence checks.`;
      const planNarrative = [
        `Iterate over modules with a C-style for loop.`,
        `Record diagnostic info for each audit.`,
        `Stop auditing when more than one module drops below 0.6 confidence; otherwise persist the verification data.`
      ];
      const moduleLiteral = modules.map((name) => `"${name}"`).join(', ');
      const code = `/**
 * @name ModuleQualityAudit
 */
modules = [${moduleLiteral}]
failures = []
index = 0

for i = 0; i < len(modules); i = i + 1 {
  moduleName = modules[i]
  report = ${inspector}.invoke({ module: moduleName })
  diagnostics.info("module_audit", { module: moduleName, confidence: report.confidence })

  if (report.confidence < 0.6) {
    diagnostics.warn("module_low_confidence", { module: moduleName, confidence: report.confidence })
    failures = failures.push({ module: moduleName, confidence: report.confidence })
    if (len(failures) > 1) {
      break
    }
    continue
  }

  knowledgeBase.upsert({ module: moduleName, status: "verified", confidence: report.confidence })
}

module_quality_report = { modules, failures }`;
      return { code, metadata: { inspector, modules }, plan, brief, planNarrative };
    },
  },
  {
    name: 'readiness_uncertain_loop',
    description: 'Use uncertain while loop to stabilize readiness signals',
    generate() {
      const plan = [
        { step: 'sample', capability: 'readinessSensor' },
        { step: 'adjust_high', action: 'break' },
        { step: 'adjust_medium', capability: 'readinessSensor.settle' },
        { step: 'adjust_low', capability: 'readinessSensor.boost' }
      ];
      const brief = `Stabilize readinessSensor signals using uncertain while branches that settle or boost the sensor until confidence is high.`;
      const planNarrative = [
        `Read the initial readiness signal and wrap its confidence in an uncertain expression.`,
        `When the signal achieves a high confidence, record the status and break.`,
        `Otherwise keep looping, either settling or boosting the sensor based on the branch.`
      ];
      const code = `/**
 * @name ReadinessUncertainLoop
 */
signal = readinessSensor.read()
updates = []
confidenceSignal = signal.level ~> signal.confidence

uncertain while (confidenceSignal) {
  high {
    updates = updates.push({ status: "aligned", confidence: signal.confidence })
    break
  }
  medium {
    signal = readinessSensor.settle()
    confidenceSignal = signal.level ~> signal.confidence
    updates = updates.push({ status: "settled", confidence: signal.confidence })
  }
  low {
    signal = readinessSensor.boost()
    confidenceSignal = signal.level ~> signal.confidence
    updates = updates.push({ status: "boosted", confidence: signal.confidence })
  }
}

readiness_summary = { updates, final: signal }`;
      return { code, metadata: {}, plan, brief, planNarrative };
    },
  },
  {
    name: 'telemetry_signal_inspector',
    description: 'Process telemetry signals with for-in loops and prioritization',
    generate() {
      const plan = [
        { step: 'gather_signals', capability: 'telemetry' },
        { step: 'inspect', pattern: 'for_in' },
        { step: 'prioritize', capability: 'diagnostics' }
      ];
      const brief = `Read telemetry signals, loop with for-in to track indices, and highlight critical ones via diagnostics.`;
      const planNarrative = [
        `Fetch the telemetry signal list.`,
        `Use a for-in loop to inspect each signal with its index.`,
        `Accumulate critical signals and emit diagnostics for the rest.`
      ];
      const code = `/**
 * @name TelemetrySignalInspector
 */
signals = telemetry.signals()
prioritized = []

for signal, index in signals {
  entry = {
    index,
    source: signal.source,
    severity: signal.severity,
    confidence: signal.confidence
  }

  if (signal.severity == "critical") {
    prioritized = prioritized.push(entry)
  } else {
    diagnostics.info("signal_ok", entry)
  }
}

telemetry_summary = {
  total: len(signals),
  prioritized
}`;
      return { code, metadata: { signalCount: 'dynamic' }, plan, brief, planNarrative };
    },
  },
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function sample(arr, count) {
  const copy = [...arr];
  const result = [];
  while (result.length < Math.min(count, copy.length)) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

async function loadParser() {
  const distEntry = path.join(__dirname, '..', '..', 'packages', 'prism-core', 'dist', 'index.js');
  if (!fs.existsSync(distEntry)) {
    console.error('Missing packages/prism-core/dist/index.js – run "pnpm --filter @prism-lang/core build" first.');
    process.exit(1);
  }
  const module = await import(distEntry);
  return module.parse;
}

function validateCode(code, parseFn) {
  try {
    parseFn(code);
    return true;
  } catch (err) {
    return false;
  }
}

function generateSamples(parseFn) {
const samples = [];
  for (const template of templates) {
    let attempts = 0;
    while (attempts < SAMPLES_PER_TEMPLATE * 2 && samples.filter((s) => s.template === template.name).length < SAMPLES_PER_TEMPLATE) {
      attempts++;
      const { code, metadata, plan, brief, planNarrative } = template.generate();
      if (!validateCode(code, parseFn)) {
        continue;
      }
      const scenario = pickScenarioForTemplate(template.name);
      const { ticket, dialogue } = pickNlArtifacts(scenario);
      const scenarioBrief = scenario ? `${scenario.title}: ${brief || template.description}` : (brief || template.description);
      const narrative = [...(planNarrative || [])];
      if (scenario) {
        narrative.push(`Scenario context: ${scenario.description}`);
      }
      const scenarioInfo = scenario
        ? { id: scenario.id, title: scenario.title, description: scenario.description, structuredSpec: scenario.structuredSpec }
        : undefined;
      const references = [
        ...(referenceLibrary[template.name] || []),
        ...(scenario?.references || []),
      ];
      samples.push({
        template: template.name,
        description: template.description,
        metadata,
        plan,
        brief: scenarioBrief,
        planNarrative: narrative,
        scenario: scenarioInfo,
        references,
        ticket,
        dialogue,
        prism: code,
      });
    }
  }
  return samples;
}

function writeDataset(samples) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const payload = samples.map((sample) => JSON.stringify(sample)).join('\n');
  fs.writeFileSync(OUTPUT_FILE, payload, 'utf8');
  console.log(`Generated ${samples.length} samples -> ${OUTPUT_FILE}`);
}

async function main() {
  writeScenarioCatalogFile();
  const parseFn = await loadParser();
  const samples = generateSamples(parseFn);
  writeDataset(samples);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
