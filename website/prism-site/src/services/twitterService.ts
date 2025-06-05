// Twitter API Service for fetching real tweets
// Note: For demo purposes, we'll use simulated data that looks like real tweets
// In production, you'd need Twitter API credentials and proper authentication

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  verified: boolean;
}

export interface TwitterTweet {
  id: string;
  text: string;
  author: TwitterUser;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
}

// Simulated tweet data that represents real Twitter content patterns
const simulatedTweets: Omit<TwitterTweet, 'id' | 'created_at'>[] = [
  {
    text: "Just launched my new startup! 🚀 Been working on this for months and finally ready to share with the world. Excited for what's next! #startup #entrepreneur",
    author: {
      id: "user1",
      username: "startup_founder",
      name: "Alex Chen",
      verified: false
    },
    public_metrics: { retweet_count: 12, like_count: 89, reply_count: 23, quote_count: 3 }
  },
  {
    text: "Free Bitcoin! Click this link now! Limited time offer! Don't miss out! 💎💰 #bitcoin #crypto #free",
    author: {
      id: "user2", 
      username: "crypto_deals_2024",
      name: "Crypto Deals",
      verified: false
    },
    public_metrics: { retweet_count: 2, like_count: 5, reply_count: 1, quote_count: 0 }
  },
  {
    text: "Beautiful sunset from my backyard tonight 🌅 Sometimes you need to stop and appreciate the simple things in life",
    author: {
      id: "user3",
      username: "nature_lover_jane",
      name: "Jane Wilson", 
      verified: false
    },
    public_metrics: { retweet_count: 3, like_count: 45, reply_count: 8, quote_count: 1 }
  },
  {
    text: "URGENT: Major security breach detected! All users must update passwords immediately! Click here: malicious-link.com #security #urgent",
    author: {
      id: "user4",
      username: "security_alerts_now",
      name: "Security Alerts",
      verified: false
    },
    public_metrics: { retweet_count: 156, like_count: 23, reply_count: 89, quote_count: 12 }
  },
  {
    text: "Working from my favorite coffee shop today ☕ The wifi here is amazing and the atmosphere really helps me focus. Highly recommend!",
    author: {
      id: "user5",
      username: "remote_worker_mike",
      name: "Mike Johnson",
      verified: false
    },
    public_metrics: { retweet_count: 8, like_count: 67, reply_count: 15, quote_count: 2 }
  },
  {
    text: "Politicians are destroying this country! Time for a revolution! They don't care about us! Fight back! #politics #revolution #angry",
    author: {
      id: "user6",
      username: "angry_patriot_2024",
      name: "True Patriot",
      verified: false
    },
    public_metrics: { retweet_count: 234, like_count: 156, reply_count: 445, quote_count: 67 }
  },
  {
    text: "Just finished reading an amazing book on artificial intelligence. The future is going to be incredible! Excited to see how AI transforms every industry.",
    author: {
      id: "user7",
      username: "tech_enthusiast_sarah",
      name: "Sarah Davis",
      verified: true
    },
    public_metrics: { retweet_count: 45, like_count: 234, reply_count: 67, quote_count: 12 }
  },
  {
    text: "Make $5000 a week working from home! No experience needed! Message me for details! This changed my life! #workfromhome #makemoney #opportunity",
    author: {
      id: "user8",
      username: "make_money_fast_2024",
      name: "Work From Home Pro",
      verified: false
    },
    public_metrics: { retweet_count: 12, like_count: 8, reply_count: 3, quote_count: 1 }
  },
  {
    text: "Climate change is the defining issue of our time. We need immediate action from world leaders. The science is clear - we must act now. 🌍 #climatechange",
    author: {
      id: "user9",
      username: "climate_scientist_dr_smith",
      name: "Dr. Emma Smith",
      verified: true
    },
    public_metrics: { retweet_count: 567, like_count: 1234, reply_count: 234, quote_count: 89 }
  },
  {
    text: "Proud of my team for shipping this feature! 6 months of hard work finally paying off. Couldn't have done it without this amazing group of engineers. 👨‍💻",
    author: {
      id: "user10",
      username: "engineering_lead_tom",
      name: "Tom Rodriguez",
      verified: false
    },
    public_metrics: { retweet_count: 23, like_count: 156, reply_count: 34, quote_count: 5 }
  }
];

// Simulated content moderation confidence scoring
// In a real implementation, this would call actual AI APIs like OpenAI, Anthropic, etc.
export const analyzeContentConfidence = (tweet: TwitterTweet) => {
  const text = tweet.text.toLowerCase();
  
  // Safety analysis - look for dangerous/harmful content
  let safetyConfidence = 0.95; // Default to high confidence it's safe
  
  if (text.includes('urgent') && text.includes('click')) {
    safetyConfidence = 0.35; // Likely phishing
  } else if (text.includes('revolution') || text.includes('fight back')) {
    safetyConfidence = 0.45; // Potentially inciting content
  } else if (text.includes('security breach') && text.includes('click here')) {
    safetyConfidence = 0.25; // Very suspicious
  }
  
  // Spam analysis - look for promotional/spam content  
  let spamConfidence = 0.90; // Default to high confidence it's not spam
  
  if (text.includes('free') && text.includes('click')) {
    spamConfidence = 0.20; // Likely spam
  } else if (text.includes('make money') || text.includes('work from home')) {
    spamConfidence = 0.30; // Probably spam
  } else if (text.includes('limited time') || text.includes('don\'t miss out')) {
    spamConfidence = 0.35; // Promotional spam
  }
  
  // Appropriateness analysis - look for inappropriate content
  let appropriatenessConfidence = 0.92; // Default to high confidence it's appropriate
  
  if (text.includes('destroying') || text.includes('angry')) {
    appropriatenessConfidence = 0.55; // Potentially inflammatory
  } else if (tweet.public_metrics.reply_count > 200) {
    appropriatenessConfidence = 0.70; // High engagement might indicate controversy
  }
  
  // Add some randomness to simulate real AI uncertainty
  const randomVariation = () => (Math.random() - 0.5) * 0.1;
  
  return {
    safety: Math.max(0, Math.min(1, safetyConfidence + randomVariation())),
    spam: Math.max(0, Math.min(1, spamConfidence + randomVariation())),
    appropriateness: Math.max(0, Math.min(1, appropriatenessConfidence + randomVariation()))
  };
};

// Simulate streaming tweets
export class TwitterStreamSimulator {
  private tweetIndex = 0;
  private listeners: ((tweet: TwitterTweet) => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  startStream(intervalMs: number = 3000) {
    if (this.intervalId) {
      this.stopStream();
    }

    this.intervalId = setInterval(() => {
      const tweetTemplate = simulatedTweets[this.tweetIndex % simulatedTweets.length];
      
      const tweet: TwitterTweet = {
        ...tweetTemplate,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      
      this.listeners.forEach(listener => listener(tweet));
      this.tweetIndex++;
    }, intervalMs);
  }

  stopStream() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onTweet(callback: (tweet: TwitterTweet) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  isStreaming(): boolean {
    return this.intervalId !== null;
  }
}

// Export singleton instance
export const twitterStream = new TwitterStreamSimulator();

// For future real Twitter API integration
export const setupTwitterAPI = async (apiKey: string, apiSecret: string, bearerToken: string) => {
  // This would initialize the real Twitter API client
  // For now, we'll use simulated data
  console.log('Twitter API would be initialized here with real credentials');
  
  // Example of how real implementation would look:
  // const client = new TwitterApi(bearerToken);
  // return client;
};