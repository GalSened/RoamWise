// @ts-nocheck
/**
 * Smart Route Optimizer Client
 *
 * Client-side module for generating 3 distinct trip packages:
 * - Efficiency: Fastest route with minimal detours
 * - Scenic: Most beautiful route with viewpoints
 * - Foodie: Culinary-focused with top-rated restaurants
 */

import type {
  LatLng,
  OptimizationMode,
  OptimizationResult,
  ModePackage,
  UserOptimizationPrefs,
  WeatherScores,
  LocationClassification
} from '@/types';
import { AppError } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface OptimizeRequest {
  origin: LatLng;
  destination: LatLng;
  userPrefs?: UserOptimizationPrefs;
}

interface SmartRouteOptimizerEvents {
  'packages-generated': OptimizationResult;
  'mode-selected': OptimizationMode;
  'optimization-error': Error;
  'weather-update': WeatherScores;
}

// ═══════════════════════════════════════════════════════════════
// SMART ROUTE OPTIMIZER CLIENT
// ═══════════════════════════════════════════════════════════════

export class SmartRouteOptimizer extends EventBus {
  private cache = new Map<string, { result: OptimizationResult; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private selectedMode: OptimizationMode = 'efficiency';
  private lastResult: OptimizationResult | null = null;

  constructor() {
    super();
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN API: Generate 3 Packages
  // ─────────────────────────────────────────────────────────────

  async generatePackages(
    origin: LatLng,
    destination: LatLng,
    userPrefs?: UserOptimizationPrefs
  ): Promise<OptimizationResult> {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(origin, destination, userPrefs);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      telemetry.track('smart_route_cache_hit', { cacheKey });
      return cached.result;
    }

    try {
      const response = await fetch(`${API_BASE}/planner/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          userPrefs
        } as OptimizeRequest)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.error || 'Failed to generate route packages',
          'OPTIMIZE_ERROR',
          response.status
        );
      }

      const result: OptimizationResult = await response.json();

      // Cache result
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      this.lastResult = result;

      // Auto-select recommended mode
      this.selectedMode = result.recommended;

      telemetry.track('smart_route_packages_generated', {
        recommended: result.recommended,
        disabledModes: result.disabledModes.map(d => d.mode),
        weatherScore: result.weatherInsights.scores.overall,
        duration: performance.now() - startTime
      });

      this.emit('packages-generated', result);
      return result;

    } catch (error) {
      telemetry.track('smart_route_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });

      this.emit('optimization-error', error as Error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MODE SELECTION
  // ─────────────────────────────────────────────────────────────

  selectMode(mode: OptimizationMode): ModePackage | null {
    if (!this.lastResult) return null;

    const pkg = this.lastResult.packages[mode];

    if (pkg.disabled) {
      telemetry.track('smart_route_disabled_mode_selected', {
        mode,
        reason: pkg.reason
      });
      return null;
    }

    this.selectedMode = mode;
    this.emit('mode-selected', mode);

    telemetry.track('smart_route_mode_selected', { mode });
    return pkg;
  }

  getSelectedMode(): OptimizationMode {
    return this.selectedMode;
  }

  getSelectedPackage(): ModePackage | null {
    if (!this.lastResult) return null;
    return this.lastResult.packages[this.selectedMode];
  }

  // ─────────────────────────────────────────────────────────────
  // PACKAGE ACCESSORS
  // ─────────────────────────────────────────────────────────────

  getPackage(mode: OptimizationMode): ModePackage | null {
    if (!this.lastResult) return null;
    return this.lastResult.packages[mode];
  }

  getRecommendedPackage(): ModePackage | null {
    if (!this.lastResult) return null;
    return this.lastResult.packages[this.lastResult.recommended];
  }

  getAvailableModes(): OptimizationMode[] {
    if (!this.lastResult) return [];

    return (['efficiency', 'scenic', 'foodie'] as OptimizationMode[])
      .filter(mode => !this.lastResult!.packages[mode].disabled);
  }

  getDisabledModes(): { mode: OptimizationMode; reason: string }[] {
    if (!this.lastResult) return [];
    return this.lastResult.disabledModes;
  }

  // ─────────────────────────────────────────────────────────────
  // WEATHER INSIGHTS
  // ─────────────────────────────────────────────────────────────

  getWeatherInsights(): OptimizationResult['weatherInsights'] | null {
    return this.lastResult?.weatherInsights ?? null;
  }

  getWeatherScore(): number {
    return this.lastResult?.weatherInsights.scores.overall ?? 0.7;
  }

  hasWeatherAlerts(): boolean {
    return (this.lastResult?.weatherInsights.alerts.length ?? 0) > 0;
  }

  // ─────────────────────────────────────────────────────────────
  // LOCATION CLASSIFICATION
  // ─────────────────────────────────────────────────────────────

  async classifyLocation(
    placeId: string,
    name: string,
    types: string[]
  ): Promise<LocationClassification> {
    try {
      const response = await fetch(`${API_BASE}/planner/classify-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, name, types })
      });

