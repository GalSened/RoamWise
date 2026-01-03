/**
 * Profile Components Types
 *
 * V2 Profile Page type definitions for Travel DNA, Achievements,
 * Bucket List, and AI-powered features.
 */

/**
 * Traveler Level System
 * Based on experience score thresholds
 */
export enum TravelerLevel {
  NEWBIE = 'newbie',
  EXPLORER = 'explorer',
  ADVENTURER = 'adventurer',
  GLOBETROTTER = 'globetrotter',
  WANDERER = 'wanderer',
  LEGEND = 'legend',
}

export const LEVEL_THRESHOLDS: Record<TravelerLevel, { min: number; max: number; title: string; icon: string }> = {
  [TravelerLevel.NEWBIE]: { min: 0, max: 29, title: 'מטייל חדש', icon: '🌱' },
  [TravelerLevel.EXPLORER]: { min: 30, max: 99, title: 'חוקר', icon: '🔍' },
  [TravelerLevel.ADVENTURER]: { min: 100, max: 299, title: 'הרפתקן', icon: '🏔️' },
  [TravelerLevel.GLOBETROTTER]: { min: 300, max: 599, title: 'גלובטרוטר', icon: '🌍' },
  [TravelerLevel.WANDERER]: { min: 600, max: 999, title: 'נווד', icon: '🧭' },
  [TravelerLevel.LEGEND]: { min: 1000, max: Infinity, title: 'אגדה', icon: '👑' },
};

/**
 * Travel DNA - 7-Dimension Traveler Style Profile
 */
export interface TravelStyleDimensions {
  /** 0-100: Museums, history, architecture */
  cultural: number;
  /** 0-100: Local food, restaurants, markets */
  culinary: number;
  /** 0-100: Hiking, sports, extreme activities */
  adventure: number;
  /** 0-100: Beaches, spas, slow travel */
  relaxation: number;
  /** 0-100: Bars, clubs, nightlife */
  nightlife: number;
  /** 0-100: Parks, hiking, wildlife */
  nature: number;
  /** 0-100: Markets, malls, souvenirs */
  shopping: number;
}

export interface BehaviorInsight {
  category: string;
  insight: string;
  confidence: number;
}

export interface TravelerPersona {
  title: string;
  description: string;
  matchingDestinations: string[];
}

export interface TravelDNA {
  styles: TravelStyleDimensions;
  behaviorInsights: BehaviorInsight[];
  persona: TravelerPersona;
  confidence: number;
  analyzedTrips: number;
  analyzedActivities: number;
  lastUpdated: Date;
}

/**
 * Achievement System
 */
export type AchievementCategory = 'exploration' | 'activity' | 'social' | 'planning' | 'special';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementCondition {
  type: string;
  threshold: number;
  comparison: 'gte' | 'eq' | 'lte';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  condition: AchievementCondition;
  progressType: 'count' | 'boolean';
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
  progress: number;
  isNew?: boolean;
}

