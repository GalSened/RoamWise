/**
 * Chat Types - AI Travel Chat with Action Cards
 *
 * Production-ready types for the AI chat interface with context-aware
 * action cards based on CHAT_PAGE_SPEC.md
 */

import { Place, LatLng, WeatherNow, TripPlan, TripStop } from '../../../types';

// ═══════════════════════════════════════════════════════════════
// ACTION CARD TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Types of action cards that can appear in chat
 */
export type ActionCardType =
  | 'place'
  | 'destination'
  | 'confirmation'
  | 'weather'
  | 'itinerary'
  | 'booking_link'
  | 'navigation';

/**
 * Base action card with common properties
 */
export interface ActionCardBase {
  id: string;
  type: ActionCardType;
  timestamp: Date;
}

/**
 * Place card - displays a single place recommendation
 * Used for restaurants, attractions, hotels, etc.
 */
export interface PlaceCardData extends ActionCardBase {
  type: 'place';
  place: Place;
  matchScore?: number; // 0-100 how well it matches user preferences
  distance?: number; // meters from current location
  estimatedDuration?: number; // minutes to spend there
  aiReasoning?: string; // Why AI recommends this
  actions: PlaceCardAction[];
  isOpen?: boolean;
  priceRange?: string; // $ to $$$$
}

export type PlaceCardAction =
  | 'add_to_trip'
  | 'navigate'
  | 'save'
  | 'view_details'
  | 'call'
  | 'website';

/**
 * Destination card - displays a destination recommendation
 * Used for cities, regions, countries
 */
export interface DestinationCardData extends ActionCardBase {
  type: 'destination';
  name: string;
  country: string;
  heroImage: string;
  matchPercentage: number; // 0-100
  bestTime: string; // "March - May"
  estimatedBudget: {
    min: number;
    max: number;
    currency: string;
  };
  suggestedDuration: string; // "5-7 days"
  highlights: string[];
  weatherPreview?: {
    avgTemp: number;
    condition: string;
  };
  actions: DestinationCardAction[];
}

export type DestinationCardAction =
  | 'start_planning'
  | 'add_to_bucket_list'
  | 'view_details'
  | 'compare';

/**
 * Confirmation card - displays action completion
 */
export interface ConfirmationCardData extends ActionCardBase {
  type: 'confirmation';
  action: ConfirmationAction;
  title: string;
  description: string;
  relatedItem?: {
    type: 'place' | 'destination' | 'trip';
    id: string;
    name: string;
  };
  canUndo: boolean;
  undoExpiry?: Date; // After this time, undo is no longer available
}

export type ConfirmationAction =
  | 'added_to_trip'
  | 'saved_to_bucket_list'
  | 'removed_from_trip'
  | 'trip_created'
  | 'navigation_started';

/**
 * Weather card - inline weather display
 */
export interface WeatherCardData extends ActionCardBase {
  type: 'weather';
  location: string;
  current: WeatherNow;
  forecast?: {
    date: Date;
    high: number;
    low: number;
    condition: string;
    icon: string;
  }[];
  travelAdvice?: string;
}

/**
 * Itinerary card - displays generated or suggested itinerary
 */
export interface ItineraryCardData extends ActionCardBase {
  type: 'itinerary';
  tripId: string;
  destination: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  days: ItineraryDaySummary[];
  totalActivities: number;
  estimatedBudget?: number;
  actions: ItineraryCardAction[];
}

export interface ItineraryDaySummary {
  dayNumber: number;
  date: Date;
  highlights: string[];
  activityCount: number;
}

export type ItineraryCardAction =
  | 'view_full'
  | 'edit'
  | 'share'
  | 'activate';

/**
 * Booking link card - external booking with affiliate tracking
 */
export interface BookingLinkCardData extends ActionCardBase {
  type: 'booking_link';
  provider: string; // "Booking.com", "Airbnb", etc.
  providerLogo: string;
  title: string;
  originalPrice?: number;
  currentPrice: number;
  currency: string;
  discountPercent?: number;
  externalUrl: string;
  disclaimer: string;
}

