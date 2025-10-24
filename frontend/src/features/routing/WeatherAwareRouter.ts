import type { 
  Route, 
  LatLng, 
  RoutingProvider, 
  WeatherProvider, 
  RouteOptions,
  WeatherData 
} from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

interface WeatherRouteScore {
  originalRoute: Route;
  weatherScore: number;
  weatherFactors: {
    precipitation: number; // 0-1 (1 = no rain, 0 = heavy rain)
    temperature: number;   // 0-1 (1 = comfortable, 0 = extreme)
    visibility: number;    // 0-1 (1 = clear, 0 = poor visibility)
    wind: number;         // 0-1 (1 = calm, 0 = dangerous winds)
    overall: number;      // combined weather fitness score
  };
  recommendation: 'proceed' | 'delay' | 'indoor_route' | 'cancel';
  weatherAlerts: string[];
  alternativeRoutes?: WeatherRouteScore[];
}

interface WeatherRouteOptions extends RouteOptions {
  weatherAware?: boolean;
  weatherThreshold?: number; // Minimum weather score to proceed (0-1)
  includeAlternatives?: boolean;
  maxAlternatives?: number;
}

export class WeatherAwareRouter extends EventBus {
  private routingProvider: RoutingProvider;
  private weatherProvider: WeatherProvider;
  private routeCache = new Map<string, { route: Route; timestamp: number }>();
  private weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(routingProvider: RoutingProvider, weatherProvider: WeatherProvider) {
    super();
    this.routingProvider = routingProvider;
    this.weatherProvider = weatherProvider;
  }

