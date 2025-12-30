/**
 * Profile Feature Types
 *
 * Type definitions for user profile, completed trips, and preferences.
 * Used by ProfileManager for persistence and ProfileScreen for display.
 */

/**
 * Represents a completed hiking trip saved to user's history
 */
export interface CompletedTrip {
  /** Unique identifier for the trip */
  id: string;
  /** Trail/route name */
  name: string;
  /** ISO date string of when the trip was completed */
  date: string;
  /** Total distance walked in kilometers */
  distanceKm: number;
  /** Total duration in minutes */
  durationMinutes: number;
  /** Number of stops/POIs visited */
  stopsVisited: number;
  /** Trip category (Nature, Urban, Water, etc.) */
  category: string;
  /** Optional thumbnail image URL from first stop */
  thumbnail?: string;
  /** Destination coordinates and name */
  destination: {
    lat: number;
    lng: number;
    name: string;
  };
}

/**
 * User preferences that influence trip planning and app behavior
 */
export interface UserPreferences {
  /** Filter for vegetarian-friendly restaurants */
  vegetarian: boolean;
  /** Avoid routes with stairs/steep terrain */
  avoidStairs: boolean;
  /** Walking pace affects duration calculations */
  walkingPace: 'slow' | 'moderate' | 'fast';
  /** Push notification preferences */
  notifications: boolean;
  /** User display name */
  displayName: string;
}

/**
 * Aggregated statistics calculated from trip history
 */
export interface ProfileStats {
  /** Total distance walked across all trips (km) */
  totalDistanceKm: number;
  /** Total number of completed trips */
  totalTrips: number;
  /** Unique days with completed trips */
  totalDaysInNature: number;
  /** Most frequent trip category */
  favoriteCategory: string | null;
  /** User level (1-5) based on total km walked */
  level: number;
  /** Human-readable level title */
  levelTitle: string;
}

/**
 * Complete profile data structure
 */
export interface ProfileData {
  stats: ProfileStats;
  preferences: UserPreferences;
  history: CompletedTrip[];
}
