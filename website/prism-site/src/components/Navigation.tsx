import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🌟</span>
          <span className="logo-text">Prism-TS</span>
        </Link>
        
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/docs" 
            className={`nav-link ${isActive('/docs') ? 'active' : ''}`}
          >
            Documentation
          </Link>
          <Link 
            to="/examples" 
            className={`nav-link ${isActive('/examples') ? 'active' : ''}`}
          >
            Examples
          </Link>
          <Link 
            to="/playground" 
            className={`nav-link ${isActive('/playground') ? 'active' : ''}`}
          >
            Playground
          </Link>
          <Link 
            to="/demo" 
            className={`nav-link ${isActive('/demo') ? 'active' : ''}`}
          >
            Live Demo
          </Link>
        </div>

        <div className="nav-actions">
          <a 
            href="https://github.com/your-username/prism-ts" 
            className="nav-github"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;