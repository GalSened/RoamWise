/**
 * Planning Wizard Types
 *
 * Type definitions for the 5-step trip planning wizard:
 * 1. Destination - Choose where to go
 * 2. Dates - Select travel dates
 * 3. Preferences - Set trip preferences
 * 4. AI Generation - Generate itinerary
 * 5. Edit - Review and customize
 */

// =============================================================================
// WIZARD STATE
// =============================================================================

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  isGenerating: boolean;
  error: string | null;
}

export const WIZARD_STEPS: { step: WizardStep; title: string; icon: string }[] = [
  { step: 1, title: 'יעד', icon: 'location-outline' },
  { step: 2, title: 'תאריכים', icon: 'calendar-outline' },
  { step: 3, title: 'העדפות', icon: 'options-outline' },
  { step: 4, title: 'יצירת AI', icon: 'sparkles-outline' },
  { step: 5, title: 'עריכה', icon: 'create-outline' },
];

// =============================================================================
// STEP 1: DESTINATION
// =============================================================================

export interface Destination {
  id: string;
  name: string;
  nameHebrew?: string;
  country: string;
  countryCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  imageUrl?: string;
  description?: string;
  tags?: string[];
  matchScore?: number; // AI match percentage
  bestTime?: string;
  avgBudget?: 'budget' | 'mid-range' | 'luxury';
  suggestedDuration?: number; // days
}

export interface DestinationSearchResult {
  destinations: Destination[];
  aiSuggestions: Destination[];
  trending: Destination[];
}

export type DestinationSelectionMode = 'search' | 'suggestions' | 'surprise';

// =============================================================================
// STEP 2: DATES
// =============================================================================

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateInsight {
  type: 'weather' | 'crowding' | 'price' | 'event' | 'holiday';
  title: string;
  description: string;
  impact: 'positive' | 'neutral' | 'negative';
  icon: string;
}

export interface DateSelectionState {
  range: DateRange | null;
  isFlexible: boolean;
  flexibilityDays?: number;
  insights: DateInsight[];
}

// =============================================================================
// STEP 3: PREFERENCES
// =============================================================================

export type TripPace = 'relaxed' | 'moderate' | 'active' | 'intense';

export type TripInterest =
  | 'culture'
  | 'food'
  | 'nature'
  | 'adventure'
  | 'nightlife'
  | 'shopping'
  | 'history'
  | 'art'
  | 'beach'
  | 'mountains'
  | 'photography'
  | 'wellness';

export type BudgetLevel = 'budget' | 'mid-range' | 'luxury';

export interface TripPreferences {
  pace: TripPace;
  interests: TripInterest[];
  budgetLevel: BudgetLevel;
  dailyBudget?: number; // in local currency
  accommodationType?: 'hostel' | 'hotel' | 'apartment' | 'luxury';
  transportMode?: 'walking' | 'public' | 'car' | 'mixed';
  walkingTolerance?: 'low' | 'medium' | 'high'; // km per day
  wakeUpTime?: 'early' | 'normal' | 'late';
  mustSee?: string[]; // specific places user wants to visit
  avoid?: string[]; // things to avoid
  accessibility?: {
    wheelchairAccessible?: boolean;
    limitedMobility?: boolean;
    childFriendly?: boolean;
    petFriendly?: boolean;
  };
  dietary?: string[];
}

export const TRIP_INTERESTS: { id: TripInterest; label: string; icon: string; emoji: string }[] = [
  { id: 'culture', label: 'תרבות', icon: 'library-outline', emoji: '🏛️' },
  { id: 'food', label: 'אוכל', icon: 'restaurant-outline', emoji: '🍽️' },
  { id: 'nature', label: 'טבע', icon: 'leaf-outline', emoji: '🌿' },
  { id: 'adventure', label: 'הרפתקאות', icon: 'flash-outline', emoji: '⚡' },
  { id: 'nightlife', label: 'חיי לילה', icon: 'moon-outline', emoji: '🌙' },
  { id: 'shopping', label: 'קניות', icon: 'bag-outline', emoji: '🛍️' },
  { id: 'history', label: 'היסטוריה', icon: 'time-outline', emoji: '📜' },
  { id: 'art', label: 'אמנות', icon: 'color-palette-outline', emoji: '🎨' },
  { id: 'beach', label: 'חוף', icon: 'sunny-outline', emoji: '🏖️' },
  { id: 'mountains', label: 'הרים', icon: 'triangle-outline', emoji: '⛰️' },
  { id: 'photography', label: 'צילום', icon: 'camera-outline', emoji: '📷' },
  { id: 'wellness', label: 'בריאות', icon: 'fitness-outline', emoji: '🧘' },
];

export const PACE_OPTIONS: { id: TripPace; label: string; description: string; icon: string }[] = [
  { id: 'relaxed', label: 'רגוע', description: '2-3 פעילויות ביום', icon: 'cafe-outline' },
  { id: 'moderate', label: 'מאוזן', description: '4-5 פעילויות ביום', icon: 'walk-outline' },
  { id: 'active', label: 'פעיל', description: '6-7 פעילויות ביום', icon: 'bicycle-outline' },
  { id: 'intense', label: 'אינטנסיבי', description: '8+ פעילויות ביום', icon: 'rocket-outline' },
];

