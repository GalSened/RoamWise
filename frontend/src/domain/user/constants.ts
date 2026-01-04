/**
 * User Domain Constants
 */

export const TRAVELER_LEVEL_THRESHOLDS: Record<string, number> = {
  newbie: 0,
  explorer: 100,
  adventurer: 500,
  globetrotter: 1500,
  wanderer: 5000,
  legend: 15000,
};

// XP required for each level (same as thresholds, exported with different name for compatibility)
export const TRAVELER_LEVEL_XP: Record<string, number> = TRAVELER_LEVEL_THRESHOLDS;

export const TRAVELER_LEVEL_LABELS: Record<string, string> = {
  newbie: 'Newbie Traveler',
  explorer: 'Explorer',
  adventurer: 'Adventurer',
  globetrotter: 'Globetrotter',
  wanderer: 'Wanderer',
  legend: 'Travel Legend',
};

export const TRAVEL_DNA_LABELS: Record<string, string> = {
  cultural: 'Cultural Explorer',
  culinary: 'Food Lover',
  adventure: 'Thrill Seeker',
  relaxation: 'Relaxation Seeker',
  nightlife: 'Night Owl',
  nature: 'Nature Lover',
  shopping: 'Shopping Enthusiast',
};

export const CONTINENTS = [
  'Africa',
  'Antarctica',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America',
] as const;

export const XP_REWARDS = {
  COMPLETE_TRIP: 100,
  VISIT_NEW_COUNTRY: 50,
  VISIT_NEW_CONTINENT: 200,
  COMPLETE_ACTIVITY: 10,
  ADD_REVIEW: 15,
  SHARE_TRIP: 25,
  STREAK_BONUS: 50,
};

export const DEFAULT_USER_PREFERENCES: import('./types').UserPreferences = {
  language: 'en',
  theme: 'system',
  pace: 'moderate',
  budget: 'moderate',
  notifications: true,
  locationSharing: false,
};

export const DEFAULT_TRAVEL_DNA: import('./types').TravelDNA = {
  cultural: 50,
  culinary: 50,
  adventure: 50,
  relaxation: 50,
  nightlife: 50,
  nature: 50,
  shopping: 50,
};
