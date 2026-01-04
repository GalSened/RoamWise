/**
 * User Domain Types
 * Core data models for user profile and preferences
 */

export enum TravelerLevel {
  NEWBIE = 'newbie',
  EXPLORER = 'explorer',
  ADVENTURER = 'adventurer',
  GLOBETROTTER = 'globetrotter',
  WANDERER = 'wanderer',
  LEGEND = 'legend',
}

export interface TravelDNA {
  cultural: number;    // 0-100
  culinary: number;
  adventure: number;
  relaxation: number;
  nightlife: number;
  nature: number;
  shopping: number;
}

export interface UserPreferences {
  language: 'en' | 'he';
  theme: 'light' | 'dark' | 'system';
  pace: 'relaxed' | 'moderate' | 'intensive';
  budget: 'budget' | 'moderate' | 'luxury';
  notifications: boolean;
  locationSharing: boolean;
}

export interface UserStats {
  tripsCompleted: number;
  countriesVisited: string[];
  continentsVisited: string[];
  totalTravelDays: number;
  totalDistance: number; // km
  activitiesCompleted: number;
  achievements: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number; // 0-100
  category: 'trips' | 'exploration' | 'social' | 'special';
}

export interface BucketListItem {
  id: string;
  destination: string;
  location?: { lat: number; lng: number };
  addedAt: Date;
  completedAt?: Date;
  notes?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  level: TravelerLevel;
  xp: number;
  travelDNA: TravelDNA;
  preferences: UserPreferences;
  stats: UserStats;
  bucketList: BucketListItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  language?: 'en' | 'he';
  permissionsGranted: {
    location: boolean;
    notifications: boolean;
  };
  initialPreferencesSet: boolean;
}