export const BUDGET_OPTIONS: { id: BudgetLevel; label: string; description: string; icon: string }[] = [
  { id: 'budget', label: 'חסכוני', description: 'אירוח ואוכל בסיסי', icon: 'wallet-outline' },
  { id: 'mid-range', label: 'בינוני', description: 'מלונות ומסעדות טובים', icon: 'card-outline' },
  { id: 'luxury', label: 'יוקרתי', description: 'חוויות פרימיום', icon: 'diamond-outline' },
];

// =============================================================================
// STEP 4: AI GENERATION
// =============================================================================

export interface GenerationProgress {
  stage: 'analyzing' | 'searching' | 'optimizing' | 'finalizing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  subMessage?: string;
}

export interface AIInsight {
  type: 'tip' | 'warning' | 'highlight';
  title: string;
  description: string;
  icon: string;
}

// =============================================================================
// STEP 5: ITINERARY
// =============================================================================

export type ActivityType =
  | 'attraction'
  | 'restaurant'
  | 'cafe'
  | 'museum'
  | 'park'
  | 'shopping'
  | 'transport'
  | 'accommodation'
  | 'event'
  | 'free_time'
  | 'custom';

export interface Activity {
  id: string;
  type: ActivityType;
  name: string;
  nameHebrew?: string;
  description?: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  duration: number; // minutes
  startTime?: string; // HH:mm format
  endTime?: string;
  cost?: number;
  rating?: number;
  imageUrl?: string;
  tags?: string[];
  notes?: string;
  isOptional?: boolean;
  aiMatchScore?: number;
  openingHours?: {
    open: string;
    close: string;
  };
  bookingUrl?: string;
  phoneNumber?: string;
  website?: string;
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  date: Date;
  title?: string;
  activities: Activity[];
  totalDuration: number; // minutes
  totalCost: number;
  notes?: string;
  weather?: {
    condition: string;
    temperature: number;
    icon: string;
  };
}

export interface Itinerary {
  id: string;
  name: string;
  destination: Destination;
  dateRange: DateRange;
  preferences: TripPreferences;
  days: DayPlan[];
  totalCost: number;
  totalDistance: number; // km
  insights: AIInsight[];
  createdAt: Date;
  updatedAt: Date;
  isPublished?: boolean;
}

export interface ItineraryStats {
  totalDays: number;
  totalActivities: number;
  totalCost: number;
  totalWalkingDistance: number;
  averageActivitiesPerDay: number;
  topInterests: TripInterest[];
}

// =============================================================================
// WIZARD CONTEXT
// =============================================================================

export interface PlanningWizardContext {
  // Step 1
  destination: Destination | null;
  destinationMode: DestinationSelectionMode;

  // Step 2
  dateRange: DateRange | null;
  isFlexibleDates: boolean;
  dateInsights: DateInsight[];

  // Step 3
  preferences: TripPreferences;

  // Step 4
  generationProgress: GenerationProgress | null;

  // Step 5
  itinerary: Itinerary | null;

  // Meta
  wizardState: WizardState;
}

export const DEFAULT_PREFERENCES: TripPreferences = {
  pace: 'moderate',
  interests: [],
  budgetLevel: 'mid-range',
  walkingTolerance: 'medium',
  wakeUpTime: 'normal',
};

export const createInitialWizardContext = (): PlanningWizardContext => ({
  destination: null,
  destinationMode: 'search',
  dateRange: null,
  isFlexibleDates: false,
  dateInsights: [],
  preferences: { ...DEFAULT_PREFERENCES },
  generationProgress: null,
  itinerary: null,
  wizardState: {
    currentStep: 1,
    completedSteps: [],
    isGenerating: false,
    error: null,
  },
});

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface WizardProgressProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  onStepPress?: (step: WizardStep) => void;
}

export interface DestinationSearchProps {
  selectedDestination: Destination | null;
  onSelect: (destination: Destination) => void;
  onSurpriseMe: () => void;
}

export interface DateRangePickerProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange) => void;
  isFlexible: boolean;
  onFlexibilityChange: (flexible: boolean) => void;
  insights: DateInsight[];
  destination?: Destination;
}

export interface PreferencesFormProps {
  preferences: TripPreferences;
  onPreferencesChange: (preferences: TripPreferences) => void;
  destination?: Destination;
  dateRange?: DateRange;
}

export interface AIGenerationStepProps {
  destination: Destination;
  dateRange: DateRange;
  preferences: TripPreferences;
  onComplete: (itinerary: Itinerary) => void;
  onError: (error: string) => void;
}

export interface ItineraryEditorProps {
  itinerary: Itinerary;
  onItineraryChange: (itinerary: Itinerary) => void;
  onSave: () => void;
  onStartTrip: () => void;
}
