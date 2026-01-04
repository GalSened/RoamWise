/**
 * Trip Domain Types
 * Core data models for trip planning and management
 */

export enum TripState {
  DRAFT = 'draft',
  PLANNED = 'planned',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AlertPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
}

export type ActivityCategory =
  | 'attraction'
  | 'restaurant'
  | 'hotel'
  | 'transport'
  | 'shopping'
  | 'nature'
  | 'culture'
  | 'entertainment'
  | 'food'
  | 'outdoor';

export type ActivityStatus = 'pending' | 'current' | 'completed' | 'skipped';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Activity {
  id: string;
  name: string;
  location: LatLng;
  address?: string;
  scheduledTime: Date;
  duration: number; // minutes
  category: ActivityCategory;
  status: ActivityStatus;
  description?: string;
  notes?: string;
  rating?: number;
  priceLevel?: 1 | 2 | 3 | 4;
  cost?: number; // estimated cost in local currency
  imageUrl?: string;
}

export interface TripDay {
  id: string;
  dayNumber: number;
  date: Date;
  theme?: string;
  activities: Activity[];
  notes?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  destinationLocation: LatLng;
  state: TripState;
  startDate: Date;
  endDate: Date;
  travelers: number;
  days: TripDay[];
  coverImageUrl?: string;
  preferences?: TripPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripAlert {
  id: string;
  tripId: string;
  priority: AlertPriority;
  type: 'weather' | 'traffic' | 'closure' | 'recommendation' | 'timing';
  title: string;
  message: string;
  actionLabel?: string;
  actionPayload?: unknown;
  createdAt: Date;
  dismissedAt?: Date;
}

export interface CreateTripInput {
  name: string;
  destination: string;
  destinationLocation: LatLng;
  startDate: Date;
  endDate: Date;
  preferences?: TripPreferences;
}

export interface TripPreferences {
  pace: 'relaxed' | 'moderate' | 'intensive';
  budget: 'budget' | 'moderate' | 'luxury';
  interests: ActivityCategory[];
  mustVisit?: string[];
  avoidCategories?: ActivityCategory[];
}