/**
 * Navigation card - start navigation to destination
 */
export interface NavigationCardData extends ActionCardBase {
  type: 'navigation';
  destination: Place;
  estimatedTime: number; // minutes
  estimatedDistance: number; // meters
  trafficCondition: 'light' | 'moderate' | 'heavy';
  navigationApps: NavigationApp[];
}

export interface NavigationApp {
  id: 'waze' | 'google_maps' | 'apple_maps';
  name: string;
  deepLink: string;
  available: boolean;
}

/**
 * Union type for all action cards
 */
export type ActionCard =
  | PlaceCardData
  | DestinationCardData
  | ConfirmationCardData
  | WeatherCardData
  | ItineraryCardData
  | BookingLinkCardData
  | NavigationCardData;

// ═══════════════════════════════════════════════════════════════
// CONVERSATION CONTEXT
// ═══════════════════════════════════════════════════════════════

/**
 * User context injected into every AI conversation
 */
export interface ConversationContext {
  user: UserContext;
  travelDNA: TravelDNA;
  preferences: TravelPreferences;
  currentState: CurrentStateContext;
  history: TravelHistory;
}

export interface UserContext {
  id: string;
  name: string;
  homeCity: string;
  language: 'he' | 'en';
  memberSince: Date;
  tier: 'free' | 'premium';
}

export interface TravelDNA {
  cultural: number; // 0-100
  culinary: number;
  adventure: number;
  relaxation: number;
  nature: number;
  nightlife: number;
  shopping: number;
  photography: number;
  persona?: string; // AI-generated persona description
}

export interface TravelPreferences {
  pace: 'slow' | 'moderate' | 'fast';
  minRating: number; // 1-5
  cuisines: string[];
  walkingTolerance: 'low' | 'medium' | 'high'; // km per day
  budgetLevel: 'budget' | 'mid-range' | 'luxury';
  accessibility: {
    wheelchairAccessible: boolean;
    childFriendly: boolean;
    petFriendly: boolean;
  };
}

export interface CurrentStateContext {
  location: LatLng | null;
  activeTrip: ActiveTripContext | null;
  todaysPlan: TodaysPlanContext | null;
  timezone: string;
  localTime: Date;
  weather?: WeatherNow;
}

export interface ActiveTripContext {
  tripId: string;
  destination: string;
  currentDay: number;
  totalDays: number;
  nextActivity?: {
    name: string;
    time: Date;
    place: string;
  };
  scheduleStatus: 'on_track' | 'behind' | 'ahead';
}

export interface TodaysPlanContext {
  activities: {
    id: string;
    name: string;
    time: Date;
    status: 'pending' | 'active' | 'completed' | 'skipped';
  }[];
  upcomingCount: number;
  completedCount: number;
}

export interface TravelHistory {
  visitedCountries: string[];
  visitedCities: string[];
  totalTrips: number;
  recentTrips: RecentTripSummary[];
  bucketList: BucketListItem[];
}

export interface RecentTripSummary {
  id: string;
  destination: string;
  date: Date;
  rating?: number;
  favoritePlace?: string;
}

export interface BucketListItem {
  id: string;
  destination: string;
  addedDate: Date;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// CHAT MESSAGE EXTENSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extended chat message with action cards
 */
export interface ExtendedChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
  actionCards?: ActionCard[];
  suggestions?: SuggestionChip[];
  isStreaming?: boolean;
}

export interface ChatMessageMetadata {
  type?: 'question' | 'suggestion' | 'route' | 'weather' | 'info' | 'error';
  options?: string[];
  contextUsed?: string[]; // Which context was used for this response
  toolsCalled?: string[]; // Which AI tools were invoked
  responseTimeMs?: number;
}

/**
 * Suggestion chips - quick action shortcuts
 */
