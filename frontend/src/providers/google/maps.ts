import type { 
  PlacesProvider, 
  RoutingProvider, 
  Place, 
  PlaceDetail, 
  PhotoRef, 
  Route, 
  LatLng 
} from '@/types';
import { AppError } from '@/types';
import { telemetry } from '@/lib/telemetry';

interface GoogleMapsConfig {
  apiKey: string;
  language?: string;
  region?: string;
}

// Google Maps Places Provider
export class GooglePlacesProvider implements PlacesProvider {
  private config: GoogleMapsConfig;
  private service?: google.maps.places.PlacesService;

  constructor(config: GoogleMapsConfig) {
    this.config = config;
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    if (this.service) return;

    // Load Google Maps JavaScript API if not already loaded
    if (typeof google === 'undefined') {
      await this.loadGoogleMapsAPI();
    }

    // Create a temporary div for PlacesService
    const div = document.createElement('div');
    this.service = new google.maps.places.PlacesService(div);
  }

  private loadGoogleMapsAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.config.apiKey}&libraries=places&language=${this.config.language || 'en'}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new AppError('Failed to load Google Maps API', 'MAPS_API_LOAD_FAILED'));
      
      document.head.appendChild(script);
    });
  }

  async search(
    query: string, 
    options: {
      near?: LatLng;
      type?: string;
      openNow?: boolean;
      radius?: number;
    } = {}
  ): Promise<Place[]> {
    const startTime = performance.now();
    
    try {
      await this.initializeService();
      
      const request: google.maps.places.TextSearchRequest = {
        query,
        location: options.near ? new google.maps.LatLng(options.near.lat, options.near.lng) : undefined,
        radius: options.radius || 5000,
        type: options.type as any,
        openNow: options.openNow
      };

      const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
        this.service!.textSearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            reject(new AppError(`Places search failed: ${status}`, 'PLACES_SEARCH_FAILED'));
          }
        });
      });

      const places = results.map(this.transformPlace).filter(Boolean) as Place[];
      
      telemetry.track('places_search', {
        query,
        results_count: places.length,
        duration: performance.now() - startTime,
        has_location: !!options.near
      });

      return places;
    } catch (error) {
      telemetry.track('places_search_error', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });
      throw error;
    }
  }

  async details(placeId: string): Promise<PlaceDetail> {
    const startTime = performance.now();
    
    try {
      await this.initializeService();

      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: [
          'place_id', 'name', 'formatted_address', 'geometry',
          'rating', 'user_ratings_total', 'price_level', 'types',
          'opening_hours', 'formatted_phone_number', 'website',
          'reviews', 'photos', 'vicinity'
        ]
      };

      const result = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        this.service!.getDetails(request, (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place);
          } else {
            reject(new AppError(`Place details failed: ${status}`, 'PLACE_DETAILS_FAILED'));
          }
        });
      });

      const placeDetail = this.transformPlaceDetail(result);
      
      telemetry.track('place_details', {
        place_id: placeId,
        duration: performance.now() - startTime
      });

      return placeDetail;
    } catch (error) {
      telemetry.track('place_details_error', {
        place_id: placeId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });
      throw error;
    }
  }

  async photos(placeId: string, maxPhotos = 5): Promise<PhotoRef[]> {
    try {
      const placeDetail = await this.details(placeId);
      return placeDetail.photos?.slice(0, maxPhotos) || [];
    } catch (error) {
      console.warn('Failed to get place photos:', error);
      return [];
    }
  }

  private transformPlace(gPlace: google.maps.places.PlaceResult): Place | null {
    if (!gPlace.place_id || !gPlace.name || !gPlace.geometry?.location) {
      return null;
    }

    return {
      id: gPlace.place_id,
      name: gPlace.name,
      address: gPlace.formatted_address,
      location: {
        lat: gPlace.geometry.location.lat(),
        lng: gPlace.geometry.location.lng()
      },
      rating: gPlace.rating,
      userRatingsTotal: gPlace.user_ratings_total,
      priceLevel: gPlace.price_level,
      types: gPlace.types,
      openNow: gPlace.opening_hours?.open_now,
      photos: gPlace.photos?.map(photo => ({
        url: photo.getUrl({ maxWidth: 400, maxHeight: 300 }),
        width: 400,
        height: 300,
        attributions: photo.html_attributions
      }))
    };
  }

  private transformPlaceDetail(gPlace: google.maps.places.PlaceResult): PlaceDetail {
    const base = this.transformPlace(gPlace);
    if (!base) {
      throw new AppError('Invalid place data', 'INVALID_PLACE_DATA');
    }

    return {
      ...base,
      formattedAddress: gPlace.formatted_address || base.address || '',
      phoneNumber: gPlace.formatted_phone_number,
      website: gPlace.website,
      openingHours: gPlace.opening_hours ? {
        openNow: gPlace.opening_hours.open_now || false,
        periods: gPlace.opening_hours.periods?.map(period => ({
          open: {
            day: period.open?.day || 0,
            time: period.open?.time || '0000'
          },
          close: period.close ? {
            day: period.close.day,
            time: period.close.time
          } : undefined
        })) || [],
        weekdayText: gPlace.opening_hours.weekday_text || []
      } : undefined,
      reviews: gPlace.reviews?.map(review => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time
      })),
      vicinity: gPlace.vicinity
    };
  }
}

