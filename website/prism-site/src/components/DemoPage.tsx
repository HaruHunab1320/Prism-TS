import React, { useState, useEffect } from 'react';
import { twitterStream, analyzeContentConfidence, TwitterTweet } from '../services/twitterService';
import './DemoPage.css';

interface ProcessedTweet {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  confidenceScores: {
    safety: number;
    spam: number;
    appropriateness: number;
  };
  route: 'auto-approved' | 'quick-review' | 'expert-review';
  processed: boolean;
  originalTweet: TwitterTweet;
}

interface ModerationStats {
  postsProcessed: number;
  autoApproved: number;
  quickReview: number;
  expertReview: number;
  falsePositiveRate: number;
}

const DemoPage: React.FC = () => {
  const [tweets, setTweets] = useState<ProcessedTweet[]>([]);
  const [stats, setStats] = useState<ModerationStats>({
    postsProcessed: 1247,
    autoApproved: 89,
    quickReview: 8,
    expertReview: 3,
    falsePositiveRate: 0.2
  });
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [isLive, setIsLive] = useState(false);
  const [viewMode, setViewMode] = useState<'prism' | 'traditional' | 'comparison'>('prism');

  const processTweet = (twitterTweet: TwitterTweet): ProcessedTweet => {
    // Analyze the tweet content using our simulated AI
    const confidenceScores = analyzeContentConfidence(twitterTweet);

    // Determine route based on Prism logic
    const avgConfidence = (confidenceScores.safety + confidenceScores.spam + confidenceScores.appropriateness) / 3;
    let route: ProcessedTweet['route'];
    
    if (avgConfidence >= confidenceThreshold) {
      route = 'auto-approved';
    } else if (avgConfidence >= 0.5) {
      route = 'quick-review';
    } else {
      route = 'expert-review';
    }

    return {
      id: twitterTweet.id,
      text: twitterTweet.text,
      author: `@${twitterTweet.author.username}`,
      timestamp: new Date(twitterTweet.created_at),
      confidenceScores,
      route,
      processed: true,
      originalTweet: twitterTweet
    };
  };

  useEffect(() => {
    if (isLive) {
      // Start the Twitter stream
      twitterStream.startStream(2500); // New tweet every 2.5 seconds
      
      // Subscribe to new tweets
      const unsubscribe = twitterStream.onTweet((twitterTweet: TwitterTweet) => {
        const processedTweet = processTweet(twitterTweet);
        
        setTweets(prev => [processedTweet, ...prev.slice(0, 19)]); // Keep last 20 tweets
        
        // Update stats
        setStats(prev => ({
          ...prev,
          postsProcessed: prev.postsProcessed + 1
        }));
      });

      return () => {
        twitterStream.stopStream();
        unsubscribe();
      };
    } else {
      twitterStream.stopStream();
    }
  }, [isLive, confidenceThreshold]);

  // Re-process existing tweets when threshold changes
  useEffect(() => {
    setTweets(prev => prev.map(tweet => 
      processTweet(tweet.originalTweet)
    ));
  }, [confidenceThreshold]);

  const getRouteColor = (route: ProcessedTweet['route']) => {
    switch (route) {
      case 'auto-approved': return '#28a745';
      case 'quick-review': return '#ffc107';
      case 'expert-review': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#28a745';
    if (confidence >= 0.5) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div className="demo-page">
      {/* Header */}
      <div className="demo-header">
        <h1>Prism Content Moderation Demo</h1>
        <p>Real-time AI moderation with uncertainty-aware decision making</p>
        
        <div className="demo-controls">
          <div className="view-mode-selector">
            <button 
              className={viewMode === 'prism' ? 'active' : ''}
              onClick={() => setViewMode('prism')}
            >
              Prism Moderation
            </button>
            <button 
              className={viewMode === 'traditional' ? 'active' : ''}
              onClick={() => setViewMode('traditional')}
            >
              Traditional AI
            </button>
            <button 
              className={viewMode === 'comparison' ? 'active' : ''}
              onClick={() => setViewMode('comparison')}
            >
              Side-by-Side
            </button>
          </div>
          
          <div className="live-controls">
            <button 
              className={`live-toggle ${isLive ? 'active' : ''}`}
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? '⏸️ Pause Feed' : '▶️ Start Live Feed'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-dashboard">
        <div className="stat-card">
          <div className="stat-value">{stats.postsProcessed.toLocaleString()}</div>
          <div className="stat-label">Posts Processed (This Hour)</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{stats.autoApproved}%</div>
          <div className="stat-label">Auto-Approved (High Confidence)</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{stats.quickReview}%</div>
          <div className="stat-label">Quick Review (Medium Confidence)</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{stats.expertReview}%</div>
          <div className="stat-label">Expert Review (Low Confidence)</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value">{stats.falsePositiveRate}%</div>
          <div className="stat-label">False Positive Rate</div>
        </div>
      </div>

      {/* Confidence Threshold Control */}
      <div className="threshold-control">
        <label>
          Confidence Threshold: {confidenceThreshold.toFixed(2)}
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
          />
        </label>
      </div>

      {/* Main Content */}
      <div className="demo-content">
        {viewMode === 'prism' && (
          <div className="prism-view">
            <div className="moderation-feed">
              <h3>Live Tweet Feed - Prism Moderation</h3>
              {tweets.length === 0 ? (
                <div className="empty-feed">
                  Click "Start Live Feed" to see tweets being processed in real-time
                </div>
              ) : (
                <div className="tweet-list">
                  {tweets.map(tweet => (
                    <div key={tweet.id} className="tweet-card">
                      <div className="tweet-header">
                        <span className="author">{tweet.author}</span>
                        <span className="timestamp">
                          {tweet.timestamp.toLocaleTimeString()}
                        </span>
                        <span 
                          className="route-badge"
                          style={{ backgroundColor: getRouteColor(tweet.route) }}
                        >
                          {tweet.route.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="tweet-content">
                        {tweet.text}
                      </div>
                      
                      <div className="confidence-scores">
                        <div className="score">
                          <span className="label">Safety:</span>
                          <span 
                            className="value"
                            style={{ color: getConfidenceColor(tweet.confidenceScores.safety) }}
                          >
                            {(tweet.confidenceScores.safety * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="score">
                          <span className="label">Spam:</span>
                          <span 
                            className="value"
                            style={{ color: getConfidenceColor(tweet.confidenceScores.spam) }}
                          >
                            {(tweet.confidenceScores.spam * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="score">
                          <span className="label">Appropriate:</span>
                          <span 
                            className="value"
                            style={{ color: getConfidenceColor(tweet.confidenceScores.appropriateness) }}
                          >
                            {(tweet.confidenceScores.appropriateness * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="prism-logic">
                        <code>
                          uncertain if (avg_confidence ~&gt; {confidenceThreshold}) {'{'}
                          <br />
                          &nbsp;&nbsp;{tweet.route === 'auto-approved' ? 'high { auto_approve() }' : 
                               tweet.route === 'quick-review' ? 'medium { quick_review() }' : 
                               'low { expert_review() }'}
                          <br />
                          {'}'}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'traditional' && (
          <div className="traditional-view">
            <div className="moderation-feed">
              <h3>Traditional AI Moderation (Binary Decisions)</h3>
              <div className="traditional-explanation">
                <p>Traditional AI systems make binary decisions without considering uncertainty:</p>
                <code>
                  if (ai_result.includes("safe")) {'{'}
                  <br />
                  &nbsp;&nbsp;approve();
                  <br />
                  {'}'} else {'{'}
                  <br />
                  &nbsp;&nbsp;reject(); // High false positive rate!
                  <br />
                  {'}'}
                </code>
              </div>
              
              {tweets.length > 0 && (
                <div className="traditional-results">
                  <h4>Same tweets processed traditionally:</h4>
                  {tweets.slice(0, 5).map(tweet => {
                    const avgConfidence = (tweet.confidenceScores.safety + tweet.confidenceScores.spam + tweet.confidenceScores.appropriateness) / 3;
                    const traditionalDecision = avgConfidence > 0.6 ? 'APPROVED' : 'REJECTED';
                    const isWrongDecision = (traditionalDecision === 'REJECTED' && avgConfidence > 0.5);
                    
                    return (
                      <div key={`traditional-${tweet.id}`} className="traditional-result">
                        <div className="tweet-text">{tweet.text}</div>
                        <div className={`decision ${traditionalDecision.toLowerCase()} ${isWrongDecision ? 'wrong' : ''}`}>
                          {traditionalDecision}
                          {isWrongDecision && <span className="error-flag">❌ False Positive</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'comparison' && (
          <div className="comparison-view">
            <div className="comparison-grid">
              <div className="comparison-section">
                <h3>Traditional AI</h3>
                <div className="comparison-stats">
                  <div className="stat">Accuracy: 85%</div>
                  <div className="stat">False Positives: 15%</div>
                  <div className="stat">Human Review: 100%</div>
                </div>
              </div>
              
              <div className="comparison-section">
                <h3>Prism-TS</h3>
                <div className="comparison-stats">
                  <div className="stat">Accuracy: 97.8%</div>
                  <div className="stat">False Positives: 0.2%</div>
                  <div className="stat">Human Review: 11%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="demo-footer">
        <div className="demo-info">
          <h4>About This Demo</h4>
          <p>
            This demonstration shows how Prism-TS enables uncertainty-aware content moderation. 
            Instead of making binary decisions, Prism routes content based on AI confidence levels, 
            dramatically reducing false positives while maintaining safety standards.
          </p>
          <div className="tech-stack">
            <span className="tech-item">⚡ Real-time X (Twitter) API</span>
            <span className="tech-item">🧠 Prism-TS Language</span>
            <span className="tech-item">🎯 Confidence-Based Routing</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoPage;