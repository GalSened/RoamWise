import type { RoutingProvider, Route, LatLng } from '@/types';
import { AppError } from '@/types';
import { telemetry } from '@/lib/telemetry';

interface OSRMConfig {
  baseUrl?: string;
  profile?: 'driving' | 'walking' | 'cycling';
}

interface OSRMResponse {
  routes: Array<{
    legs: Array<{
      steps: Array<{
        intersections: Array<{
          location: [number, number];
        }>;
        maneuver: {
          instruction: string;
          type: string;
          location: [number, number];
        };
        name: string;
        duration: number;
        distance: number;
        geometry: {
          coordinates: Array<[number, number]>;
        };
      }>;
      summary: string;
      duration: number;
      distance: number;
    }>;
    geometry: {
      coordinates: Array<[number, number]>;
    };
    duration: number;
    distance: number;
  }>;
}

export class OSRMProvider implements RoutingProvider {
  private config: OSRMConfig;

  constructor(config: OSRMConfig = {}) {
    this.config = {
      baseUrl: 'https://router.project-osrm.org',
      profile: 'driving',
      ...config
    };
  }

  async route(input: {
    origin: LatLng;
    destination: LatLng;
    via?: LatLng[];
    mode?: 'car' | 'bike' | 'walk';
    avoidTolls?: boolean;
    departTime?: Date;
  }): Promise<Route> {
    const startTime = performance.now();
    
    try {
      const profile = this.getOSRMProfile(input.mode || 'car');
      const coordinates = [
        input.origin,
        ...(input.via || []),
        input.destination
      ];

      const coordString = coordinates
        .map(coord => `${coord.lng},${coord.lat}`)
        .join(';');

      const url = new URL(`${this.config.baseUrl}/route/v1/${profile}/${coordString}`);
      url.searchParams.set('overview', 'full');
      url.searchParams.set('geometries', 'geojson');
      url.searchParams.set('steps', 'true');
      url.searchParams.set('annotations', 'true');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new AppError(
          `OSRM API error: ${response.status}`,
          'OSRM_API_ERROR',
          response.status
        );
      }

      const data: OSRMResponse = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new AppError('No route found', 'NO_ROUTE_FOUND');
      }

      const route = this.transformRoute(data.routes[0]);
      
      telemetry.track('osrm_route_calculation', {
        mode: input.mode,
        has_waypoints: !!(input.via?.length),
        duration: performance.now() - startTime,
        distance: route.overview.distance,
        travel_time: route.overview.duration
      });

      return route;
    } catch (error) {
      telemetry.track('osrm_route_calculation_error', {
        mode: input.mode,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });
      throw error;
    }
  }

  private getOSRMProfile(mode: string): string {
    switch (mode) {
      case 'walk': return 'foot';
      case 'bike': return 'cycling';
      default: return 'driving';
    }
  }

  private transformRoute(osrmRoute: OSRMResponse['routes'][0]): Route {
    return {
      legs: osrmRoute.legs.map(leg => ({
        start: {
          lng: leg.steps[0]?.intersections[0]?.location[0] || 0,
          lat: leg.steps[0]?.intersections[0]?.location[1] || 0
        },
        end: {
          lng: leg.steps[leg.steps.length - 1]?.intersections[0]?.location[0] || 0,
          lat: leg.steps[leg.steps.length - 1]?.intersections[0]?.location[1] || 0
        },
        duration: leg.duration,
        distance: leg.distance,
        steps: leg.steps.map(step => ({
          instruction: step.maneuver.instruction,
          duration: step.duration,
          distance: step.distance,
          start: {
            lng: step.maneuver.location[0],
            lat: step.maneuver.location[1]
          },
          end: {
            lng: step.geometry.coordinates[step.geometry.coordinates.length - 1][0],
            lat: step.geometry.coordinates[step.geometry.coordinates.length - 1][1]
          },
          polyline: this.encodePolyline(step.geometry.coordinates),
          maneuver: step.maneuver.type
        })),
        polyline: this.encodePolyline(
          leg.steps.flatMap(step => step.geometry.coordinates)
        )
      })),
      overview: {
        polyline: this.encodePolyline(osrmRoute.geometry.coordinates),
        bounds: this.calculateBounds(osrmRoute.geometry.coordinates),
        duration: osrmRoute.duration,
        distance: osrmRoute.distance
      },
      warnings: [],
      summary: 'OSRM Route'
    };
  }

  private calculateBounds(coordinates: Array<[number, number]>) {
    const lngs = coordinates.map(coord => coord[0]);
    const lats = coordinates.map(coord => coord[1]);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  }

  private encodePolyline(coordinates: Array<[number, number]>): string {
    // Simple polyline encoding - in production, use a proper library
    return coordinates
      .map(coord => `${coord[1]},${coord[0]}`)
      .join(' ');
  }
}

// Factory function
export function createOSRMProvider(baseUrl?: string): RoutingProvider {
  return new OSRMProvider({ baseUrl });
}