/**
 * Trip Domain Constants
 */

export const TRIP_STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  planned: 'Planned',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  attraction: 'Attraction',
  restaurant: 'Restaurant',
  hotel: 'Hotel',
  transport: 'Transport',
  shopping: 'Shopping',
  nature: 'Nature',
  culture: 'Culture',
  entertainment: 'Entertainment',
  food: 'Food & Dining',
  outdoor: 'Outdoor',
};

export const ACTIVITY_CATEGORY_ICONS: Record<string, string> = {
  attraction: '🏛️',
  restaurant: '🍽️',
  hotel: '🏨',
  transport: '🚗',
  shopping: '🛍️',
  nature: '🌲',
  culture: '🎭',
  entertainment: '🎪',
  food: '🍜',
  outdoor: '🏕️',
};

export const ALERT_PRIORITY_COLORS: Record<number, string> = {
  1: '#EF4444', // Critical - Red
  2: '#F97316', // High - Orange
  3: '#F59E0B', // Medium - Yellow
  4: '#3B82F6', // Low - Blue
};

export const DEFAULT_ACTIVITY_DURATION = 60; // minutes
export const MAX_ACTIVITIES_PER_DAY = 10;
export const GPS_UPDATE_INTERVAL_ACTIVE = 10000; // 10 seconds
export const GPS_UPDATE_INTERVAL_BACKGROUND = 300000; // 5 minutes