/**
 * Predefined Achievements
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Exploration
  {
    id: 'first_trip',
    name: 'צעד ראשון',
    description: 'השלם את הטיול הראשון שלך',
    icon: '👣',
    category: 'exploration',
    rarity: 'common',
    condition: { type: 'trips_completed', threshold: 1, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'continent_collector',
    name: 'אספן יבשות',
    description: 'בקר ב-3 יבשות שונות',
    icon: '🌍',
    category: 'exploration',
    rarity: 'epic',
    condition: { type: 'continents_visited', threshold: 3, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'city_hopper',
    name: 'קופץ ערים',
    description: 'בקר ב-10 ערים שונות',
    icon: '🏙️',
    category: 'exploration',
    rarity: 'rare',
    condition: { type: 'cities_visited', threshold: 10, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'country_explorer',
    name: 'חוקר מדינות',
    description: 'בקר ב-5 מדינות שונות',
    icon: '🗺️',
    category: 'exploration',
    rarity: 'rare',
    condition: { type: 'countries_visited', threshold: 5, comparison: 'gte' },
    progressType: 'count',
  },
  // Activity
  {
    id: 'culture_vulture',
    name: 'חובב תרבות',
    description: 'בקר ב-20 מוזיאונים',
    icon: '🎨',
    category: 'activity',
    rarity: 'rare',
    condition: { type: 'museums_visited', threshold: 20, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'foodie',
    name: 'פודי',
    description: 'דרג 50 מסעדות',
    icon: '🍽️',
    category: 'activity',
    rarity: 'rare',
    condition: { type: 'restaurants_rated', threshold: 50, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'photographer',
    name: 'צלם',
    description: 'צלם 100 תמונות בטיולים',
    icon: '📸',
    category: 'activity',
    rarity: 'common',
    condition: { type: 'photos_taken', threshold: 100, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'early_bird',
    name: 'ציפור מוקדמת',
    description: 'התחל פעילות לפני 7 בבוקר',
    icon: '🌅',
    category: 'activity',
    rarity: 'common',
    condition: { type: 'early_activities', threshold: 1, comparison: 'gte' },
    progressType: 'boolean',
  },
  // Social
  {
    id: 'trip_sharer',
    name: 'משתף טיולים',
    description: 'שתף 5 טיולים',
    icon: '📤',
    category: 'social',
    rarity: 'common',
    condition: { type: 'trips_shared', threshold: 5, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'reviewer',
    name: 'מבקר',
    description: 'כתוב 10 ביקורות',
    icon: '✍️',
    category: 'social',
    rarity: 'common',
    condition: { type: 'reviews_written', threshold: 10, comparison: 'gte' },
    progressType: 'count',
  },
  // Planning
  {
    id: 'planner',
    name: 'מתכנן',
    description: 'תכנן 5 טיולים מלאים',
    icon: '📋',
    category: 'planning',
    rarity: 'common',
    condition: { type: 'trips_planned', threshold: 5, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'ai_collaborator',
    name: 'שותף AI',
    description: 'השתמש ב-AI לתכנון 10 פעמים',
    icon: '🤖',
    category: 'planning',
    rarity: 'rare',
    condition: { type: 'ai_plans_created', threshold: 10, comparison: 'gte' },
    progressType: 'count',
  },
  // Special
  {
    id: 'marathon_traveler',
    name: 'מרתוניסט',
    description: 'הלך 100 ק״מ בסך הכל',
    icon: '🏃',
    category: 'special',
    rarity: 'epic',
    condition: { type: 'total_distance_km', threshold: 100, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'night_owl',
    name: 'ינשוף לילה',
    description: 'סיים פעילות אחרי חצות',
    icon: '🦉',
    category: 'special',
    rarity: 'rare',
    condition: { type: 'late_activities', threshold: 1, comparison: 'gte' },
    progressType: 'boolean',
  },
  {
    id: 'world_traveler',
    name: 'אזרח העולם',
    description: 'בקר ב-20 מדינות',
    icon: '🌐',
    category: 'special',
    rarity: 'legendary',
    condition: { type: 'countries_visited', threshold: 20, comparison: 'gte' },
    progressType: 'count',
  },
  {
    id: 'perfect_trip',
    name: 'טיול מושלם',
    description: 'השלם טיול עם 100% פעילויות',
    icon: '⭐',
    category: 'special',
    rarity: 'epic',
    condition: { type: 'perfect_trips', threshold: 1, comparison: 'gte' },
    progressType: 'boolean',
  },
];

/**
 * Bucket List System
 */
export type BucketListItemStatus = 'dream' | 'researching' | 'planning' | 'booked' | 'completed';

