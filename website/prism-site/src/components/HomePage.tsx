import React from 'react';
import { Link } from 'react-router-dom';
import CodeBlock from './CodeBlock';
import './HomePage.css';

const HomePage: React.FC = () => {
  const exampleCode = `// Basic confidence assignment
measurement = 100 ~> 0.85

// LLM integration with uncertainty
analysis = llm("Analyze this measurement: " + measurement)

// Uncertainty-aware branching
uncertain if (analysis ~> 0.8) {
  high { 
    decision = "Proceed with confidence"
    priority = "HIGH"
  }
  medium { 
    decision = "Review manually"
    priority = "MEDIUM"
  }
  low { 
    decision = "Reject measurement"
    priority = "LOW"
  }
}

decision`;

  const features = [
    {
      icon: '🎯',
      title: 'Confidence-Aware Values',
      description: 'Every value can carry confidence information with the ~> operator'
    },
    {
      icon: '🤔',
      title: 'Uncertain Control Flow',
      description: 'Branch logic based on confidence levels with uncertain if statements'
    },
    {
      icon: '🧠',
      title: 'Native LLM Integration',
      description: 'Built-in llm() function with automatic confidence handling'
    },
    {
      icon: '📦',
      title: 'Context Management',
      description: 'Isolated execution environments for complex AI workflows'
    },
    {
      icon: '🔗',
      title: 'Real AI Providers',
      description: 'Support for Claude (Anthropic) and Gemini (Google)'
    },
    {
      icon: '✅',
      title: '100% Test Coverage',
      description: 'Production-ready with comprehensive validation'
    }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-icon">🌟</span>
            Prism-TS
          </h1>
          <p className="hero-subtitle">
            AI Orchestration with Native Uncertainty
          </p>
          <p className="hero-description">
            A programming language designed for orchestrating Large Language Models 
            with built-in confidence handling and uncertainty-aware control flow.
          </p>
          
          <div className="hero-actions">
            <Link to="/docs" className="btn-primary">
              Get Started
            </Link>
            <Link to="/playground" className="btn-secondary">
              Try Live Demo
            </Link>
          </div>

          <div className="hero-status">
            <span className="status-badge">✅ v1.0 Production Ready</span>
            <span className="status-text">100% success rate on comprehensive test suite</span>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="code-example">
        <div className="container">
          <h2>Your First Prism Program</h2>
          <p>Experience uncertainty-aware programming with natural AI integration:</p>
          <CodeBlock code={exampleCode} language="prism" />
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Key Features</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="quick-start">
        <div className="container">
          <h2>Quick Start</h2>
          <div className="quick-start-content">
            <div className="quick-start-steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Clone the Repository</h4>
                  <CodeBlock 
                    code="git clone https://github.com/HaruHunab1320/Prism-TS.git\ncd prism-ts\nnpm install" 
                    language="bash" 
                  />
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Configure AI Providers</h4>
                  <CodeBlock 
                    code="# Create .env file\nGEMINI_API_KEY=your_gemini_api_key_here\nANTHROPIC_API_KEY=your_anthropic_api_key_here" 
                    language="env" 
                  />
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Start the REPL</h4>
                  <CodeBlock 
                    code={`npm run repl

# Try it out:
prism> creative = llm("Write a haiku about programming")
Code flows, logic blooms,
Bugs in the night, a dark fight,
Triumph, dawn's new light. (~90.0%)`} 
                    language="bash" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta">
        <div className="container">
          <h2>Ready to orchestrate AI with confidence?</h2>
          <p>Get started with Prism today and experience the future of AI programming.</p>
          <div className="cta-actions">
            <Link to="/docs" className="btn-primary large">
              Read the Documentation
            </Link>
            <Link to="/examples" className="btn-secondary large">
              Explore Examples
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;