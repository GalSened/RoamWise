import type { 
  PlacesProvider, 
  RoutingProvider, 
  WeatherProvider, 
  AIRecommendation,
  PlanningConstraints,
  TripPlan,
  VoiceIntent,
  LatLng,
  Place
} from '@/types';
import { AppError } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

interface AITool {
  name: string;
  description: string;
  execute(parameters: any): Promise<any>;
}

interface PlannerResult {
  plan: Partial<TripPlan>;
  reasoning: string;
  confidence: number;
  alternatives?: Partial<TripPlan>[];
}

class PlannerAgent {
  constructor(
    private placesProvider: PlacesProvider,
    private routingProvider: RoutingProvider,
    private weatherProvider: WeatherProvider
  ) {}

  async createPlan(input: {
    destination?: string;
    origin?: LatLng;
    constraints: PlanningConstraints;
    userPreferences?: Record<string, any>;
  }): Promise<PlannerResult> {
    const startTime = performance.now();
    
    try {
      // Step 1: Understand the destination
      let destinationPlaces: Place[] = [];
      if (input.destination) {
        destinationPlaces = await this.placesProvider.search(input.destination, {
          near: input.origin
        });
      }

      // Step 2: Get weather context if weather-aware
      let weatherContext;
      if (input.constraints.weatherAware && input.origin) {
        weatherContext = await this.weatherProvider.getForecast(
          input.origin.lat,
          input.origin.lng
        );
      }

      // Step 3: Find candidate stops based on constraints
      const candidates = await this.findCandidateStops(input, weatherContext);

      // Step 4: Score and rank candidates
      const recommendations = await this.scoreRecommendations(candidates, input, weatherContext);

      // Step 5: Create optimized itinerary
      const plan = await this.createOptimizedItinerary(recommendations, input);

      telemetry.track('ai_plan_created', {
        destination: input.destination,
        candidates_count: candidates.length,
        recommendations_count: recommendations.length,
        duration: performance.now() - startTime,
        weather_aware: input.constraints.weatherAware
      });

      return {
        plan,
        reasoning: this.generatePlanReasoning(plan, recommendations, weatherContext),
        confidence: this.calculatePlanConfidence(plan, recommendations),
        alternatives: [] // TODO: Generate alternatives
      };
    } catch (error) {
      telemetry.track('ai_plan_creation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });
      throw error;
    }
  }

  private async findCandidateStops(
    input: any,
    weatherContext?: any
  ): Promise<Place[]> {
    const candidates: Place[] = [];
    const searchRadius = 10000; // 10km

    if (!input.origin) return candidates;

    // Search for different categories
    const categories = input.constraints.categories || ['meal', 'scenic', 'activity'];
    
    for (const category of categories) {
      try {
        const categoryPlaces = await this.placesProvider.search(
          this.getCategorySearchTerm(category),
          {
            near: input.origin,
            radius: searchRadius,
            openNow: true
          }
        );
        candidates.push(...categoryPlaces);
      } catch (error) {
        console.warn(`Failed to search for ${category}:`, error);
      }
    }

    return candidates;
  }

  private getCategorySearchTerm(category: string): string {
    const terms = {
      meal: 'restaurants cafes food',
      scenic: 'viewpoint scenic attractions parks',
      activity: 'attractions activities things to do',
      cultural: 'museums galleries cultural sites',
      shopping: 'shopping centers markets stores'
    };
    return terms[category as keyof typeof terms] || category;
  }

  private async scoreRecommendations(
    places: Place[],
    input: any,
    weatherContext?: any
  ): Promise<AIRecommendation[]> {
    return places.map(place => {
      const scores = {
        rating: this.scoreRating(place.rating),
        distance: this.scoreDistance(place, input.origin),
        weather: this.scoreWeatherFit(place, weatherContext),
        openNow: place.openNow ? 1 : 0.3,
        priceLevel: this.scorePriceLevel(place.priceLevel, input.constraints.budget)
      };

      const weightedScore = 
        scores.rating * 0.3 +
        scores.distance * 0.2 +
        scores.weather * 0.2 +
        scores.openNow * 0.2 +
        scores.priceLevel * 0.1;

      return {
        place,
        score: weightedScore,
        reasoning: this.generateRecommendationReasoning(scores, place),
        category: this.inferCategory(place),
        estimatedDuration: this.estimateDuration(place),
        weatherFit: scores.weather,
        detourTime: 0 // TODO: Calculate actual detour time
      };
    }).sort((a, b) => b.score - a.score);
  }

  private scoreRating(rating?: number): number {
    if (!rating) return 0.5;
    return Math.min(rating / 5, 1);
  }

  private scoreDistance(place: Place, origin?: LatLng): number {
    if (!origin) return 0.5;
    
    const distance = this.calculateDistance(
      origin,
      place.location
    );
    
    // Prefer places within 5km, penalize beyond 20km
    if (distance <= 5000) return 1;
    if (distance <= 10000) return 0.8;
    if (distance <= 20000) return 0.5;
    return 0.2;
  }

  private scoreWeatherFit(place: Place, weatherContext?: any): number {
    if (!weatherContext || !place.types) return 0.7;

    const isIndoor = place.types.some(type => 
      ['museum', 'shopping_mall', 'restaurant', 'cafe'].includes(type)
    );
    
    const isOutdoor = place.types.some(type =>
      ['park', 'tourist_attraction', 'natural_feature'].includes(type)
    );

    const currentWeather = weatherContext.hourly?.[0];
    if (!currentWeather) return 0.7;

    // If it's raining, prefer indoor activities
    if (currentWeather.precipitation > 5) {
      return isIndoor ? 1 : 0.3;
    }

    // If it's very hot, prefer indoor or shaded activities
    if (currentWeather.temperature > 30) {
      return isIndoor ? 0.9 : 0.6;
    }

    // Good weather, prefer outdoor activities
    if (currentWeather.temperature > 15 && currentWeather.precipitation < 1) {
      return isOutdoor ? 1 : 0.7;
    }

    return 0.7;
  }

  private scorePriceLevel(priceLevel?: number, budget?: { min: number; max: number }): number {
    if (!priceLevel || !budget) return 0.7;

    // Google Places price levels: 0 (free) to 4 (very expensive)
    const estimatedCost = priceLevel * 50; // Rough estimate
    
    if (estimatedCost >= budget.min && estimatedCost <= budget.max) return 1;
    if (estimatedCost < budget.min) return 0.8; // Cheaper is usually okay
    if (estimatedCost > budget.max * 1.5) return 0.2; // Way over budget
    return 0.5; // Slightly over budget
  }

  private generateRecommendationReasoning(scores: any, place: Place): string {
    const reasons = [];
    
    if (scores.rating > 0.8) reasons.push('highly rated');
    if (scores.distance > 0.8) reasons.push('nearby');
    if (scores.weather > 0.8) reasons.push('perfect for current weather');
    if (scores.openNow === 1) reasons.push('open now');
    
    return reasons.length > 0 
      ? `Great choice: ${reasons.join(', ')}`
      : 'Good option for your trip';
  }

  private inferCategory(place: Place): any {
    if (!place.types) return 'other';
    
    if (place.types.includes('restaurant') || place.types.includes('cafe')) return 'meal';
    if (place.types.includes('tourist_attraction')) return 'scenic';
    if (place.types.includes('museum')) return 'cultural';
    if (place.types.includes('shopping_mall')) return 'shopping';
    
    return 'activity';
  }

  private estimateDuration(place: Place): number {
    const category = this.inferCategory(place);
    const durations = {
      meal: 90,
      scenic: 60,
      cultural: 120,
      shopping: 180,
      activity: 120,
      other: 60
    };
    return durations[category as keyof typeof durations] || 60;
  }

  private async createOptimizedItinerary(
    recommendations: AIRecommendation[],
    input: any
  ): Promise<Partial<TripPlan>> {
    const maxStops = Math.min(recommendations.length, 8); // Reasonable limit
    const selectedStops = recommendations.slice(0, maxStops);

    return {
      name: input.destination ? `Trip to ${input.destination}` : 'Custom Trip',
      description: 'AI-generated trip plan based on your preferences',
      stops: selectedStops.map((rec, index) => ({
        id: `stop-${index}`,
        place: rec.place,
        category: rec.category,
        priority: Math.max(1, Math.ceil(rec.score * 5)),
        duration: rec.estimatedDuration,
        weatherDependent: rec.weatherFit < 0.5,
        notes: rec.reasoning
      }))
    };
  }

  private generatePlanReasoning(plan: any, recommendations: AIRecommendation[], weatherContext?: any): string {
    const reasons = [
      `Selected ${plan.stops?.length || 0} stops based on ratings, proximity, and your preferences.`
    ];

    if (weatherContext) {
      const currentWeather = weatherContext.hourly?.[0];
      if (currentWeather?.precipitation > 5) {
        reasons.push('Prioritized indoor activities due to rain forecast.');
      } else if (currentWeather?.temperature > 25) {
        reasons.push('Balanced indoor and outdoor activities for comfort in warm weather.');
      }
    }

    const highRatedCount = recommendations.filter(r => r.score > 0.8).length;
    if (highRatedCount > 0) {
      reasons.push(`Included ${highRatedCount} highly-rated recommendations.`);
    }

    return reasons.join(' ');
  }

  private calculatePlanConfidence(plan: any, recommendations: AIRecommendation[]): number {
    if (!recommendations.length) return 0;
    
    const avgScore = recommendations.reduce((sum, rec) => sum + rec.score, 0) / recommendations.length;
    const hasHighQuality = recommendations.some(rec => rec.score > 0.8);
    
    return Math.min(avgScore + (hasHighQuality ? 0.2 : 0), 1);
  }

  private calculateDistance(from: LatLng, to: LatLng): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = from.lat * Math.PI / 180;
    const φ2 = to.lat * Math.PI / 180;
    const Δφ = (to.lat - from.lat) * Math.PI / 180;
    const Δλ = (to.lng - from.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}

class AIOrchestrator extends EventBus {
  private plannerAgent: PlannerAgent;
  private tools = new Map<string, AITool>();

  constructor(
    private placesProvider: PlacesProvider,
    private routingProvider: RoutingProvider,
    private weatherProvider: WeatherProvider
  ) {
    super();
    this.plannerAgent = new PlannerAgent(placesProvider, routingProvider, weatherProvider);
    this.initializeTools();
  }

  private initializeTools(): void {
    // Search Tool
    this.registerTool({
      name: 'search_places',
      description: 'Search for places near a location',
      execute: async (params: { query: string; location?: LatLng }) => {
        return this.placesProvider.search(params.query, {
          near: params.location
        });
      }
    });

    // Route Tool
    this.registerTool({
      name: 'calculate_route',
      description: 'Calculate route between locations',
      execute: async (params: { origin: LatLng; destination: LatLng }) => {
        return this.routingProvider.route(params);
      }
    });

    // Weather Tool
    this.registerTool({
      name: 'get_weather',
      description: 'Get weather information for a location',
      execute: async (params: { location: LatLng; forecast?: boolean }) => {
        if (params.forecast) {
          return this.weatherProvider.getForecast(params.location.lat, params.location.lng);
        } else {
          return this.weatherProvider.getCurrent(params.location.lat, params.location.lng);
        }
      }
    });
  }

  registerTool(tool: AITool): void {
    this.tools.set(tool.name, tool);
  }

  async processVoiceIntent(intent: VoiceIntent, context?: any): Promise<any> {
    telemetry.track('ai_voice_intent_processed', {
      intent_type: intent.type,
      confidence: intent.confidence
    });

    switch (intent.type) {
      case 'plan_create':
        return this.handlePlanCreate(intent, context);
      case 'plan_update':
        return this.handlePlanUpdate(intent, context);
      case 'search':
        return this.handleSearch(intent, context);
      case 'navigate':
        return this.handleNavigate(intent, context);
      case 'weather':
        return this.handleWeather(intent, context);
      default:
        throw new AppError(`Unsupported intent type: ${intent.type}`, 'UNSUPPORTED_INTENT');
    }
  }

  private async handlePlanCreate(intent: VoiceIntent, context?: any): Promise<PlannerResult> {
    const destination = intent.parameters.destination;
    const constraints: PlanningConstraints = {
      weatherAware: true,
      maxDrivingTime: 8 * 60, // 8 hours
      ...context?.constraints
    };

    return this.plannerAgent.createPlan({
      destination,
      origin: context?.location,
      constraints,
      userPreferences: context?.userPreferences
    });
  }

  private async handlePlanUpdate(intent: VoiceIntent, context?: any): Promise<any> {
    // TODO: Implement plan update logic
    return { action: 'plan_update', parameters: intent.parameters };
  }

  private async handleSearch(intent: VoiceIntent, context?: any): Promise<Place[]> {
    const query = intent.parameters.query;
    const location = context?.location;

    const tool = this.tools.get('search_places');
    if (!tool) throw new AppError('Search tool not available', 'TOOL_NOT_FOUND');

    return tool.execute({ query, location });
  }

  private async handleNavigate(intent: VoiceIntent, context?: any): Promise<any> {
    // TODO: Implement navigation logic
    return { action: 'navigate', parameters: intent.parameters };
  }

  private async handleWeather(intent: VoiceIntent, context?: any): Promise<any> {
    const location = context?.location;
    if (!location) {
      throw new AppError('Location required for weather information', 'LOCATION_REQUIRED');
    }

    const tool = this.tools.get('get_weather');
    if (!tool) throw new AppError('Weather tool not available', 'TOOL_NOT_FOUND');

    return tool.execute({ location, forecast: true });
  }

  async explainRecommendation(recommendation: AIRecommendation): Promise<string> {
    const reasons = [
      `This place has a score of ${(recommendation.score * 100).toFixed(0)}% based on multiple factors:`
    ];

    if (recommendation.place.rating && recommendation.place.rating > 4) {
      reasons.push(`• Highly rated (${recommendation.place.rating}⭐) by ${recommendation.place.userRatingsTotal || 'many'} visitors`);
    }

    if (recommendation.weatherFit > 0.8) {
      reasons.push('• Perfect for current weather conditions');
    } else if (recommendation.weatherFit < 0.4) {
      reasons.push('• Consider weather conditions when visiting');
    }

    if (recommendation.detourTime < 10) {
      reasons.push('• Very close to your route (minimal detour)');
    }

    reasons.push(`• Estimated visit duration: ${recommendation.estimatedDuration} minutes`);
    reasons.push(`• Category: ${recommendation.category}`);

    return reasons.join('\n');
  }
}

// Factory function to create AI orchestrator
export function createAIOrchestrator(
  placesProvider: PlacesProvider,
  routingProvider: RoutingProvider,
  weatherProvider: WeatherProvider
): AIOrchestrator {
  return new AIOrchestrator(placesProvider, routingProvider, weatherProvider);
}