      if (!response.ok) {
        // Fall back to local classification
        return this.localClassifyLocation(types, name);
      }

      return await response.json();
    } catch {
      return this.localClassifyLocation(types, name);
    }
  }

  private localClassifyLocation(types: string[], name: string): LocationClassification {
    const OUTDOOR_TYPES = ['park', 'zoo', 'beach', 'hiking_area', 'viewpoint', 'garden', 'natural_feature'];
    const INDOOR_TYPES = ['museum', 'shopping_mall', 'restaurant', 'movie_theater', 'spa', 'gym', 'store'];

    if (INDOOR_TYPES.some(t => types.includes(t))) {
      return { isOutdoor: false, confidence: 0.9, types };
    }

    if (OUTDOOR_TYPES.some(t => types.includes(t))) {
      return { isOutdoor: true, confidence: 0.9, types };
    }

    // Check name keywords
    const outdoorKeywords = ['outdoor', 'hiking', 'trail', 'beach', 'park', 'garden', 'mountain'];
    const indoorKeywords = ['mall', 'museum', 'cinema', 'theater', 'indoor', 'gallery'];

    const nameLower = name.toLowerCase();

    if (outdoorKeywords.some(kw => nameLower.includes(kw))) {
      return { isOutdoor: true, confidence: 0.7, types };
    }

    if (indoorKeywords.some(kw => nameLower.includes(kw))) {
      return { isOutdoor: false, confidence: 0.7, types };
    }

    // Default to indoor (safer assumption)
    return { isOutdoor: false, confidence: 0.5, types };
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────

  private getCacheKey(
    origin: LatLng,
    destination: LatLng,
    userPrefs?: UserOptimizationPrefs
  ): string {
    return [
      `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`,
      `${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`,
      JSON.stringify(userPrefs || {})
    ].join('|');
  }

  clearCache(): void {
    this.cache.clear();
    this.lastResult = null;
  }

  getLastResult(): OptimizationResult | null {
    return this.lastResult;
  }

  // ─────────────────────────────────────────────────────────────
  // MODE COMPARISON HELPERS
  // ─────────────────────────────────────────────────────────────

  compareModes(): ModeComparison | null {
    if (!this.lastResult) return null;

    const { efficiency, scenic, foodie } = this.lastResult.packages;

    return {
      fastest: {
        mode: 'efficiency',
        duration: efficiency.totalDuration || efficiency.route?.duration || 0
      },
      mostScenic: {
        mode: 'scenic',
        scenicScore: scenic.route?.scenicScore || 0,
        durationIncrease: scenic.durationIncrease || '+0%'
      },
      bestFood: {
        mode: 'foodie',
        restaurantRating: foodie.selectedRestaurant?.rating || 0,
        restaurantName: foodie.selectedRestaurant?.name || ''
      },
      weatherRecommended: this.lastResult.recommended,
      weatherScore: this.lastResult.weatherInsights.scores.overall
    };
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  }
}

// ═══════════════════════════════════════════════════════════════
// SUPPORTING TYPES
// ═══════════════════════════════════════════════════════════════

interface ModeComparison {
  fastest: {
    mode: OptimizationMode;
    duration: number;
  };
  mostScenic: {
    mode: OptimizationMode;
    scenicScore: number;
    durationIncrease: string;
  };
  bestFood: {
    mode: OptimizationMode;
    restaurantRating: number;
    restaurantName: string;
  };
  weatherRecommended: OptimizationMode;
  weatherScore: number;
}

// ═══════════════════════════════════════════════════════════════
// FACTORY & SINGLETON
// ═══════════════════════════════════════════════════════════════

let instance: SmartRouteOptimizer | null = null;

export function getSmartRouteOptimizer(): SmartRouteOptimizer {
  if (!instance) {
    instance = new SmartRouteOptimizer();
  }
  return instance;
}

export function createSmartRouteOptimizer(): SmartRouteOptimizer {
  return new SmartRouteOptimizer();
}
