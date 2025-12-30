/**
 * Profile Feature
 *
 * User profile management including:
 * - Trip history persistence
 * - Stats aggregation (distance, trips, level)
 * - User preferences (vegetarian, pace, notifications)
 */

export { ProfileManager, default } from './ProfileManager';
export type {
  CompletedTrip,
  UserPreferences,
  ProfileStats,
  ProfileData,
} from './types';
