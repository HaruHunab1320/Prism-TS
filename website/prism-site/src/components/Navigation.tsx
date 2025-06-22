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
          <span className="logo-text gradient-text">Prism</span>
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
            Docs
          </Link>
          <Link 
            to="/operators" 
            className={`nav-link ${isActive('/operators') ? 'active' : ''}`}
          >
            Operators
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
        </div>

        <div className="nav-actions">
          <a 
            href="https://www.npmjs.com/package/prism-uncertainty" 
            className="nav-link nav-npm"
            target="_blank"
            rel="noopener noreferrer"
          >
            npm
          </a>
          <a 
            href="https://github.com/HaruHunab1320/Prism-TS" 
            className="nav-link nav-github"
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