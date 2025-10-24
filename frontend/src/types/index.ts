// Core Types
export interface LatLng {
  lat: number;
  lng: number;
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

// Place Types
export interface Place {
  id: string;
  name: string;
  address?: string;
  location: LatLng;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types?: string[];
  openNow?: boolean;
  photos?: PhotoRef[];
  website?: string;
  phoneNumber?: string;
}

export interface PlaceDetail extends Place {
  formattedAddress: string;
  openingHours?: {
    openNow: boolean;
    periods: OpeningPeriod[];
    weekdayText: string[];
  };
  reviews?: Review[];
  vicinity?: string;
}

export interface PhotoRef {
  url: string;
  width: number;
  height: number;
  attributions?: string[];
}

export interface OpeningPeriod {
  open: { day: number; time: string };
  close?: { day: number; time: string };
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  time: number;
}

// Route Types
export interface Route {
  legs: RouteLeg[];
  overview: {
    polyline: string;
    bounds: Bounds;
    duration: number;
    distance: number;
  };
  warnings?: string[];
  summary?: string;
}

export interface RouteLeg {
  start: LatLng;
  end: LatLng;
  duration: number;
  distance: number;
  steps: RouteStep[];
  polyline: string;
}

export interface RouteStep {
  instruction: string;
  duration: number;
  distance: number;
  start: LatLng;
  end: LatLng;
  polyline: string;
  maneuver?: string;
}

// Weather Types
export interface WeatherNow {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  visibility: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  uvIndex: number;
  condition: string;
  icon: string;
  isDaylight: boolean;
}

export interface WeatherForecast {
  hourly: WeatherHour[];
  daily: WeatherDay[];
}

export interface WeatherHour {
  time: Date;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  icon: string;
}

export interface WeatherDay {
  date: Date;
  temperatureMax: number;
  temperatureMin: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  condition: string;
  icon: string;
  sunrise: Date;
  sunset: Date;
}

// Trip Planning Types
export interface TripPlan {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  stops: TripStop[];
  route?: Route;
  metadata: {
    created: Date;
    updated: Date;
    version: number;
  };
}

export interface TripStop {
  id: string;
  place: Place;
  arrivalTime?: Date;
  departureTime?: Date;
  duration?: number; // minutes
  notes?: string;
  category: StopCategory;
  priority: number; // 1-5
  weatherDependent?: boolean;
}

export type StopCategory = 
  | 'meal'
  | 'scenic'
  | 'activity'
  | 'accommodation'
  | 'fuel'
  | 'shopping'
  | 'cultural'
  | 'other';

// AI Types
export interface PlanningConstraints {
  maxDrivingTime?: number; // minutes
  budget?: { min: number; max: number };
  categories?: StopCategory[];
  avoidTolls?: boolean;
  weatherAware?: boolean;
  accessibility?: boolean;
  groupSize?: number;
  hasChildren?: boolean;
}

export interface AIRecommendation {
  place: Place;
  score: number;
  reasoning: string;
  category: StopCategory;
  estimatedDuration: number;
  weatherFit: number; // 0-1
  detourTime: number; // minutes
}

// Voice Types
export interface VoiceIntent {
  type: 'plan_create' | 'plan_update' | 'search' | 'navigate' | 'weather';
  confidence: number;
  parameters: Record<string, any>;
  original: string;
}

// Provider Types
export interface RoutingProvider {
  route(input: {
    origin: LatLng;
    destination: LatLng;
    via?: LatLng[];
    mode?: 'car' | 'bike' | 'walk';
    avoidTolls?: boolean;
    departTime?: Date;
  }): Promise<Route>;
}

export interface PlacesProvider {
  search(
    query: string,
    options?: {
      near?: LatLng;
      type?: string;
      openNow?: boolean;
      radius?: number;
    }
  ): Promise<Place[]>;
  details(placeId: string): Promise<PlaceDetail>;
  photos(placeId: string, maxPhotos?: number): Promise<PhotoRef[]>;
}

export interface WeatherProvider {
  getCurrent(lat: number, lng: number): Promise<WeatherNow>;
  getForecast(lat: number, lng: number, at?: Date): Promise<WeatherForecast>;
}

// Telemetry Types
export interface TelemetryEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  sessionId?: string;
  userId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp?: number;
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Update Types
export interface AppVersion {
  version: string;
  buildDate: string;
  features: string[];
  fixes: string[];
  breaking?: string[];
}

export interface UpdateInfo {
  available: boolean;
  current: string;
  latest: string;
  releaseNotes?: AppVersion;
  urgent?: boolean;
}

// Additional types for weather-aware routing
export interface WeatherData {
  temperature: number;
  conditions: string;
  icon: string;
  precipitation?: number;
  windSpeed?: number;
  humidity?: number;
  pressure?: number;
  visibility?: number;
}

export interface RouteOptions {
  mode?: 'car' | 'bike' | 'walk';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  routePreference?: 'fastest' | 'shortest' | 'scenic';
  departTime?: Date;
  via?: LatLng[];
}

// Additional interfaces for the app