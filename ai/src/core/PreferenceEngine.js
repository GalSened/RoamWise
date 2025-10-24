const { Firestore } = require('@google-cloud/firestore');
const tf = require('@tensorflow/tfjs-node');
const _ = require('lodash');

class PreferenceEngine {
  constructor() {
    this.firestore = new Firestore();
    this.preferences = new Map();
    this.learningModel = null;
    this.personalityProfile = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('🎯 Initializing Preference Engine...');
      await this.loadPreferences();
      await this.loadPersonalityProfile();
      await this.initializeLearningModel();
      console.log('✅ Preference Engine ready');
    } catch (error) {
      console.error('❌ Failed to initialize Preference Engine:', error);
    }
  }

  async loadPreferences() {
    try {
      const snapshot = await this.firestore
        .collection('preferences')
        .where('userId', '==', 'personal')
        .get();
      
      snapshot.docs.forEach(doc => {
        this.preferences.set(doc.id, doc.data());
      });
      
      console.log(`Loaded ${this.preferences.size} preference sets`);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }

  async loadPersonalityProfile() {
    try {
      const doc = await this.firestore.collection('personality_profile').doc('personal').get();
      if (doc.exists) {
        this.personalityProfile = doc.data();
      } else {
        this.personalityProfile = {
          travelPersonality: 'discovering',
          riskTolerance: 'medium',
          planningStyle: 'flexible',
          socialPreference: 'mixed',
          budgetConsciousness: 'moderate',
          adventurousness: 'moderate',
          cultureInterest: 'moderate',
          comfortLevel: 'moderate',
          lastUpdated: new Date()
        };
        
        await this.firestore.collection('personality_profile').doc('personal').set(this.personalityProfile);
      }
    } catch (error) {
      console.error('Error loading personality profile:', error);
    }
  }

  async initializeLearningModel() {
    try {
      // Create a simple neural network for preference learning
      this.learningModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [20], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 8, activation: 'sigmoid' }) // 8 preference categories
        ]
      });

      this.learningModel.compile({
        optimizer: 'adam',
        loss: 'meanSquaredError',
        metrics: ['accuracy']
      });

      console.log('🧠 Learning model initialized');
    } catch (error) {
      console.error('Error initializing learning model:', error);
    }
  }

  async learn(interaction, feedback) {
    try {
      const learningData = this.processInteractionForLearning(interaction, feedback);
      
      // Update immediate preferences
      await this.updateImmediatePreferences(learningData);
      
      // Train the model with new data
      await this.trainModel(learningData);
      
      // Update personality insights
      await this.updatePersonalityInsights(learningData);
      
      // Generate updated preference profile
      const updatedProfile = await this.generateUpdatedProfile();
      
      return {
        preferences: updatedProfile,
        learningInsight: this.generateLearningInsight(learningData),
        confidence: this.calculateConfidence(),
        personalityUpdate: this.getPersonalityChanges(learningData)
      };
      
    } catch (error) {
      console.error('Error in learning process:', error);
      throw error;
    }
  }

  processInteractionForLearning(interaction, feedback) {
    return {
      timestamp: new Date(),
      interactionType: interaction.type,
      context: interaction.context,
      userChoice: interaction.choice,
      feedback: feedback,
      
      // Extract features for learning
      features: this.extractFeatures(interaction),
      sentiment: this.analyzeFeedbackSentiment(feedback),
      confidence: feedback.confidence || 0.5,
      
      // Categorize the learning
      category: this.categorizeInteraction(interaction),
      weight: this.calculateInteractionWeight(interaction, feedback)
    };
  }

  extractFeatures(interaction) {
    const features = {
      destinationType: this.encodeDestinationType(interaction.destination),
      budget: this.normalizeBudget(interaction.budget),
      duration: this.encodeDuration(interaction.duration),
      season: this.encodeSeason(interaction.timing),
      socialContext: this.encodeSocialContext(interaction.travelers),
      activities: this.encodeActivities(interaction.activities),
      timeOfDay: this.encodeTimePreference(interaction.timePreferences),
      weatherPreference: this.encodeWeatherPreference(interaction.weather)
    };
    
    return features;
  }

  async updateImmediatePreferences(learningData) {
    try {
      const category = learningData.category;
      const currentPrefs = this.preferences.get(category) || {};
      
      // Update based on feedback
      const updatedPrefs = this.applyLearning(currentPrefs, learningData);
      
      // Save to Firestore
      await this.firestore.collection('preferences').doc(category).set({
        userId: 'personal',
        preferences: updatedPrefs,
        lastUpdated: new Date(),
        learningCount: (currentPrefs.learningCount || 0) + 1
      });
      
      // Update local cache
      this.preferences.set(category, updatedPrefs);
      
    } catch (error) {
      console.error('Error updating immediate preferences:', error);
    }
  }

  applyLearning(currentPrefs, learningData) {
    const { features, feedback, weight } = learningData;
    const learningRate = 0.1; // How much to adjust preferences
    
    const updatedPrefs = _.cloneDeep(currentPrefs);
    
    // Apply reinforcement learning principles
    Object.entries(features).forEach(([feature, value]) => {
      if (!updatedPrefs[feature]) {
        updatedPrefs[feature] = { value: 0.5, confidence: 0 };
      }
      
      const currentValue = updatedPrefs[feature].value;
      const feedbackSignal = this.calculateFeedbackSignal(feedback);
      
      // Update value based on feedback
      const newValue = currentValue + (learningRate * weight * feedbackSignal * (value - currentValue));
      
      updatedPrefs[feature] = {
        value: Math.max(0, Math.min(1, newValue)), // Keep in [0,1] range
        confidence: Math.min(1, updatedPrefs[feature].confidence + 0.05), // Gradually increase confidence
        lastSeen: new Date()
      };
    });
    
    return updatedPrefs;
  }

  calculateFeedbackSignal(feedback) {
    // Convert feedback to learning signal (-1 to 1)
    if (feedback.rating) {
      return (feedback.rating - 3) / 2; // Convert 1-5 rating to -1 to 1
    }
    
    if (feedback.liked === true) return 1;
    if (feedback.liked === false) return -1;
    
    return 0; // Neutral feedback
  }

  async trainModel(learningData) {
    try {
      if (!this.learningModel) return;
      
      // Prepare training data
      const inputFeatures = this.prepareModelInput(learningData.features);
      const targetOutput = this.prepareModelTarget(learningData);
      
      // Train the model
      const xs = tf.tensor2d([inputFeatures]);
      const ys = tf.tensor2d([targetOutput]);
      
      await this.learningModel.fit(xs, ys, {
        epochs: 1,
        verbose: 0
      });
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();
      
    } catch (error) {
      console.error('Error training model:', error);
    }
  }

  prepareModelInput(features) {
    // Convert features to normalized array for model
    return [
      features.destinationType,
      features.budget,
      features.duration,
      features.season,
      features.socialContext,
      ...features.activities.slice(0, 10), // Top 10 activities
      features.timeOfDay,
      features.weatherPreference,
      // Pad to 20 features
      ...Array(20 - 14).fill(0)
    ].slice(0, 20);
  }

  prepareModelTarget(learningData) {
    // Convert feedback to target output for 8 preference categories
    const feedbackSignal = this.calculateFeedbackSignal(learningData.feedback);
    
    return [
      feedbackSignal, // Overall satisfaction
      learningData.features.destinationType * feedbackSignal,
      learningData.features.budget * feedbackSignal,
      learningData.features.duration * feedbackSignal,
      learningData.features.season * feedbackSignal,
      learningData.features.socialContext * feedbackSignal,
      learningData.features.timeOfDay * feedbackSignal,
      learningData.features.weatherPreference * feedbackSignal
    ];
  }

  async updatePersonalityInsights(learningData) {
    try {
      const updates = {};
      
      // Update personality based on learning patterns
      if (learningData.features.budget < 0.3) {
        updates.budgetConsciousness = 'high';
      } else if (learningData.features.budget > 0.8) {
        updates.budgetConsciousness = 'low';
      }
      
      if (learningData.category === 'adventure' && learningData.feedback.rating > 4) {
        updates.adventurousness = 'high';
      }
      
      if (learningData.features.socialContext > 0.7) {
        updates.socialPreference = 'group';
      } else if (learningData.features.socialContext < 0.3) {
        updates.socialPreference = 'solo';
      }
      
      if (Object.keys(updates).length > 0) {
        updates.lastUpdated = new Date();
        
        await this.firestore.collection('personality_profile').doc('personal').update(updates);
        
        // Update local profile
        this.personalityProfile = { ...this.personalityProfile, ...updates };
      }
      
    } catch (error) {
      console.error('Error updating personality insights:', error);
    }
  }

  async generateUpdatedProfile() {
    const profile = {
      destinations: this.getPreferencesByCategory('destinations'),
      activities: this.getPreferencesByCategory('activities'),
      timing: this.getPreferencesByCategory('timing'),
      budget: this.getPreferencesByCategory('budget'),
      social: this.getPreferencesByCategory('social'),
      comfort: this.getPreferencesByCategory('comfort'),
      adventure: this.getPreferencesByCategory('adventure'),
      culture: this.getPreferencesByCategory('culture')
    };
    
    return profile;
  }

  getPreferencesByCategory(category) {
    const prefs = this.preferences.get(category);
    if (!prefs) return { status: 'learning', confidence: 0 };
    
    // Sort preferences by value and confidence
    const sortedPrefs = Object.entries(prefs)
      .filter(([key]) => key !== 'learningCount' && key !== 'lastUpdated')
      .map(([key, data]) => ({
        preference: key,
        strength: data.value,
        confidence: data.confidence
      }))
      .sort((a, b) => (b.strength * b.confidence) - (a.strength * a.confidence));
    
    return {
      top: sortedPrefs.slice(0, 5),
      confidence: _.meanBy(sortedPrefs, 'confidence') || 0,
      dataPoints: sortedPrefs.length
    };
  }

  async getPersonalityProfile() {
    try {
      return {
        personality: this.personalityProfile,
        preferences: await this.generateUpdatedProfile(),
        insights: this.generatePersonalityInsights(),
        recommendations: this.generatePersonalityRecommendations(),
        confidence: this.calculateOverallConfidence()
      };
      
    } catch (error) {
      console.error('Error getting personality profile:', error);
      throw error;
    }
  }

  generatePersonalityInsights() {
    const insights = [];
    
    if (this.personalityProfile.adventurousness === 'high') {
      insights.push('You thrive on adventure and new experiences! 🏔️');
    }
    
    if (this.personalityProfile.budgetConsciousness === 'high') {
      insights.push('You excel at finding amazing value in your travels! 💰');
    }
    
    if (this.personalityProfile.cultureInterest === 'high') {
      insights.push('Cultural immersion is clearly important to you! 🏛️');
    }
    
    return insights;
  }

  generatePersonalityRecommendations() {
    const recommendations = [];
    
    if (this.personalityProfile.planningStyle === 'flexible') {
      recommendations.push('Leave some room for spontaneous discoveries in your itinerary!');
    }
    
    if (this.personalityProfile.socialPreference === 'solo') {
      recommendations.push('Consider solo-friendly destinations with good infrastructure.');
    }
    
    return recommendations;
  }

  calculateOverallConfidence() {
    const allPrefs = Array.from(this.preferences.values());
    if (allPrefs.length === 0) return 0;
    
    const confidenceScores = allPrefs.map(prefs => {
      const entries = Object.entries(prefs).filter(([key]) => 
        key !== 'learningCount' && key !== 'lastUpdated'
      );
      return _.meanBy(entries, ([, data]) => data.confidence || 0);
    });
    
    return _.mean(confidenceScores) * 100;
  }

  // Encoding methods for ML features
  encodeDestinationType(destination) {
    const types = {
      'urban': 0.1, 'beach': 0.2, 'mountain': 0.3, 'cultural': 0.4,
      'nature': 0.5, 'adventure': 0.6, 'relaxation': 0.7, 'mixed': 0.8
    };
    return types[destination] || 0.5;
  }

  normalizeBudget(budget) {
    if (!budget) return 0.5;
    return Math.min(1, budget / 3000); // Normalize to $3000 max
  }

  encodeDuration(duration) {
    const durations = {
      'day_trip': 0.1, 'weekend': 0.3, 'week': 0.5, 
      'two_weeks': 0.7, 'extended': 0.9
    };
    return durations[duration] || 0.5;
  }

  encodeSeason(timing) {
    const seasons = { 'spring': 0.25, 'summer': 0.5, 'fall': 0.75, 'winter': 1.0 };
    return seasons[timing] || 0.5;
  }

  encodeSocialContext(travelers) {
    const contexts = {
      'solo': 0.1, 'couple': 0.3, 'small_group': 0.6, 
      'large_group': 0.8, 'family': 0.9
    };
    return contexts[travelers] || 0.5;
  }

  encodeActivities(activities) {
    const activityTypes = [
      'sightseeing', 'adventure', 'cultural', 'food', 'nightlife',
      'shopping', 'relaxation', 'nature', 'sports', 'education'
    ];
    
    return activityTypes.map(type => 
      activities && activities.includes(type) ? 1 : 0
    );
  }

  encodeTimePreference(timePrefs) {
    if (!timePrefs) return 0.5;
    // Morning person = 0.2, Night owl = 0.8, Flexible = 0.5
    return timePrefs.morning ? 0.2 : timePrefs.night ? 0.8 : 0.5;
  }

  encodeWeatherPreference(weather) {
    const prefs = {
      'hot': 0.9, 'warm': 0.7, 'mild': 0.5, 'cool': 0.3, 'cold': 0.1
    };
    return prefs[weather] || 0.5;
  }

  // Helper methods
  categorizeInteraction(interaction) {
    if (interaction.type === 'search') return 'destinations';
    if (interaction.type === 'plan') return 'activities';
    if (interaction.type === 'budget') return 'budget';
    return 'general';
  }

  calculateInteractionWeight(interaction, feedback) {
    let weight = 1.0;
    
    // Higher weight for explicit feedback
    if (feedback.explicit) weight *= 1.5;
    
    // Higher weight for strong sentiment
    if (feedback.rating > 4 || feedback.rating < 2) weight *= 1.3;
    
    // Higher weight for detailed interactions
    if (interaction.details && interaction.details.length > 100) weight *= 1.2;
    
    return Math.min(2.0, weight); // Cap at 2.0
  }

  analyzeFeedbackSentiment(feedback) {
    if (feedback.rating) {
      if (feedback.rating >= 4) return 'positive';
      if (feedback.rating <= 2) return 'negative';
      return 'neutral';
    }
    
    if (feedback.liked === true) return 'positive';
    if (feedback.liked === false) return 'negative';
    
    return 'neutral';
  }

  generateLearningInsight(learningData) {
    const insights = [
      `Learning from your ${learningData.category} preferences! 🧠`,
      `Your feedback helps me understand you better! 📈`,
      `Adjusting recommendations based on your input! 🎯`,
      `Building a more personalized experience for you! ✨`
    ];
    
    return insights[Math.floor(Math.random() * insights.length)];
  }

  getPersonalityChanges(learningData) {
    // Return any detected personality changes from this interaction
    return {
      detected: learningData.weight > 1.5,
      category: learningData.category,
      direction: learningData.feedback.rating > 3 ? 'positive' : 'negative',
      confidence: learningData.confidence
    };
  }

  calculateConfidence() {
    const interactionCount = this.preferences.size;
    const dataQuality = this.calculateDataQuality();
    
    // Confidence increases with more interactions and better data quality
    const baseConfidence = Math.min(90, interactionCount * 5);
    const qualityBonus = dataQuality * 10;
    
    return Math.round(baseConfidence + qualityBonus);
  }

  calculateDataQuality() {
    // Measure quality of learning data
    const allPrefs = Array.from(this.preferences.values());
    if (allPrefs.length === 0) return 0;
    
    const qualityScores = allPrefs.map(prefs => {
      const entries = Object.entries(prefs).filter(([key]) => 
        key !== 'learningCount' && key !== 'lastUpdated'
      );
      
      // Quality based on confidence and recency
      return _.meanBy(entries, ([, data]) => {
        const confidence = data.confidence || 0;
        const recency = data.lastSeen ? 
          Math.max(0, 1 - (Date.now() - new Date(data.lastSeen)) / (30 * 24 * 60 * 60 * 1000)) : 0;
        
        return (confidence + recency) / 2;
      });
    });
    
    return _.mean(qualityScores);
  }
}

module.exports = PreferenceEngine;