  async calculateWeatherAwareRoute(
    origin: LatLng,
    destination: LatLng,
    options: WeatherRouteOptions = {}
  ): Promise<WeatherRouteScore> {
    const startTime = performance.now();
    
    try {
      // Step 1: Get basic route
      const basicRoute = await this.getBasicRoute(origin, destination, options);

      // Step 2: If weather awareness is disabled, return basic route
      if (!options.weatherAware) {
        return {
          originalRoute: basicRoute,
          weatherScore: 0.7, // neutral score
          weatherFactors: this.getNeutralWeatherFactors(),
          recommendation: 'proceed',
          weatherAlerts: []
        };
      }

      // Step 3: Analyze weather along route
      const weatherAnalysis = await this.analyzeRouteWeather(basicRoute);

      // Step 4: Score route based on weather
      const weatherScore = this.calculateWeatherScore(weatherAnalysis);

      // Step 5: Generate recommendations
      const recommendation = this.generateWeatherRecommendation(weatherScore, options);

      // Step 6: Get alternative routes if needed
      let alternativeRoutes: WeatherRouteScore[] = [];
      if (options.includeAlternatives && (weatherScore.overall < 0.6 || options.maxAlternatives)) {
        alternativeRoutes = await this.generateAlternativeRoutes(
          origin, 
          destination, 
          basicRoute, 
          options
        );
      }

      const result: WeatherRouteScore = {
        originalRoute: basicRoute,
        weatherScore: weatherScore.overall,
        weatherFactors: weatherScore,
        recommendation,
        weatherAlerts: this.generateWeatherAlerts(weatherAnalysis, weatherScore),
        alternativeRoutes
      };

      telemetry.track('weather_aware_route_calculated', {
        weather_score: weatherScore.overall,
        recommendation,
        has_alternatives: alternativeRoutes.length > 0,
        duration: performance.now() - startTime
      });

      this.emit('route-calculated', result);
      return result;

    } catch (error) {
      telemetry.track('weather_aware_route_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });
      throw error;
    }
  }

  private async getBasicRoute(
    origin: LatLng, 
    destination: LatLng, 
    options: RouteOptions
  ): Promise<Route> {
    const cacheKey = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}-${JSON.stringify(options)}`;
    const cached = this.routeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.route;
    }

    const route = await this.routingProvider.route({ origin, destination, ...options });
    this.routeCache.set(cacheKey, { route, timestamp: Date.now() });
    
    return route;
  }

  private async analyzeRouteWeather(route: Route): Promise<WeatherData[]> {
    const weatherPoints = this.extractWeatherCheckpoints(route);
    const weatherPromises = weatherPoints.map(point => this.getWeatherForPoint(point));
    
    return Promise.all(weatherPromises);
  }

  private extractWeatherCheckpoints(route: Route): LatLng[] {
    const checkpoints: LatLng[] = [];
    
    // Add start and end points
    if (route.legs.length > 0) {
      checkpoints.push(route.legs[0].start);
      checkpoints.push(route.legs[route.legs.length - 1].end);
    }

    // Add intermediate points (every ~20km or major waypoints)
    route.legs.forEach(leg => {
      if (leg.distance > 20000) { // 20km+
        // Add a midpoint for long legs
        const midpoint = this.interpolateLatLng(leg.start, leg.end, 0.5);
        checkpoints.push(midpoint);
      }
    });

    return checkpoints;
  }

  private async getWeatherForPoint(point: LatLng): Promise<WeatherData> {
    const cacheKey = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
    const cached = this.weatherCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const weather = await this.weatherProvider.getCurrent(point.lat, point.lng);
    this.weatherCache.set(cacheKey, { data: weather, timestamp: Date.now() });
    
    return weather;
  }

  private calculateWeatherScore(weatherData: WeatherData[]): WeatherRouteScore['weatherFactors'] {
    if (weatherData.length === 0) {
      return this.getNeutralWeatherFactors();
    }

    // Aggregate weather conditions across all points
    const avgWeather = this.aggregateWeatherData(weatherData);
    
    // Score each weather factor (0-1, higher is better)
    const precipitation = this.scorePrecipitation(avgWeather.precipitation);
    const temperature = this.scoreTemperature(avgWeather.temperature);
    const visibility = this.scoreVisibility(avgWeather.visibility);
    const wind = this.scoreWind(avgWeather.windSpeed);

    // Calculate overall score with weights
    const overall = (
      precipitation * 0.4 +  // Rain is most important for driving
      temperature * 0.2 +    // Temperature affects comfort
      visibility * 0.3 +     // Visibility is crucial for safety
      wind * 0.1            // Wind is least critical for most routes
    );

    return {
      precipitation,
      temperature,
      visibility,
      wind,
      overall
    };
  }

  private aggregateWeatherData(weatherData: WeatherData[]): any {
    const count = weatherData.length;
    
    return {
      temperature: weatherData.reduce((sum, w) => sum + w.temperature, 0) / count,
      precipitation: Math.max(...weatherData.map(w => w.precipitation || 0)),
      windSpeed: weatherData.reduce((sum, w) => sum + (w.windSpeed || 0), 0) / count,
      visibility: Math.min(...weatherData.map(w => w.visibility || 10)) // km
    };
  }

  private scorePrecipitation(precipitation: number): number {
    // precipitation in mm/h
    if (precipitation <= 0.5) return 1.0;      // No rain
    if (precipitation <= 2.5) return 0.8;     // Light rain
    if (precipitation <= 7.5) return 0.5;     // Moderate rain
    if (precipitation <= 15) return 0.2;      // Heavy rain
    return 0.0; // Very heavy rain
  }

  private scoreTemperature(temperature: number): number {
    // temperature in Celsius - score based on driving comfort
    if (temperature >= 15 && temperature <= 25) return 1.0; // Ideal
    if (temperature >= 10 && temperature <= 30) return 0.8; // Good
    if (temperature >= 5 && temperature <= 35) return 0.6;  // Acceptable
    if (temperature >= 0 && temperature <= 40) return 0.3;  // Uncomfortable
    return 0.1; // Extreme temperatures
  }

  private scoreVisibility(visibility: number): number {
    // visibility in km
    if (visibility >= 10) return 1.0;   // Excellent
    if (visibility >= 5) return 0.8;    // Good
    if (visibility >= 2) return 0.5;    // Fair
    if (visibility >= 1) return 0.2;    // Poor
    return 0.0; // Very poor
  }

  private scoreWind(windSpeed: number): number {
    // wind speed in km/h
    if (windSpeed <= 20) return 1.0;    // Calm to light breeze
    if (windSpeed <= 40) return 0.8;    // Moderate wind
    if (windSpeed <= 60) return 0.5;    // Strong wind
    if (windSpeed <= 80) return 0.2;    // Very strong wind
    return 0.0; // Dangerous winds
  }

  private generateWeatherRecommendation(
    weatherScore: WeatherRouteScore['weatherFactors'],
    options: WeatherRouteOptions
  ): WeatherRouteScore['recommendation'] {
    const threshold = options.weatherThreshold || 0.6;
    
    if (weatherScore.overall >= threshold) {
      return 'proceed';
    }
    
    // Analyze specific issues
    if (weatherScore.precipitation < 0.3) {
      return 'delay'; // Heavy rain
    }
    
    if (weatherScore.visibility < 0.3) {
      return 'delay'; // Poor visibility
    }
    
    if (weatherScore.wind < 0.2) {
      return 'cancel'; // Dangerous winds
    }
    
    if (weatherScore.overall < 0.3) {
      return 'cancel'; // Multiple severe issues
    }
    
    return 'indoor_route'; // Try alternatives with more indoor stops
  }

  private generateWeatherAlerts(
    weatherData: WeatherData[],
    weatherScore: WeatherRouteScore['weatherFactors']
  ): string[] {
    const alerts: string[] = [];
    
    if (weatherScore.precipitation < 0.5) {
      alerts.push('⚠️ Heavy rain expected along route. Consider delaying travel.');
    }
    
    if (weatherScore.visibility < 0.5) {
      alerts.push('🌫️ Reduced visibility due to fog or weather conditions.');
    }
    
    if (weatherScore.wind < 0.5) {
      alerts.push('💨 Strong winds reported. Drive carefully, especially in open areas.');
    }
    
    if (weatherScore.temperature < 0.3) {
      const avgTemp = weatherData.reduce((sum, w) => sum + w.temperature, 0) / weatherData.length;
      if (avgTemp < 0) {
        alerts.push('🧊 Freezing conditions. Watch for ice on roads.');
      } else if (avgTemp > 35) {
        alerts.push('🌡️ Extremely hot weather. Ensure vehicle cooling and hydration.');
      }
    }
    
    return alerts;
  }

  private async generateAlternativeRoutes(
    origin: LatLng,
    destination: LatLng,
    originalRoute: Route,
    options: WeatherRouteOptions
  ): Promise<WeatherRouteScore[]> {
    const alternatives: WeatherRouteScore[] = [];
    const maxAlternatives = options.maxAlternatives || 2;
    
    // Try different routing preferences
    const alternativeOptions = [
      { ...options, routePreference: 'shortest' as const },
      { ...options, avoidHighways: true },
      { ...options, avoidTolls: true }
    ];

    for (const altOptions of alternativeOptions.slice(0, maxAlternatives)) {
      try {
        const altRoute = await this.getBasicRoute(origin, destination, altOptions);
        
        // Skip if route is too similar to original
        if (this.routesSimilar(originalRoute, altRoute)) continue;
        
        const weatherAnalysis = await this.analyzeRouteWeather(altRoute);
        const weatherScore = this.calculateWeatherScore(weatherAnalysis);
        const recommendation = this.generateWeatherRecommendation(weatherScore, options);
        
        alternatives.push({
          originalRoute: altRoute,
          weatherScore: weatherScore.overall,
          weatherFactors: weatherScore,
          recommendation,
          weatherAlerts: this.generateWeatherAlerts(weatherAnalysis, weatherScore)
        });
      } catch (error) {
        console.warn('Failed to generate alternative route:', error);
      }
    }
    
    // Sort by weather score (best weather first)
    return alternatives.sort((a, b) => b.weatherScore - a.weatherScore);
  }

  private routesSimilar(route1: Route, route2: Route): boolean {
    // Simple similarity check based on distance and duration
    const distanceDiff = Math.abs(route1.overview.distance - route2.overview.distance);
    const durationDiff = Math.abs(route1.overview.duration - route2.overview.duration);
    
    return distanceDiff < route1.overview.distance * 0.1 && 
           durationDiff < route1.overview.duration * 0.1;
  }

  private getNeutralWeatherFactors(): WeatherRouteScore['weatherFactors'] {
    return {
      precipitation: 0.7,
      temperature: 0.7,
      visibility: 0.7,
      wind: 0.7,
      overall: 0.7
    };
  }

  private interpolateLatLng(start: LatLng, end: LatLng, ratio: number): LatLng {
    return {
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio
    };
  }

  // Public API for real-time weather updates during navigation
  async updateRouteWeather(route: Route): Promise<WeatherRouteScore['weatherFactors']> {
    const weatherData = await this.analyzeRouteWeather(route);
    const weatherScore = this.calculateWeatherScore(weatherData);
    
    this.emit('route-weather-updated', weatherScore);
    return weatherScore;
  }

  // Get weather forecast for route planning
  async getRouteForecast(
    origin: LatLng,
    destination: LatLng,
    departureTime: Date
  ): Promise<{ hourlyWeather: any[]; recommendation: string }> {
    try {
      const forecastData = await this.weatherProvider.getForecast(origin.lat, origin.lng);
      
      // Find forecast closest to departure time
      const departureHour = departureTime.getHours();
      const relevantForecast = forecastData.hourly?.slice(departureHour, departureHour + 6) || [];
      
      const weatherScore = this.calculateWeatherScore(relevantForecast);
      let recommendation = 'Good weather for travel';
      
      if (weatherScore.overall < 0.4) {
        recommendation = 'Consider delaying travel due to poor weather conditions';
      } else if (weatherScore.overall < 0.6) {
        recommendation = 'Acceptable weather, drive carefully';
      }
      
      return {
        hourlyWeather: relevantForecast,
        recommendation
      };
    } catch (error) {
      console.warn('Failed to get route forecast:', error);
      return {
        hourlyWeather: [],
        recommendation: 'Weather data unavailable'
      };
    }
  }

  clearCache(): void {
    this.routeCache.clear();
    this.weatherCache.clear();
  }
}

// Factory function
export function createWeatherAwareRouter(
  routingProvider: RoutingProvider,
  weatherProvider: WeatherProvider
): WeatherAwareRouter {
  return new WeatherAwareRouter(routingProvider, weatherProvider);
}