export interface SuggestionChip {
  id: string;
  label: string;
  labelHe?: string; // Hebrew translation
  icon?: string; // Ionicons name
  action: SuggestionAction;
  priority: number; // 1-10, higher = show first
}

export type SuggestionAction =
  | { type: 'send_message'; text: string }
  | { type: 'open_screen'; screen: string; params?: Record<string, unknown> }
  | { type: 'start_planning'; destination?: string }
  | { type: 'show_weather'; location?: string }
  | { type: 'navigate'; placeId: string };

// ═══════════════════════════════════════════════════════════════
// AI GUARDRAILS
// ═══════════════════════════════════════════════════════════════

/**
 * Topics the AI can discuss
 */
export const ALLOWED_TOPICS = [
  'destinations',
  'trip_planning',
  'restaurants',
  'attractions',
  'weather',
  'transportation',
  'budget',
  'language_culture',
  'safety',
  'packing',
  'local_tips',
  'itinerary',
  'accommodations',
  'activities',
] as const;

/**
 * Topics the AI should politely redirect
 */
export const BLOCKED_TOPICS = [
  'tech_coding',
  'homework',
  'business',
  'medical_advice',
  'legal_advice',
  'financial_advice',
  'politics',
  'religion', // Unless about travel customs
  'personal_relationships',
] as const;

export type AllowedTopic = typeof ALLOWED_TOPICS[number];
export type BlockedTopic = typeof BLOCKED_TOPICS[number];

/**
 * Guardrail response for off-topic messages
 */
export interface GuardrailResponse {
  isBlocked: boolean;
  detectedTopic?: BlockedTopic;
  redirectMessage?: string;
  suggestedTopics?: SuggestionChip[];
}

// ═══════════════════════════════════════════════════════════════
// AI TOOLS INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Tools available to the AI during conversation
 */
export interface AIToolDefinition {
  name: AIToolName;
  description: string;
  parameters: Record<string, AIToolParameter>;
  returnsActionCard: boolean;
}

export type AIToolName =
  | 'search_places'
  | 'get_weather'
  | 'get_opening_hours'
  | 'add_to_trip'
  | 'get_active_trip'
  | 'get_user_preferences'
  | 'get_travel_history'
  | 'get_user_location'
  | 'open_navigation'
  | 'search_destinations'
  | 'get_trip_suggestions';

export interface AIToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
}

/**
 * Result of an AI tool invocation
 */
export interface AIToolResult {
  toolName: AIToolName;
  success: boolean;
  data?: unknown;
  actionCard?: ActionCard;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// CHAT SESSION STATE
// ═══════════════════════════════════════════════════════════════

/**
 * Complete chat session state
 */
export interface ChatSession {
  id: string;
  userId: string;
  startedAt: Date;
  lastMessageAt: Date;
  messages: ExtendedChatMessage[];
  context: ConversationContext;
  isActive: boolean;
  metadata: ChatSessionMetadata;
}

export interface ChatSessionMetadata {
  totalMessages: number;
  toolInvocations: number;
  actionCardsShown: number;
  actionsCompleted: number;
  averageResponseTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════
// CALLBACK TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Callbacks for action card interactions
 */
export interface ActionCardCallbacks {
  onAddToTrip: (place: Place, tripId?: string) => Promise<void>;
  onNavigate: (place: Place) => void;
  onSave: (place: Place) => Promise<void>;
  onViewDetails: (place: Place) => void;
  onStartPlanning: (destination: string) => void;
  onAddToBucketList: (destination: string) => Promise<void>;
  onViewItinerary: (tripId: string) => void;
  onUndo: (confirmationId: string) => Promise<boolean>;
  onOpenBookingLink: (url: string, provider: string) => void;
}

/**
 * Callbacks for suggestion chip interactions
 */
export interface SuggestionCallbacks {
  onChipPress: (chip: SuggestionChip) => void;
}
