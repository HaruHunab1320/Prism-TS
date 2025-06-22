import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="logo-icon">🌟</span>
              <span className="logo-text">Prism-TS</span>
            </div>
            <p className="footer-description">
              AI Orchestration with Native Uncertainty - 
              A programming language designed for the age of artificial intelligence.
            </p>
            <div className="footer-status">
              <span className="status-badge">v1.0 Production Ready</span>
            </div>
          </div>

          <div className="footer-section">
            <h4>Documentation</h4>
            <ul className="footer-links">
              <li><Link to="/docs">Getting Started</Link></li>
              <li><Link to="/docs">Language Reference</Link></li>
              <li><Link to="/docs">API Documentation</Link></li>
              <li><Link to="/examples">Code Examples</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Tools</h4>
            <ul className="footer-links">
              <li><Link to="/playground">Online Playground</Link></li>
              <li><a href="https://github.com/HaruHunab1320/Prism-TS" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
              <li><a href="https://github.com/HaruHunab1320/Prism-TS/releases" target="_blank" rel="noopener noreferrer">Download</a></li>
              <li><a href="https://github.com/HaruHunab1320/Prism-TS/issues" target="_blank" rel="noopener noreferrer">Report Issues</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Community</h4>
            <ul className="footer-links">
              <li><a href="https://github.com/HaruHunab1320/Prism-TS/discussions" target="_blank" rel="noopener noreferrer">Discussions</a></li>
              <li><a href="https://github.com/HaruHunab1320/Prism-TS/wiki" target="_blank" rel="noopener noreferrer">Wiki</a></li>
              <li><a href="https://twitter.com/prismts" target="_blank" rel="noopener noreferrer">Twitter</a></li>
              <li><a href="mailto:hello@prism-ts.dev">Contact</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul className="footer-links">
              <li><a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer">Google Gemini API</a></li>
              <li><a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Claude API</a></li>
              <li><a href="https://github.com/HaruHunab1320/Prism-TS/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">Contributing Guide</a></li>
              <li><a href="https://github.com/HaruHunab1320/Prism-TS/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">License</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-copyright">
              <p>&copy; {currentYear} Prism-TS. Open source under MIT License.</p>
            </div>
            
            <div className="footer-features">
              <span className="feature-badge">🎯 Confidence-Aware</span>
              <span className="feature-badge">🤔 Uncertainty Handling</span>
              <span className="feature-badge">🧠 AI-Native</span>
              <span className="feature-badge">✅ Production Ready</span>
            </div>

            <div className="footer-social">
              <a href="https://github.com/HaruHunab1320/Prism-TS" target="_blank" rel="noopener noreferrer" className="social-link">
                <span>GitHub</span>
              </a>
              <a href="https://twitter.com/prismts" target="_blank" rel="noopener noreferrer" className="social-link">
                <span>Twitter</span>
              </a>
              <a href="https://linkedin.com/company/prism-ts" target="_blank" rel="noopener noreferrer" className="social-link">
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;