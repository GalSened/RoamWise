const { Firestore } = require('@google-cloud/firestore');
const moment = require('moment');
const _ = require('lodash');

class TravelMemory {
  constructor() {
    this.firestore = new Firestore();
    this.memoryCache = new Map();
    this.insights = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('🧠 Initializing Travel Memory...');
      await this.loadMemories();
      console.log('✅ Travel Memory ready');
    } catch (error) {
      console.error('❌ Failed to initialize Travel Memory:', error);
    }
  }

  async loadMemories() {
    try {
      const snapshot = await this.firestore
        .collection('memories')
        .where('userId', '==', 'personal')
        .orderBy('timestamp', 'desc')
        .get();
      
      snapshot.docs.forEach(doc => {
        this.memoryCache.set(doc.id, doc.data());
      });
      
      console.log(`Loaded ${this.memoryCache.size} travel memories`);
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  }

  async saveTrip(tripData) {
    try {
      const enhancedTrip = await this.enhanceTripData(tripData);
      
      const tripMemory = {
        userId: 'personal',
        timestamp: new Date(),
        type: 'trip',
        ...enhancedTrip,
        insights: await this.generateTripInsights(enhancedTrip),
        learningPoints: this.extractLearningPoints(enhancedTrip)
      };

      const docRef = await this.firestore.collection('memories').add(tripMemory);
      this.memoryCache.set(docRef.id, tripMemory);
      
      // Update insights after new trip
      await this.updateInsights();
      
      return {
        id: docRef.id,
        ...tripMemory,
        personalNote: this.generatePersonalNote(enhancedTrip)
      };
      
    } catch (error) {
      console.error('Error saving trip:', error);
      throw error;
    }
  }

  async enhanceTripData(tripData) {
    return {
      ...tripData,
      // Add computed fields
      duration: this.calculateDuration(tripData.startDate, tripData.endDate),
      season: this.determineSeason(tripData.startDate),
      weekdayPattern: this.analyzeWeekdayPattern(tripData.startDate, tripData.endDate),
      budgetCategory: this.categorizeBudget(tripData.budget),
      destinationType: this.classifyDestination(tripData.destination),
      travelStyle: this.inferTravelStyle(tripData),
      socialContext: this.determineSocialContext(tripData.travelers),
      
      // Enrich with additional data
      weatherData: await this.getHistoricalWeather(tripData.destination, tripData.startDate),
      economicData: await this.getEconomicContext(tripData.destination, tripData.startDate),
      eventContext: await this.getEventContext(tripData.destination, tripData.startDate)
    };
  }

  calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return null;
    
    const start = moment(startDate);
    const end = moment(endDate);
    const days = end.diff(start, 'days');
    
    if (days <= 1) return 'day_trip';
    if (days <= 3) return 'weekend';
    if (days <= 7) return 'week';
    if (days <= 14) return 'two_weeks';
    return 'extended';
  }

  determineSeason(date) {
    if (!date) return 'unknown';
    
    const month = moment(date).month();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  analyzeWeekdayPattern(startDate, endDate) {
    if (!startDate) return 'unknown';
    
    const start = moment(startDate);
    const end = moment(endDate);
    
    const startDay = start.day();
    const endDay = end.day();
    
    if (startDay >= 5 || endDay <= 1) return 'weekend_focused';
    if (startDay <= 1 && endDay >= 5) return 'weekday_focused';
    return 'mixed';
  }

  categorizeBudget(budget) {
    if (!budget) return 'unknown';
    
    if (budget < 300) return 'budget';
    if (budget < 800) return 'mid_range';
    if (budget < 2000) return 'premium';
    return 'luxury';
  }

  classifyDestination(destination) {
    if (!destination) return 'unknown';
    
    const dest = destination.toLowerCase();
    
    // Simple classification - in production, use ML model
    const classifications = {
      urban: ['city', 'tokyo', 'london', 'paris', 'new york', 'berlin'],
      beach: ['beach', 'coast', 'island', 'bali', 'hawaii', 'maldives'],
      mountain: ['mountain', 'alps', 'aspen', 'swiss', 'hiking'],
      cultural: ['museum', 'heritage', 'historic', 'rome', 'athens', 'kyoto'],
      nature: ['park', 'safari', 'forest', 'national', 'wildlife'],
      adventure: ['trek', 'climb', 'adventure', 'extreme', 'sports']
    };
    
    for (const [type, keywords] of Object.entries(classifications)) {
      if (keywords.some(keyword => dest.includes(keyword))) {
        return type;
      }
    }
    
    return 'mixed';
  }

  inferTravelStyle(tripData) {
    const indicators = {
      luxury: tripData.budget > 1500 || (tripData.accommodation && tripData.accommodation.includes('luxury')),
      adventure: tripData.activities && tripData.activities.some(a => ['hiking', 'climbing', 'safari', 'diving'].includes(a.toLowerCase())),
      cultural: tripData.activities && tripData.activities.some(a => ['museum', 'tour', 'heritage', 'art'].includes(a.toLowerCase())),
      relaxation: tripData.activities && tripData.activities.some(a => ['spa', 'beach', 'resort', 'relax'].includes(a.toLowerCase())),
      foodie: tripData.activities && tripData.activities.some(a => ['restaurant', 'food', 'cooking', 'wine'].includes(a.toLowerCase()))
    };
    
    const styles = Object.entries(indicators)
      .filter(([, matches]) => matches)
      .map(([style]) => style);
    
    return styles.length > 0 ? styles : ['general'];
  }

  determineSocialContext(travelers) {
    if (!travelers || travelers.length === 0) return 'unknown';
    if (travelers.length === 1) return 'solo';
    if (travelers.length === 2) return 'couple';
    if (travelers.length <= 4) return 'small_group';
    return 'large_group';
  }

  async getHistoricalWeather(destination, date) {
    // Placeholder for weather API integration
    return {
      temperature: 'unknown',
      conditions: 'unknown',
      note: 'Weather data integration pending'
    };
  }

  async getEconomicContext(destination, date) {
    // Placeholder for economic data
    return {
      exchangeRate: 'unknown',
      priceLevel: 'unknown',
      note: 'Economic data integration pending'
    };
  }

  async getEventContext(destination, date) {
    // Placeholder for events data
    return {
      events: [],
      festivals: [],
      note: 'Event data integration pending'
    };
  }

  async generateTripInsights(tripData) {
    const insights = {
      highlights: this.identifyHighlights(tripData),
      challenges: this.identifyPotentialChallenges(tripData),
      learnings: this.extractLearnings(tripData),
      recommendations: this.generateFutureRecommendations(tripData)
    };
    
    return insights;
  }

  identifyHighlights(tripData) {
    const highlights = [];
    
    if (tripData.rating >= 4) {
      highlights.push('Highly rated trip - Great choice!');
    }
    
    if (tripData.budget && tripData.budgetCategory === 'budget') {
      highlights.push('Budget-friendly adventure');
    }
    
    if (tripData.activities && tripData.activities.length > 5) {
      highlights.push('Action-packed itinerary');
    }
    
    return highlights;
  }

  identifyPotentialChallenges(tripData) {
    const challenges = [];
    
    if (tripData.duration === 'day_trip') {
      challenges.push('Limited time - consider extending next time?');
    }
    
    if (tripData.season === 'winter' && tripData.destinationType === 'beach') {
      challenges.push('Off-season beach trip - weather might be unpredictable');
    }
    
    return challenges;
  }

  extractLearnings(tripData) {
    const learnings = [];
    
    if (tripData.feedback) {
      learnings.push(`Feedback noted: ${tripData.feedback}`);
    }
    
    learnings.push(`Preferred ${tripData.travelStyle} style travel`);
    learnings.push(`${tripData.socialContext} travel preference confirmed`);
    
    return learnings;
  }

  generateFutureRecommendations(tripData) {
    const recommendations = [];
    
    if (tripData.rating >= 4) {
      recommendations.push(`Consider similar ${tripData.destinationType} destinations`);
    }
    
    if (tripData.season) {
      recommendations.push(`${tripData.season} travel works well for you`);
    }
    
    return recommendations;
  }

  extractLearningPoints(tripData) {
    return {
      destinationType: tripData.destinationType,
      preferredSeason: tripData.season,
      budgetComfort: tripData.budgetCategory,
      travelStyle: tripData.travelStyle,
      socialPreference: tripData.socialContext,
      durationPreference: tripData.duration
    };
  }

  generatePersonalNote(tripData) {
    const notes = [
      `This ${tripData.destinationType} trip in ${tripData.season} is now part of your travel story! 📚`,
      `Added to your ${tripData.socialContext} travel experiences - I'm learning your patterns! 🧠`,
      `Your ${tripData.travelStyle} travel style is becoming clearer with each trip! ✨`,
      `This ${tripData.duration} trip adds valuable data to your travel preferences! 📊`
    ];
    
    return notes[Math.floor(Math.random() * notes.length)];
  }

  async generateInsights() {
    try {
      const memories = Array.from(this.memoryCache.values());
      const trips = memories.filter(m => m.type === 'trip');
      
      if (trips.length === 0) {
        return {
          message: "Start your travel journey! I'll learn your preferences as you explore. 🌍",
          stats: {},
          patterns: {},
          recommendations: []
        };
      }

      const insights = {
        stats: this.generateTravelStats(trips),
        patterns: this.analyzeTravelPatterns(trips),
        preferences: this.derivePreferences(trips),
        recommendations: this.generatePersonalizedRecommendations(trips),
        personality: this.inferTravelPersonality(trips),
        timeline: this.createTravelTimeline(trips)
      };
      
      this.insights = insights;
      return insights;
      
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  generateTravelStats(trips) {
    return {
      totalTrips: trips.length,
      totalDestinations: new Set(trips.map(t => t.destination)).size,
      averageRating: _.meanBy(trips, 'rating') || 0,
      totalBudget: _.sumBy(trips, 'budget') || 0,
      averageDuration: this.calculateAverageDuration(trips),
      favoriteDestinationType: this.getMostFrequent(trips, 'destinationType'),
      preferredSeason: this.getMostFrequent(trips, 'season'),
      preferredTravelStyle: this.getMostFrequent(trips, 'travelStyle'),
      longestTrip: _.maxBy(trips, t => moment(t.endDate).diff(moment(t.startDate), 'days')),
      highestRatedTrip: _.maxBy(trips, 'rating')
    };
  }

  analyzeTravelPatterns(trips) {
    return {
      seasonalPattern: this.analyzeSeasonalDistribution(trips),
      budgetPattern: this.analyzeBudgetTrends(trips),
      destinationPattern: this.analyzeDestinationTypes(trips),
      socialPattern: this.analyzeSocialPreferences(trips),
      durationPattern: this.analyzeDurationPreferences(trips),
      activityPattern: this.analyzeActivityPreferences(trips)
    };
  }

  derivePreferences(trips) {
    return {
      destinationTypes: this.rankPreferences(trips, 'destinationType'),
      seasons: this.rankPreferences(trips, 'season'),
      travelStyles: this.rankPreferences(trips, 'travelStyle'),
      socialContexts: this.rankPreferences(trips, 'socialContext'),
      durations: this.rankPreferences(trips, 'duration'),
      budgetRanges: this.rankPreferences(trips, 'budgetCategory')
    };
  }

  generatePersonalizedRecommendations(trips) {
    const recommendations = [];
    
    // Based on favorite destination types
    const favDestType = this.getMostFrequent(trips, 'destinationType');
    if (favDestType) {
      recommendations.push({
        type: 'destination',
        message: `You love ${favDestType} destinations! Here are some new ${favDestType} places to explore.`,
        confidence: 'high'
      });
    }
    
    // Based on seasonal patterns
    const favSeason = this.getMostFrequent(trips, 'season');
    if (favSeason) {
      recommendations.push({
        type: 'timing',
        message: `${favSeason} travel works perfectly for you. Plan your next ${favSeason} adventure!`,
        confidence: 'high'
      });
    }
    
    // Based on budget patterns
    const avgBudget = _.meanBy(trips, 'budget');
    if (avgBudget) {
      recommendations.push({
        type: 'budget',
        message: `Your sweet spot seems to be around $${Math.round(avgBudget)} per trip.`,
        confidence: 'medium'
      });
    }
    
    return recommendations;
  }

  inferTravelPersonality(trips) {
    const personality = {
      explorer: this.calculateExplorerScore(trips),
      planner: this.calculatePlannerScore(trips),
      adventurer: this.calculateAdventurerScore(trips),
      culturalist: this.calculateCulturalistScore(trips),
      social: this.calculateSocialScore(trips)
    };
    
    return personality;
  }

  createTravelTimeline(trips) {
    return trips
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .map(trip => ({
        date: trip.startDate,
        destination: trip.destination,
        type: trip.destinationType,
        rating: trip.rating,
        highlights: trip.insights?.highlights || []
      }));
  }

  // Helper methods
  getMostFrequent(array, property) {
    const counts = _.countBy(array, property);
    return _.maxBy(Object.keys(counts), key => counts[key]);
  }

  rankPreferences(trips, property) {
    const counts = _.countBy(trips, property);
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .map(([key, count]) => ({ preference: key, frequency: count }));
  }

  calculateAverageDuration(trips) {
    const durations = trips
      .filter(t => t.startDate && t.endDate)
      .map(t => moment(t.endDate).diff(moment(t.startDate), 'days'));
    
    return durations.length > 0 ? _.mean(durations) : 0;
  }

  // Personality scoring methods
  calculateExplorerScore(trips) {
    const uniqueDestinations = new Set(trips.map(t => t.destination)).size;
    const totalTrips = trips.length;
    return totalTrips > 0 ? (uniqueDestinations / totalTrips) * 100 : 0;
  }

  calculatePlannerScore(trips) {
    const plannedTrips = trips.filter(t => t.activities && t.activities.length > 3).length;
    return trips.length > 0 ? (plannedTrips / trips.length) * 100 : 0;
  }

  calculateAdventurerScore(trips) {
    const adventureTypes = ['mountain', 'adventure', 'nature'];
    const adventureTrips = trips.filter(t => adventureTypes.includes(t.destinationType)).length;
    return trips.length > 0 ? (adventureTrips / trips.length) * 100 : 0;
  }

  calculateCulturalistScore(trips) {
    const culturalTypes = ['cultural', 'urban'];
    const culturalTrips = trips.filter(t => culturalTypes.includes(t.destinationType)).length;
    return trips.length > 0 ? (culturalTrips / trips.length) * 100 : 0;
  }

  calculateSocialScore(trips) {
    const socialTrips = trips.filter(t => ['couple', 'small_group', 'large_group'].includes(t.socialContext)).length;
    return trips.length > 0 ? (socialTrips / trips.length) * 100 : 0;
  }

  async updateInsights() {
    try {
      await this.generateInsights();
      console.log('✅ Travel insights updated');
    } catch (error) {
      console.error('Error updating insights:', error);
    }
  }
}

module.exports = TravelMemory;