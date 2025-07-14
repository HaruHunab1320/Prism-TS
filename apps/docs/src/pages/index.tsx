import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();

  return (
    <header className={styles.hero}>
      <div className={styles.particleContainer}>
        <BrowserOnly fallback={<div />}>
          {() => {
            const ParticleBackground = require('../components/ParticleBackground').default;
            return <ParticleBackground />;
          }}
        </BrowserOnly>
      </div>
      <div className={styles.heroContent}>
        <img 
          src="/img/prism-logo-v1.png" 
          alt="Prism - Programming with Confidence" 
          className={styles.heroLogo}
        />
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.heroButtons}>
          <Link
            className={clsx('button', styles.primaryButton)}
            to="/docs/intro">
            Get Started
          </Link>
          <Link
            className={clsx('button', styles.secondaryButton)}
            to="https://github.com/HaruHunab1320/Prism-TS">
            View on GitHub
          </Link>
        </div>
        <div className={styles.codeExample}>
          <pre>
            <code>{`// Handle AI responses with confidence
analysis = llm("Is this secure?") ~> 0.85

uncertain if (analysis) {
  high { deploy() }
  medium { review() }
  low { abort() }
}`}</code>
          </pre>
        </div>
      </div>
    </header>
  );
}

function Feature({title, description, icon}: {title: string; description: string; icon: string}) {
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
        <div className={styles.featuresGrid}>
          <Feature
            icon="🎯"
            title="First-Class Uncertainty"
            description="Attach confidence levels to any value and propagate uncertainty through calculations automatically."
          />
          <Feature
            icon="🤖"
            title="AI-Ready Design"
            description="Built for the age of AI with explicit confidence tracking and the @prism/confidence library for extraction."
          />
          <Feature
            icon="🌊"
            title="Confidence Flow Control"
            description="Make decisions based on confidence thresholds with intuitive uncertain if statements."
          />
          <Feature
            icon="📊"
            title="Confidence Extraction"
            description="Extract confidence from LLMs and other sources with @prism/confidence - consistency checks, response analysis, and more."
          />
          <Feature
            icon="🔧"
            title="TypeScript First"
            description="Full TypeScript support with type safety, IntelliSense, and modern tooling integration."
          />
          <Feature
            icon="📦"
            title="Modular Design"
            description="Pick only what you need with our modular package ecosystem: core, confidence, and LLM modules."
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
        <h2 className={styles.sectionTitle}>Built for the Age of AI</h2>
        <p className={styles.sectionSubtitle}>
          Handle uncertainty in AI responses, sensor data, and complex computations with confidence
        </p>
        <div className={styles.useCaseGrid}>
          <div className={styles.useCase}>
            <h3>AI Applications</h3>
            <p>Handle LLM responses with explicit confidence tracking and decision thresholds.</p>
          </div>
          <div className={styles.useCase}>
            <h3>IoT & Sensors</h3>
            <p>Manage noisy sensor data with uncertainty bounds and confidence propagation.</p>
          </div>
          <div className={styles.useCase}>
            <h3>Risk Analysis</h3>
            <p>Make risk-aware decisions with confidence budgets and differential analysis.</p>
          </div>
          <div className={styles.useCase}>
            <h3>Scientific Computing</h3>
            <p>Propagate measurement errors and uncertainty through complex calculations.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Programming with Confidence`}
      description="A programming language where uncertainty is a first-class citizen. Handle AI responses, sensor data, and complex computations with explicit confidence tracking.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <UseCases />
      </main>
    </Layout>
  );
}