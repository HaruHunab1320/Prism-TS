import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import React from "react";
import CodeBlock from "@theme/CodeBlock";

import styles from "./index.module.css";

// Modern SVG Icons
const Icons = {
  target: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  brain: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  ),
  workflow: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1"/>
      <rect x="15" y="3" width="6" height="6" rx="1"/>
      <rect x="9" y="15" width="6" height="6" rx="1"/>
      <path d="M6 9v3a1 1 0 0 0 1 1h4"/>
      <path d="M18 9v3a1 1 0 0 1-1 1h-4"/>
    </svg>
  ),
  gauge: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 4-4"/>
      <path d="M3.34 19a10 10 0 1 1 17.32 0"/>
    </svg>
  ),
  code: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  package: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24"/>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.29 7 12 12 20.71 7"/>
      <line x1="12" y1="22" x2="12" y2="12"/>
    </svg>
  ),
  chip: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <path d="M15 2v2"/>
      <path d="M15 20v2"/>
      <path d="M2 15h2"/>
      <path d="M2 9h2"/>
      <path d="M20 15h2"/>
      <path d="M20 9h2"/>
      <path d="M9 2v2"/>
      <path d="M9 20v2"/>
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  flask: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6"/>
      <path d="M10 9V3"/>
      <path d="M14 9V3"/>
      <path d="M10 9a5 5 0 0 0-5 5v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4a5 5 0 0 0-5-5h-4Z"/>
    </svg>
  ),
};

const heroCode = `// AI responses automatically include confidence
analysis = llm("Analyze this code for vulnerabilities")
// Returns: "No critical issues found" ~> 0.85

// Make decisions based on confidence level
uncertain if (analysis) {
  high { deploy_to_production() }    // confidence >= 0.7
  medium { request_human_review() }  // 0.5 <= confidence < 0.7
  low { block_deployment() }         // confidence < 0.5
}`;

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <img
            src="/img/prism-logo-v1.png"
            alt="Prism"
            className={styles.heroLogo}
          />
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <div className={styles.heroButtons}>
            <Link
              className={clsx("button", styles.primaryButton)}
              to="/docs/intro"
            >
              Get Started
            </Link>
            <Link
              className={clsx("button", styles.secondaryButton)}
              to="/docs/reference/quick-reference"
            >
              Quick Reference
            </Link>
            <Link
              className={clsx("button", styles.ghostButton)}
              to="https://github.com/HaruHunab1320/Prism-TS"
            >
              GitHub
            </Link>
          </div>
        </div>
        <div className={styles.heroCode}>
          <CodeBlock language="javascript" title="example.prism">
            {heroCode}
          </CodeBlock>
        </div>
      </div>
    </header>
  );
}

function Feature({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Why Prism?</h2>
          <p className={styles.sectionSubtitle}>
            A programming language designed for the age of AI
          </p>
        </div>
        <div className={styles.featuresGrid}>
          <Feature
            icon={Icons.target}
            title="First-Class Uncertainty"
            description="Attach confidence levels to any value. Uncertainty propagates automatically through calculations."
          />
          <Feature
            icon={Icons.brain}
            title="Built for AI"
            description="Native LLM integration with automatic confidence extraction. Handle AI responses with explicit uncertainty tracking."
          />
          <Feature
            icon={Icons.workflow}
            title="Confidence Flow Control"
            description="Make decisions based on confidence thresholds with intuitive uncertain if statements and branching."
          />
          <Feature
            icon={Icons.gauge}
            title="Calibrated Confidence"
            description="Extract and calibrate confidence from LLMs using consistency checks, response analysis, and domain-specific patterns."
          />
          <Feature
            icon={Icons.code}
            title="TypeScript First"
            description="Familiar JavaScript-like syntax with full TypeScript support. Modern tooling and IDE integration."
          />
          <Feature
            icon={Icons.package}
            title="Modular Design"
            description="Pick what you need: core language, confidence extraction, LLM providers, and validation tools."
          />
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section className={styles.useCases}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Use Cases</h2>
          <p className={styles.sectionSubtitle}>
            Handle uncertainty in AI responses, sensor data, and complex computations
          </p>
        </div>
        <div className={styles.useCaseGrid}>
          <div className={styles.useCase}>
            <div className={styles.useCaseIcon}>{Icons.brain}</div>
            <h3>AI Applications</h3>
            <p>
              Handle LLM responses with explicit confidence tracking and make
              decisions based on reliability thresholds.
            </p>
          </div>
          <div className={styles.useCase}>
            <div className={styles.useCaseIcon}>{Icons.chip}</div>
            <h3>IoT & Sensors</h3>
            <p>
              Manage noisy sensor data with uncertainty bounds and automatic
              confidence propagation through pipelines.
            </p>
          </div>
          <div className={styles.useCase}>
            <div className={styles.useCaseIcon}>{Icons.shield}</div>
            <h3>Risk Analysis</h3>
            <p>
              Make risk-aware decisions with confidence budgets, differential
              analysis, and threshold gates.
            </p>
          </div>
          <div className={styles.useCase}>
            <div className={styles.useCaseIcon}>{Icons.flask}</div>
            <h3>Scientific Computing</h3>
            <p>
              Propagate measurement errors and uncertainty through complex
              calculations automatically.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function InstallSection() {
  return (
    <section className={styles.installSection}>
      <div className="container">
        <div className={styles.installContent}>
          <h2>Get Started in Seconds</h2>
          <CodeBlock language="bash">
            npm install @prism-lang/core @prism-lang/llm
          </CodeBlock>
          <div className={styles.installLinks}>
            <Link to="/docs/getting-started/installation">
              Installation Guide →
            </Link>
            <Link to="/docs/getting-started/first-program">
              Write Your First Program →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Programming with Confidence`}
      description="A programming language where uncertainty is a first-class citizen. Handle AI responses, sensor data, and complex computations with explicit confidence tracking."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <UseCases />
        <InstallSection />
      </main>
    </Layout>
  );
}