export interface BucketListItem {
  id: string;
  type: 'destination' | 'experience' | 'achievement';
  title: string;
  description?: string;
  imageUrl?: string;
  status: BucketListItemStatus;
  priority: 1 | 2 | 3; // 1 = highest
  targetDate?: Date;
  notes?: string;
  aiEnrichment?: {
    bestTimeToVisit?: string;
    estimatedBudget?: string;
    matchScore?: number;
    tips?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * World Map - Visited Countries/Cities
 */
export type VisitStatus = 'visited' | 'planned' | 'wishlist';

export interface VisitedPlace {
  id: string;
  type: 'country' | 'city';
  name: string;
  code?: string; // ISO country code or city identifier
  status: VisitStatus;
  visitedAt?: Date;
  tripIds?: string[];
}

/**
 * Travel Insights
 */
export type InsightType = 'pattern' | 'achievement' | 'recommendation' | 'milestone';

export interface TravelInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  icon: string;
  data?: Record<string, unknown>;
  generatedAt: Date;
}

/**
 * Memories System
 */
export interface Memory {
  id: string;
  tripId: string;
  type: 'photo' | 'note' | 'milestone';
  title?: string;
  content?: string;
  imageUrl?: string;
  location?: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  date: Date;
  isFavorite: boolean;
}

export interface MemoryTrigger {
  type: 'anniversary' | 'this_day' | 'milestone';
  memory: Memory;
  message: string;
}

/**
 * AI Daily Greeting
 */
export interface AIGreeting {
  message: string;
  type: 'morning' | 'afternoon' | 'evening' | 'special';
  contextual?: {
    upcomingTrip?: string;
    anniversary?: string;
    achievement?: string;
  };
  generatedAt: Date;
  expiresAt: Date;
}

/**
 * Complete User Profile (V2)
 */
export interface UserProfileV2 {
  // Basic Info
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  joinedAt: Date;

  // Travel Stats
  stats: {
    totalTrips: number;
    countriesVisited: number;
    citiesVisited: number;
    totalDistanceKm: number;
    totalDays: number;
    photosCount: number;
    reviewsCount: number;
  };

  // Level & Score
  level: TravelerLevel;
  experienceScore: number;

  // Travel DNA
  travelDNA?: TravelDNA;

  // Collections
  achievements: UserAchievement[];
  bucketList: BucketListItem[];
  visitedPlaces: VisitedPlace[];
  memories: Memory[];

  // Insights
  insights: TravelInsight[];

  // Preferences (from existing)
  preferences: {
    vegetarian: boolean;
    avoidStairs: boolean;
    walkingPace: 'slow' | 'moderate' | 'fast';
    notifications: boolean;
    language: 'he' | 'en';
    currency: string;
    measurementUnit: 'metric' | 'imperial';
  };
}

/**
 * Helper function to get level from experience score
 */
export function getLevelFromScore(score: number): TravelerLevel {
  if (score >= 1000) return TravelerLevel.LEGEND;
  if (score >= 600) return TravelerLevel.WANDERER;
  if (score >= 300) return TravelerLevel.GLOBETROTTER;
  if (score >= 100) return TravelerLevel.ADVENTURER;
  if (score >= 30) return TravelerLevel.EXPLORER;
  return TravelerLevel.NEWBIE;
}

/**
 * Helper function to get level info
 */
export function getLevelInfo(level: TravelerLevel) {
  return LEVEL_THRESHOLDS[level];
}

/**
 * Helper function to calculate experience progress to next level
 */
export function getLevelProgress(score: number): { current: number; next: number; percentage: number } {
  const currentLevel = getLevelFromScore(score);
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel];

  const levels = Object.values(TravelerLevel);
  const currentIndex = levels.indexOf(currentLevel);
  const nextLevel = levels[currentIndex + 1];

  if (!nextLevel) {
    return { current: score, next: currentThreshold.max, percentage: 100 };
  }

  const nextThreshold = LEVEL_THRESHOLDS[nextLevel];
  const progress = score - currentThreshold.min;
  const range = nextThreshold.min - currentThreshold.min;
  const percentage = Math.min(100, Math.round((progress / range) * 100));

  return { current: score, next: nextThreshold.min, percentage };
}
