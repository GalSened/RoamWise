// API Configuration for RoamWise Personal AI
const API_CONFIG = {
  // Personal AI Backend (o3-mini powered)
  baseURL: 'https://premium-hybrid-473405-g7.uc.r.appspot.com',
  
  // API Endpoints
  endpoints: {
    // AI Chat & Conversation
    chat: '/api/ai/chat',
    recommend: '/api/ai/recommend',
    
    // Intelligence & Search  
    search: '/api/intelligence/search',
    plan: '/api/intelligence/plan',
    
    // Travel Memory & Learning
    saveTrip: '/api/memory/trip',
    getInsights: '/api/memory/insights',
    
    // Preference Learning
    learn: '/api/preferences/learn',
    getProfile: '/api/preferences/profile',
    
    // System
    health: '/health'
  },
  
  // Request Configuration
  timeout: 30000, // 30 seconds for AI processing
  retries: 3,
  
  // AI Model Info
  model: 'o3-mini',
  capabilities: [
    'Personalized Recommendations',
    'Travel Memory & Learning', 
    'Weather-Aware Planning',
    'Conversational Interface',
    'Real-time Intelligence',
    'Behavioral Adaptation'
  ]
};

// API Helper Functions
class PersonalAI_API {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'RoamWise-Frontend/2.0'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: this.defaultHeaders,
      timeout: API_CONFIG.timeout,
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // AI Chat Interface
  async chat(message, context = {}) {
    return this.request(API_CONFIG.endpoints.chat, {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }

  // Get AI Recommendations
  async getRecommendations(preferences, context = {}) {
    return this.request(API_CONFIG.endpoints.recommend, {
      method: 'POST', 
      body: JSON.stringify({ preferences, context })
    });
  }

  // Intelligent Search
  async intelligentSearch(query, location, preferences = {}) {
    return this.request(API_CONFIG.endpoints.search, {
      method: 'POST',
      body: JSON.stringify({ query, location, preferences })
    });
  }

  // Create Personalized Plan
  async createPlan(destination, dates, preferences = {}) {
    return this.request(API_CONFIG.endpoints.plan, {
      method: 'POST',
      body: JSON.stringify({ destination, dates, preferences })
    });
  }

  // Save Trip Memory
  async saveTrip(tripData) {
    return this.request(API_CONFIG.endpoints.saveTrip, {
      method: 'POST',
      body: JSON.stringify(tripData)
    });
  }

  // Get Travel Insights
  async getInsights() {
    return this.request(API_CONFIG.endpoints.getInsights);
  }

  // Learn from User Interaction
  async learn(interaction, feedback) {
    return this.request(API_CONFIG.endpoints.learn, {
      method: 'POST',
      body: JSON.stringify({ interaction, feedback })
    });
  }

  // Get User Preference Profile
  async getProfile() {
    return this.request(API_CONFIG.endpoints.getProfile);
  }

  // Health Check
  async health() {
    return this.request(API_CONFIG.endpoints.health);
  }
}

// Export for use in app
const personalAI = new PersonalAI_API();

// Make available globally
if (typeof window !== 'undefined') {
  window.PersonalAI = personalAI;
  window.API_CONFIG = API_CONFIG;
}

export { personalAI, API_CONFIG };