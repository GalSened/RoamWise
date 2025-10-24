const axios = require('axios');
const { Client } = require('@google/maps');

class IntelligenceEngine {
  constructor() {
    this.googleMaps = new Client({
      key: process.env.GOOGLE_MAPS_API_KEY
    });
    
    this.weatherAPI = axios.create({
      baseURL: 'https://api.openweathermap.org/data/2.5',
      params: {
        appid: process.env.OPENWEATHER_API_KEY
      }
    });
    
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async intelligentSearch(query, location, personalPreferences) {
    try {
      const cacheKey = `search:${query}:${location}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Multi-source search with personal context
      const [placesResults, weatherContext, eventContext] = await Promise.all([
        this.searchPlaces(query, location),
        this.getWeatherContext(location),
        this.getEventContext(location)
      ]);

      // Personalize and rank results
      const personalizedResults = await this.personalizeResults(
        placesResults, 
        personalPreferences, 
        weatherContext
      );

      // Add intelligence layers
      const intelligentResults = await this.addIntelligenceLayers(
        personalizedResults,
        weatherContext,
        eventContext
      );

      const result = {
        results: intelligentResults,
        context: {
          weather: weatherContext,
          events: eventContext,
          personalizedFor: personalPreferences.userId || 'personal'
        },
        metadata: {
          searchQuery: query,
          location: location,
          resultCount: intelligentResults.length,
          intelligence: 'enhanced'
        }
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error in intelligent search:', error);
      throw error;
    }
  }

  async searchPlaces(query, location) {
    try {
      const response = await this.googleMaps.placesNearby({
        params: {
          location: location,
          keyword: query,
          radius: 50000, // 50km radius
          type: 'point_of_interest'
        }
      });

      return response.data.results.map(place => ({
        id: place.place_id,
        name: place.name,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types,
        openNow: place.opening_hours?.open_now,
        photos: place.photos?.slice(0, 3),
        vicinity: place.vicinity,
        plusCode: place.plus_code
      }));

    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  async getWeatherContext(location) {
    try {
      const cacheKey = `weather:${location}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Current weather
      const currentWeather = await this.weatherAPI.get('/weather', {
        params: {
          q: location,
          units: 'metric'
        }
      });

      // 5-day forecast
      const forecast = await this.weatherAPI.get('/forecast', {
        params: {
          q: location,
          units: 'metric'
        }
      });

      const weatherContext = {
        current: {
          temperature: currentWeather.data.main.temp,
          feelsLike: currentWeather.data.main.feels_like,
          humidity: currentWeather.data.main.humidity,
          conditions: currentWeather.data.weather[0].main,
          description: currentWeather.data.weather[0].description,
          windSpeed: currentWeather.data.wind.speed,
          visibility: currentWeather.data.visibility
        },
        forecast: forecast.data.list.slice(0, 8).map(item => ({
          datetime: item.dt_txt,
          temperature: item.main.temp,
          conditions: item.weather[0].main,
          description: item.weather[0].description,
          precipitation: item.pop
        })),
        recommendations: this.generateWeatherRecommendations(currentWeather.data, forecast.data)
      };

      this.setCache(cacheKey, weatherContext, 10 * 60 * 1000); // 10min cache
      return weatherContext;

    } catch (error) {
      console.error('Error getting weather context:', error);
      return {
        current: { conditions: 'unknown' },
        forecast: [],
        recommendations: []
      };
    }
  }

  generateWeatherRecommendations(current, forecast) {
    const recommendations = [];
    const temp = current.main.temp;
    const conditions = current.weather[0].main.toLowerCase();

    // Temperature-based recommendations
    if (temp > 25) {
      recommendations.push({
        type: 'activity',
        message: 'Great weather for outdoor activities!',
        suggestions: ['parks', 'outdoor dining', 'walking tours']
      });
    } else if (temp < 10) {
      recommendations.push({
        type: 'activity', 
        message: 'Perfect weather for indoor attractions',
        suggestions: ['museums', 'shopping', 'cafes', 'theaters']
      });
    }

    // Condition-based recommendations
    if (conditions.includes('rain')) {
      recommendations.push({
        type: 'preparation',
        message: 'Don\'t forget an umbrella!',
        suggestions: ['covered activities', 'indoor venues', 'transportation apps']
      });
    }

    if (conditions.includes('clear')) {
      recommendations.push({
        type: 'opportunity',
        message: 'Perfect for photography and sightseeing!',
        suggestions: ['viewpoints', 'outdoor markets', 'walking routes']
      });
    }

    return recommendations;
  }

  async getEventContext(location) {
    try {
      // Placeholder for events API integration
      // In production, integrate with Eventbrite, local event APIs, etc.
      
      const eventContext = {
        currentEvents: [
          // Mock data - replace with real API calls
          {
            name: 'Local Food Festival',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            type: 'food',
            relevance: 'high'
          }
        ],
        upcomingEvents: [],
        seasonalEvents: [],
        recommendations: [
          'Check local event calendars for current happenings'
        ]
      };

      return eventContext;

    } catch (error) {
      console.error('Error getting event context:', error);
      return { currentEvents: [], upcomingEvents: [], recommendations: [] };
    }
  }

  async personalizeResults(results, preferences, weatherContext) {
    return results.map(result => {
      const personalizedScore = this.calculatePersonalizedScore(result, preferences, weatherContext);
      
      return {
        ...result,
        personalizedScore,
        personalizedReasons: this.generatePersonalizedReasons(result, preferences),
        weatherSuitability: this.assessWeatherSuitability(result, weatherContext),
        personalizedTags: this.generatePersonalizedTags(result, preferences)
      };
    }).sort((a, b) => b.personalizedScore - a.personalizedScore);
  }

  calculatePersonalizedScore(place, preferences, weatherContext) {
    let score = place.rating || 3; // Base score from place rating

    // Personal preference adjustments
    if (preferences.destinationTypes) {
      const matchingTypes = place.types.filter(type => 
        preferences.destinationTypes.includes(type)
      );
      score += matchingTypes.length * 0.5;
    }

    // Budget preference
    if (preferences.budgetCategory && place.priceLevel) {
      const budgetMatch = this.matchBudgetPreference(preferences.budgetCategory, place.priceLevel);
      score += budgetMatch;
    }

    // Weather suitability
    const weatherScore = this.calculateWeatherScore(place, weatherContext);
    score += weatherScore;

    // Open now bonus
    if (place.openNow) {
      score += 0.5;
    }

    return Math.min(5, Math.max(0, score));
  }

  matchBudgetPreference(preferredBudget, placePrice) {
    const budgetMap = {
      'budget': [0, 1],
      'mid_range': [1, 2, 3],
      'premium': [2, 3, 4],
      'luxury': [3, 4]
    };

    const acceptablePrices = budgetMap[preferredBudget] || [0, 1, 2, 3, 4];
    return acceptablePrices.includes(placePrice) ? 0.5 : -0.5;
  }

  calculateWeatherScore(place, weatherContext) {
    const isOutdoor = place.types.some(type => 
      ['park', 'zoo', 'amusement_park', 'tourist_attraction'].includes(type)
    );

    if (!isOutdoor) return 0; // Indoor places not affected by weather

    const conditions = weatherContext.current.conditions.toLowerCase();
    const temp = weatherContext.current.temperature;

    if (conditions.includes('rain') || conditions.includes('storm')) {
      return -1; // Outdoor activities less appealing in bad weather
    }

    if (conditions.includes('clear') && temp > 15 && temp < 30) {
      return 1; // Perfect weather for outdoor activities
    }

    return 0;
  }

  generatePersonalizedReasons(place, preferences) {
    const reasons = [];

    if (preferences.activityPreferences) {
      const matchingActivities = place.types.filter(type =>
        preferences.activityPreferences.includes(type)
      );
      
      if (matchingActivities.length > 0) {
        reasons.push(`Matches your interest in ${matchingActivities.join(', ')}`);
      }
    }

    if (place.rating >= 4.5) {
      reasons.push('Highly rated by visitors');
    }

    if (place.openNow) {
      reasons.push('Open right now');
    }

    return reasons;
  }

  assessWeatherSuitability(place, weatherContext) {
    const isOutdoor = place.types.some(type => 
      ['park', 'zoo', 'amusement_park'].includes(type)
    );

    if (!isOutdoor) {
      return { suitable: true, reason: 'Indoor venue - weather independent' };
    }

    const conditions = weatherContext.current.conditions.toLowerCase();
    const temp = weatherContext.current.temperature;

    if (conditions.includes('rain')) {
      return { suitable: false, reason: 'Rainy weather - consider indoor alternatives' };
    }

    if (temp < 5) {
      return { suitable: false, reason: 'Very cold - dress warmly or consider indoor options' };
    }

    if (temp > 35) {
      return { suitable: false, reason: 'Very hot - plan for shade and hydration' };
    }

    return { suitable: true, reason: 'Good weather conditions' };
  }

  generatePersonalizedTags(place, preferences) {
    const tags = [];

    // Budget-based tags
    if (place.priceLevel <= 1) tags.push('budget-friendly');
    if (place.priceLevel >= 3) tags.push('upscale');

    // Rating-based tags
    if (place.rating >= 4.5) tags.push('highly-rated');
    if (place.rating >= 4.0) tags.push('popular');

    // Preference-based tags
    if (preferences.travelStyle === 'adventure' && 
        place.types.includes('tourist_attraction')) {
      tags.push('adventure-worthy');
    }

    if (preferences.travelStyle === 'cultural' && 
        place.types.some(t => ['museum', 'art_gallery', 'church'].includes(t))) {
      tags.push('cultural-gem');
    }

    return tags;
  }

  async addIntelligenceLayers(results, weatherContext, eventContext) {
    return results.map(result => ({
      ...result,
      intelligence: {
        bestTimeToVisit: this.calculateBestTimeToVisit(result, weatherContext),
        crowdingPrediction: this.predictCrowding(result),
        valueScore: this.calculateValueScore(result),
        uniqueInsights: this.generateUniqueInsights(result, eventContext),
        actionableAdvice: this.generateActionableAdvice(result, weatherContext)
      }
    }));
  }

  calculateBestTimeToVisit(place, weatherContext) {
    const isOutdoor = place.types.some(type => 
      ['park', 'zoo', 'amusement_park'].includes(type)
    );

    if (!isOutdoor) {
      return 'Any time - indoor venue';
    }

    const forecast = weatherContext.forecast;
    if (forecast.length === 0) {
      return 'Weather data unavailable';
    }

    // Find the best weather window in the next 24 hours
    const goodWeatherPeriods = forecast.filter(period => {
      const temp = period.temperature;
      const conditions = period.conditions.toLowerCase();
      return temp > 10 && temp < 30 && !conditions.includes('rain');
    });

    if (goodWeatherPeriods.length > 0) {
      const bestPeriod = goodWeatherPeriods[0];
      const time = new Date(bestPeriod.datetime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `Best around ${time} - ${bestPeriod.description}`;
    }

    return 'Check weather conditions before visiting';
  }

  predictCrowding(place) {
    const currentHour = new Date().getHours();
    
    // Simple crowding prediction based on place type and time
    if (place.types.includes('restaurant')) {
      if (currentHour >= 12 && currentHour <= 14) return 'High - lunch rush';
      if (currentHour >= 19 && currentHour <= 21) return 'High - dinner rush';
      return 'Moderate';
    }

    if (place.types.includes('museum')) {
      if (currentHour >= 10 && currentHour <= 16) return 'Moderate - regular hours';
      return 'Low - off-peak hours';
    }

    if (place.types.includes('park')) {
      const isWeekend = [0, 6].includes(new Date().getDay());
      if (isWeekend && currentHour >= 10 && currentHour <= 16) {
        return 'High - weekend peak';
      }
      return 'Low to Moderate';
    }

    return 'Unknown';
  }

  calculateValueScore(place) {
    const rating = place.rating || 3;
    const priceLevel = place.priceLevel || 2;
    
    // Higher rating and lower price = better value
    const valueScore = (rating / 5) * (1 - (priceLevel / 4));
    
    if (valueScore > 0.7) return 'Excellent value';
    if (valueScore > 0.5) return 'Good value';
    if (valueScore > 0.3) return 'Fair value';
    return 'Consider alternatives';
  }

  generateUniqueInsights(place, eventContext) {
    const insights = [];

    // Event-based insights
    if (eventContext.currentEvents.length > 0) {
      const relevantEvents = eventContext.currentEvents.filter(event =>
        place.types.includes(event.type) || place.vicinity.includes(event.name)
      );
      
      if (relevantEvents.length > 0) {
        insights.push(`Special event nearby: ${relevantEvents[0].name}`);
      }
    }

    // Location-based insights
    if (place.types.includes('tourist_attraction') && place.rating > 4.3) {
      insights.push('Hidden gem with exceptional reviews');
    }

    if (place.openNow && new Date().getHours() > 20) {
      insights.push('Great for evening visits');
    }

    return insights;
  }

  generateActionableAdvice(place, weatherContext) {
    const advice = [];

    // Weather-based advice
    if (weatherContext.current.conditions.toLowerCase().includes('rain')) {
      if (place.types.some(t => ['park', 'zoo'].includes(t))) {
        advice.push('Bring umbrella or consider rescheduling');
      }
    }

    // Time-based advice
    if (place.types.includes('restaurant') && new Date().getHours() > 19) {
      advice.push('Consider making a reservation');
    }

    // General advice
    if (place.rating > 4.5) {
      advice.push('Highly recommended - book in advance if possible');
    }

    if (place.photos && place.photos.length > 0) {
      advice.push('Great photo opportunities - charge your camera!');
    }

    return advice;
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data, customTimeout = null) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout: customTimeout || this.cacheTimeout
    });
  }
}

module.exports = IntelligenceEngine;