// Google Routes Provider
export class GoogleRoutesProvider implements RoutingProvider {
  private config: GoogleMapsConfig;
  private service?: google.maps.DirectionsService;

  constructor(config: GoogleMapsConfig) {
    this.config = config;
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    if (this.service) return;

    if (typeof google === 'undefined') {
      await this.loadGoogleMapsAPI();
    }

    this.service = new google.maps.DirectionsService();
  }

  private loadGoogleMapsAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.config.apiKey}&language=${this.config.language || 'en'}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new AppError('Failed to load Google Maps API', 'MAPS_API_LOAD_FAILED'));
      
      document.head.appendChild(script);
    });
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
      await this.initializeService();

      const request: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(input.origin.lat, input.origin.lng),
        destination: new google.maps.LatLng(input.destination.lat, input.destination.lng),
        waypoints: input.via?.map(point => ({
          location: new google.maps.LatLng(point.lat, point.lng),
          stopover: true
        })),
        travelMode: this.getTravelMode(input.mode || 'car'),
        avoidTolls: input.avoidTolls || false,
        drivingOptions: input.departTime ? {
          departureTime: input.departTime,
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        } : undefined,
        unitSystem: google.maps.UnitSystem.METRIC
      };

      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        this.service!.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(new AppError(`Route calculation failed: ${status}`, 'ROUTE_CALCULATION_FAILED'));
          }
        });
      });

      const route = this.transformRoute(result);
      
      telemetry.track('route_calculation', {
        mode: input.mode,
        has_waypoints: !!(input.via?.length),
        duration: performance.now() - startTime,
        distance: route.overview.distance,
        travel_time: route.overview.duration
      });

      return route;
    } catch (error) {
      telemetry.track('route_calculation_error', {
        mode: input.mode,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      });
      throw error;
    }
  }

  private getTravelMode(mode: string): google.maps.TravelMode {
    switch (mode) {
      case 'walk': return google.maps.TravelMode.WALKING;
      case 'bike': return google.maps.TravelMode.BICYCLING;
      case 'transit': return google.maps.TravelMode.TRANSIT;
      default: return google.maps.TravelMode.DRIVING;
    }
  }

  private transformRoute(gRoute: google.maps.DirectionsResult): Route {
    const route = gRoute.routes[0];
    if (!route) {
      throw new AppError('No route found', 'NO_ROUTE_FOUND');
    }

    return {
      legs: route.legs.map(leg => ({
        start: {
          lat: leg.start_location.lat(),
          lng: leg.start_location.lng()
        },
        end: {
          lat: leg.end_location.lat(),
          lng: leg.end_location.lng()
        },
        duration: leg.duration?.value || 0,
        distance: leg.distance?.value || 0,
        steps: leg.steps.map(step => ({
          instruction: step.instructions,
          duration: step.duration?.value || 0,
          distance: step.distance?.value || 0,
          start: {
            lat: step.start_location.lat(),
            lng: step.start_location.lng()
          },
          end: {
            lat: step.end_location.lat(),
            lng: step.end_location.lng()
          },
          polyline: step.polyline?.points || '',
          maneuver: step.maneuver
        })),
        polyline: leg.steps.map(step => step.polyline?.points).join('')
      })),
      overview: {
        polyline: route.overview_polyline?.points || '',
        bounds: {
          north: route.bounds?.getNorthEast().lat() || 0,
          south: route.bounds?.getSouthWest().lat() || 0,
          east: route.bounds?.getNorthEast().lng() || 0,
          west: route.bounds?.getSouthWest().lng() || 0
        },
        duration: route.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0),
        distance: route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0)
      },
      warnings: route.warnings,
      summary: route.summary
    };
  }
}

// Factory function to create providers
export function createGoogleProviders(apiKey: string) {
  const config = { apiKey, language: 'en', region: 'US' };
  
  return {
    places: new GooglePlacesProvider(config),
    routing: new GoogleRoutesProvider(config)
  };
}