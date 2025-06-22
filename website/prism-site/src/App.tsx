import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import DocsPage from './components/DocsPage';
import OperatorsPage from './components/OperatorsPage';
import ExamplesPage from './components/ExamplesPage';
import PlaygroundPage from './components/PlaygroundPage';
import DemoPage from './components/DemoPage';
import Navigation from './components/Navigation';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/operators" element={<OperatorsPage />} />
            <Route path="/examples" element={<ExamplesPage />} />
            <Route path="/playground" element={<PlaygroundPage />} />
            <Route path="/demo" element={<DemoPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
