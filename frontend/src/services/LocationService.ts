/**
 * LocationService - Handles geolocation and reverse geocoding
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

export interface LocationInfo {
  lat: number;
  lng: number;
  country: string;
  countryCode: string;
  city: string;
  displayName: string;
}

interface NominatimResponse {
  address: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
  display_name: string;
}

const CACHE_KEY = 'traveling-location-cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class LocationService {
  private static instance: LocationService;
  private cache: { data: LocationInfo; timestamp: number } | null = null;

  private constructor() {
    // Load cache from localStorage
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch {
      this.cache = null;
    }
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Get current GPS position from browser geolocation API
   */
  async getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission denied'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location unavailable'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out'));
              break;
            default:
              reject(new Error('Unknown location error'));
          }
        },
        {
          enableHighAccuracy: false, // Use coarse location for faster response
          timeout: 10000,
          maximumAge: 60000, // Accept cached position up to 1 minute old
        }
      );
    });
  }

  /**
   * Reverse geocode coordinates to location info using Nominatim API
   */
  async reverseGeocode(lat: number, lng: number): Promise<LocationInfo> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TravelingApp/1.0 (travel planner app)',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data: NominatimResponse = await response.json();

    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality ||
      data.address.state ||
      'Unknown';

    const locationInfo: LocationInfo = {
      lat,
      lng,
      country: data.address.country || 'Unknown',
      countryCode: (data.address.country_code || 'XX').toUpperCase(),
      city,
      displayName: data.display_name,
    };

    return locationInfo;
  }

  /**
   * Combined: get current position + reverse geocode
   * Uses caching to prevent excessive API calls
   */
  async detectLocation(): Promise<LocationInfo> {
    // Check cache first
    if (this.cache && Date.now() - this.cache.timestamp < CACHE_TTL_MS) {
      console.log('[LocationService] Using cached location');
      return this.cache.data;
    }

    try {
      console.log('[LocationService] Detecting location...');
      const position = await this.getCurrentPosition();
      const locationInfo = await this.reverseGeocode(position.lat, position.lng);

      // Update cache
      this.cache = {
        data: locationInfo,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));

      console.log('[LocationService] Location detected:', locationInfo.city, locationInfo.countryCode);
      return locationInfo;
    } catch (error) {
      console.warn('[LocationService] Detection failed:', error);

      // Return last known location if available
      if (this.cache) {
        console.log('[LocationService] Falling back to cached location');
        return this.cache.data;
      }

      throw error;
    }
  }

  /**
   * Get last known location without triggering detection
   */
  getLastKnownLocation(): LocationInfo | null {
    return this.cache?.data || null;
  }

  /**
   * Clear the location cache
   */
  clearCache(): void {
    this.cache = null;
    localStorage.removeItem(CACHE_KEY);
  }
}

export const locationService = LocationService.getInstance();
export default locationService;
