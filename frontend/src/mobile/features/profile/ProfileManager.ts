/**
 * ProfileManager - User profile persistence and stats aggregation
 *
 * Singleton manager for:
 * - Saving/loading completed trips
 * - Aggregating user statistics
 * - Managing user preferences
 *
 * Uses the app's storage abstraction (IndexedDB → localStorage → memory)
 */

import { storage } from '../../../lib/storage';
import { CompletedTrip, UserPreferences, ProfileStats } from './types';

/**
 * Storage keys for profile data
 */
const STORAGE_KEYS = {
  COMPLETED_TRIPS: 'profile:completed_trips',
  PREFERENCES: 'profile:preferences',
} as const;

/**
 * Default user preferences for new users
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  vegetarian: false,
  avoidStairs: false,
  walkingPace: 'moderate',
  notifications: true,
  displayName: 'Explorer',
};

/**
 * Level progression based on total kilometers walked
 */
const LEVELS = [
  { minKm: 0, level: 1, title: 'Trail Rookie' },
  { minKm: 50, level: 2, title: 'Path Finder' },
  { minKm: 150, level: 3, title: 'Explorer' },
  { minKm: 300, level: 4, title: 'Trailblazer' },
  { minKm: 500, level: 5, title: 'Wilderness Master' },
] as const;

/**
 * ProfileManager Singleton
 *
 * Manages all profile-related persistence and computations.
 */
export class ProfileManager {
  private static instance: ProfileManager;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ProfileManager {
    if (!ProfileManager.instance) {
      ProfileManager.instance = new ProfileManager();
    }
    return ProfileManager.instance;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Trip History Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Save a completed trip to history
   * Prepends to history (newest first)
   */
  async saveCompletedTrip(trip: CompletedTrip): Promise<void> {
    const history = await this.getHistory();
    const updatedHistory = [trip, ...history];
    await storage.set(STORAGE_KEYS.COMPLETED_TRIPS, updatedHistory);
  }

  /**
   * Get all completed trips from history
   * Returns newest first
   */
  async getHistory(): Promise<CompletedTrip[]> {
    const history = await storage.getArray<CompletedTrip>(STORAGE_KEYS.COMPLETED_TRIPS, []);
    return history;
  }

  /**
   * Clear all trip history (for testing/reset)
   */
  async clearHistory(): Promise<void> {
    await storage.set(STORAGE_KEYS.COMPLETED_TRIPS, []);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stats Aggregation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate aggregated stats from trip history
   */
  async getStats(): Promise<ProfileStats> {
    const history = await this.getHistory();

    if (history.length === 0) {
      return {
        totalDistanceKm: 0,
        totalTrips: 0,
        totalDaysInNature: 0,
        favoriteCategory: null,
        level: 1,
        levelTitle: 'Trail Rookie',
      };
    }

    // Calculate total distance
    const totalDistanceKm = history.reduce(
      (sum, trip) => sum + (trip.distanceKm || 0),
      0
    );

    // Calculate unique days (by date string YYYY-MM-DD)
    const uniqueDays = new Set(
      history.map((trip) => trip.date.substring(0, 10))
    );

    // Calculate favorite category
    const categoryCount = history.reduce((acc, trip) => {
      const cat = trip.category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteCategory =
      Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Calculate level
    const { level, title: levelTitle } = this.calculateLevel(totalDistanceKm);

    return {
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10, // Round to 1 decimal
      totalTrips: history.length,
      totalDaysInNature: uniqueDays.size,
      favoriteCategory,
      level,
      levelTitle,
    };
  }

  /**
   * Calculate user level based on total km walked
   */
  private calculateLevel(totalKm: number): { level: number; title: string } {
    // Find highest level the user qualifies for
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalKm >= LEVELS[i].minKm) {
        return { level: LEVELS[i].level, title: LEVELS[i].title };
      }
    }
    return { level: 1, title: 'Trail Rookie' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User Preferences
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get user preferences (with defaults for missing values)
   */
  async getPreferences(): Promise<UserPreferences> {
    const stored = await storage.getObject<Partial<UserPreferences>>(
      STORAGE_KEYS.PREFERENCES,
      null
    );

    // Merge stored preferences with defaults
    return {
      ...DEFAULT_PREFERENCES,
      ...(stored || {}),
    };
  }

  /**
   * Update user preferences (partial update supported)
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    const current = await this.getPreferences();
    const updated = { ...current, ...updates };
    await storage.set(STORAGE_KEYS.PREFERENCES, updated);
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    await storage.set(STORAGE_KEYS.PREFERENCES, DEFAULT_PREFERENCES);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Complete Profile Data
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all profile data in one call
   * Useful for initial screen load
   */
  async getProfileData(): Promise<{
    stats: ProfileStats;
    preferences: UserPreferences;
    history: CompletedTrip[];
  }> {
    const [stats, preferences, history] = await Promise.all([
      this.getStats(),
      this.getPreferences(),
      this.getHistory(),
    ]);

    return { stats, preferences, history };
  }
}

export default ProfileManager;
