/**
 * ChatContextService - Context Injection for AI Chat
 *
 * Production-ready service that builds conversation context from user data,
 * generates system prompts with guardrails, and manages AI tool definitions.
 *
 * Based on CHAT_PAGE_SPEC.md requirements.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LatLng, WeatherNow, Place, TripPlan } from '../types';
import {
  ConversationContext,
  UserContext,
  TravelDNA,
  TravelPreferences,
  CurrentStateContext,
  TravelHistory,
  SuggestionChip,
  GuardrailResponse,
  ALLOWED_TOPICS,
  BLOCKED_TOPICS,
  AIToolDefinition,
  AIToolName,
} from '../mobile/components/chat/types';

// ═══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  USER_CONTEXT: 'chat_user_context',
  TRAVEL_DNA: 'travel_dna',
  PREFERENCES: 'travel_preferences',
  TRAVEL_HISTORY: 'travel_history',
  CACHED_CONTEXT: 'cached_conversation_context',
} as const;

// ═══════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Build complete conversation context for AI
 */
export async function buildConversationContext(
  currentLocation: LatLng | null,
  currentWeather: WeatherNow | null,
  activeTrip: TripPlan | null
): Promise<ConversationContext> {
  const [userContext, travelDNA, preferences, history] = await Promise.all([
    getUserContext(),
    getTravelDNA(),
    getTravelPreferences(),
    getTravelHistory(),
  ]);

  const currentState = buildCurrentState(
    currentLocation,
    currentWeather,
    activeTrip
  );

  return {
    user: userContext,
    travelDNA,
    preferences,
    currentState,
    history,
  };
}

/**
 * Get user context from storage
 */
async function getUserContext(): Promise<UserContext> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_CONTEXT);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        memberSince: new Date(parsed.memberSince),
      };
    }
  } catch (error) {
    console.warn('Failed to load user context:', error);
  }

  // Return default context for new users
  return {
    id: 'anonymous',
    name: 'Traveler',
    homeCity: 'Tel Aviv',
    language: 'he',
    memberSince: new Date(),
    tier: 'free',
  };
}

/**
 * Get Travel DNA from storage
 */
async function getTravelDNA(): Promise<TravelDNA> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRAVEL_DNA);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load Travel DNA:', error);
  }

  // Default balanced DNA for new users
  return {
    cultural: 50,
    culinary: 50,
    adventure: 50,
    relaxation: 50,
    nature: 50,
    nightlife: 30,
    shopping: 30,
    photography: 50,
    persona: undefined,
  };
}

/**
 * Get travel preferences from storage
 */
async function getTravelPreferences(): Promise<TravelPreferences> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load preferences:', error);
  }

  // Default preferences
  return {
    pace: 'moderate',
    minRating: 4.0,
    cuisines: [],
    walkingTolerance: 'medium',
    budgetLevel: 'mid-range',
    accessibility: {
      wheelchairAccessible: false,
      childFriendly: false,
      petFriendly: false,
    },
  };
}

/**
 * Get travel history from storage
 */
async function getTravelHistory(): Promise<TravelHistory> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRAVEL_HISTORY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        recentTrips: parsed.recentTrips.map((trip: any) => ({
          ...trip,
          date: new Date(trip.date),
        })),
        bucketList: parsed.bucketList.map((item: any) => ({
          ...item,
          addedDate: new Date(item.addedDate),
        })),
      };
    }
  } catch (error) {
    console.warn('Failed to load travel history:', error);
  }

  // Empty history for new users
  return {
    visitedCountries: [],
    visitedCities: [],
    totalTrips: 0,
    recentTrips: [],
    bucketList: [],
  };
}

/**
 * Build current state context
 */
function buildCurrentState(
  location: LatLng | null,
  weather: WeatherNow | null,
  activeTrip: TripPlan | null
): CurrentStateContext {
  const now = new Date();

  return {
    location,
    activeTrip: activeTrip
      ? {
          tripId: activeTrip.id,
          destination: activeTrip.name,
          currentDay: calculateCurrentDay(activeTrip.startDate, now),
          totalDays: calculateTotalDays(activeTrip.startDate, activeTrip.endDate),
          nextActivity: getNextActivity(activeTrip, now),
          scheduleStatus: 'on_track', // TODO: Calculate based on actual schedule
        }
      : null,
    todaysPlan: activeTrip ? buildTodaysPlan(activeTrip, now) : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: now,
    weather: weather || undefined,
  };
}

function calculateCurrentDay(startDate: Date, now: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

function calculateTotalDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function getNextActivity(
  trip: TripPlan,
  now: Date
): { name: string; time: Date; place: string } | undefined {
  for (const stop of trip.stops) {
    if (stop.arrivalTime && new Date(stop.arrivalTime) > now) {
      return {
        name: stop.place.name,
        time: new Date(stop.arrivalTime),
        place: stop.place.address || '',
      };
    }
  }
  return undefined;
}

function buildTodaysPlan(trip: TripPlan, now: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysStops = trip.stops.filter((stop) => {
    if (!stop.arrivalTime) return false;
    const stopDate = new Date(stop.arrivalTime);
    return stopDate >= today && stopDate < tomorrow;
  });

  const activities = todaysStops.map((stop) => ({
    id: stop.id,
    name: stop.place.name,
    time: new Date(stop.arrivalTime!),
    status: 'pending' as const, // TODO: Track actual status
  }));

  return {
    activities,
    upcomingCount: activities.filter((a) => a.time > now).length,
    completedCount: activities.filter((a) => a.status === 'completed').length,
  };
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate system prompt for AI with context and guardrails
 */
export function generateSystemPrompt(context: ConversationContext): string {
  const { user, travelDNA, preferences, currentState, history } = context;

  const locationInfo = currentState.location
    ? `The user's current location is approximately ${currentState.location.lat.toFixed(4)}, ${currentState.location.lng.toFixed(4)}.`
    : 'The user location is not available.';

  const weatherInfo = currentState.weather
    ? `Current weather: ${currentState.weather.temperature}°C, ${currentState.weather.condition}.`
    : '';

  const activeTripInfo = currentState.activeTrip
    ? `The user is currently on Day ${currentState.activeTrip.currentDay} of ${currentState.activeTrip.totalDays} in ${currentState.activeTrip.destination}. Schedule status: ${currentState.activeTrip.scheduleStatus}.`
    : 'The user does not have an active trip.';

  const dnaDescription = describeTravelDNA(travelDNA);
  const historyDescription = describeTravelHistory(history);

  return `You are RoamWise AI, a specialized travel assistant for Israeli travelers. You communicate in ${user.language === 'he' ? 'Hebrew' : 'English'}.

## User Profile
- Name: ${user.name}
- Home City: ${user.homeCity}
- Member since: ${user.memberSince.toLocaleDateString()}
- Account tier: ${user.tier}

## Travel DNA
${dnaDescription}
${travelDNA.persona ? `AI-generated persona: ${travelDNA.persona}` : ''}

## Preferences
- Pace: ${preferences.pace}
- Minimum rating: ${preferences.minRating} stars
- Budget level: ${preferences.budgetLevel}
- Walking tolerance: ${preferences.walkingTolerance}
- Favorite cuisines: ${preferences.cuisines.length > 0 ? preferences.cuisines.join(', ') : 'Not specified'}
- Accessibility needs: ${formatAccessibility(preferences.accessibility)}

## Current Context
${locationInfo}
${weatherInfo}
${activeTripInfo}
- Local time: ${currentState.localTime.toLocaleTimeString(user.language === 'he' ? 'he-IL' : 'en-US')}
- Timezone: ${currentState.timezone}

## Travel History
${historyDescription}

## Your Capabilities
You can help with:
- Destination recommendations based on the user's Travel DNA
- Trip planning and itinerary creation
- Restaurant and attraction suggestions
- Real-time weather information
- Transportation advice
- Budget planning
- Local tips and cultural insights
- Safety information
- Packing suggestions

## Guardrails
You are a travel-only assistant. If asked about topics outside travel (technology, homework, medical advice, legal advice, financial advice, politics, etc.), politely redirect the conversation back to travel topics.

Example redirect: "אני מתמחה רק בנסיעות! 🧳 אבל אשמח לעזור לך לתכנן את הטיול הבא שלך. לאן חלמת לטוס?"

## Response Format
- Be concise and helpful
- Use emojis sparingly and appropriately for travel context
- When recommending places, include ratings, distance, and why it matches the user
- When relevant, offer to add recommendations to the user's trip or bucket list
- Provide action cards when appropriate (places, destinations, confirmations)
- Offer follow-up suggestions as chips

## Important Rules
1. Never make hotel or flight bookings - only provide links to booking platforms
2. Never provide medical, legal, or financial advice
3. Always consider the user's preferences and Travel DNA
4. Be culturally aware and respectful
5. Prioritize safety information when relevant
6. Acknowledge uncertainty rather than making up information`;
}

function describeTravelDNA(dna: TravelDNA): string {
  const traits: string[] = [];

  if (dna.cultural >= 70) traits.push('Loves cultural experiences and museums');
  if (dna.culinary >= 70) traits.push('Passionate about food and local cuisine');
  if (dna.adventure >= 70) traits.push('Seeks adventure and outdoor activities');
  if (dna.relaxation >= 70) traits.push('Values relaxation and wellness');
  if (dna.nature >= 70) traits.push('Drawn to nature and landscapes');
  if (dna.nightlife >= 70) traits.push('Enjoys nightlife and entertainment');
  if (dna.shopping >= 70) traits.push('Likes shopping and markets');
  if (dna.photography >= 70) traits.push('Photography enthusiast');

  if (traits.length === 0) {
    traits.push('Balanced traveler with diverse interests');
  }

  return `Travel style: ${traits.join('. ')}.`;
}

function describeTravelHistory(history: TravelHistory): string {
  if (history.totalTrips === 0) {
    return 'New traveler - no previous trips recorded.';
  }

  const parts: string[] = [];
  parts.push(`${history.totalTrips} trips completed`);
  parts.push(`${history.visitedCountries.length} countries visited`);
  parts.push(`${history.visitedCities.length} cities explored`);

  if (history.bucketList.length > 0) {
    const topBucket = history.bucketList
      .filter((b) => b.priority === 'high')
      .slice(0, 3)
      .map((b) => b.destination);
    if (topBucket.length > 0) {
      parts.push(`Dream destinations: ${topBucket.join(', ')}`);
    }
  }

  return parts.join('. ') + '.';
}

function formatAccessibility(access: TravelPreferences['accessibility']): string {
  const needs: string[] = [];
  if (access.wheelchairAccessible) needs.push('wheelchair accessible');
  if (access.childFriendly) needs.push('child-friendly');
  if (access.petFriendly) needs.push('pet-friendly');
  return needs.length > 0 ? needs.join(', ') : 'None specified';
}

// ═══════════════════════════════════════════════════════════════
// GUARDRAILS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a message should be blocked by guardrails
 */
export function checkGuardrails(message: string): GuardrailResponse {
  const lowerMessage = message.toLowerCase();

  // Check for blocked topics
  const blockedPatterns: Record<string, RegExp[]> = {
    tech_coding: [
      /\b(code|coding|programming|javascript|python|react|api|bug|debug)\b/i,
      /\b(developer|software|algorithm|database|sql)\b/i,
    ],
    homework: [
      /\b(homework|essay|thesis|exam|school|university|math problem)\b/i,
      /\b(solve|calculate|write.*(essay|paper))\b/i,
    ],
    medical_advice: [
      /\b(diagnose|medication|symptoms|disease|treatment|doctor|sick)\b/i,
      /\b(health condition|medical advice|prescription)\b/i,
    ],
    legal_advice: [
      /\b(legal advice|lawsuit|attorney|court|sue|lawyer)\b/i,
      /\b(contract|liability|legal rights)\b/i,
    ],
    financial_advice: [
      /\b(invest|stocks|crypto|trading|portfolio|retirement fund)\b/i,
      /\b(financial planning|stock market|bonds|etf)\b/i,
    ],
    politics: [
      /\b(election|vote|political|politician|party|government policy)\b/i,
      /\b(left wing|right wing|liberal|conservative)\b/i,
    ],
  };

  for (const [topic, patterns] of Object.entries(blockedPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        // Check if it's travel-related context
        const travelContext =
          /\b(travel|trip|vacation|flight|hotel|visa|passport|airport)\b/i.test(
            lowerMessage
          );

        if (!travelContext) {
          return {
            isBlocked: true,
            detectedTopic: topic as any,
            redirectMessage: getRedirectMessage(topic as any),
            suggestedTopics: getRedirectSuggestions(),
          };
        }
      }
    }
  }

  return { isBlocked: false };
}

function getRedirectMessage(topic: string): string {
  const messages: Record<string, string> = {
    tech_coding:
      'אני מתמחה בנסיעות ולא בתכנות 😊 אבל אשמח לעזור לך למצוא יעדים עם סצנת הייטק מעניינת!',
    homework:
      'אני עוזר רק בנושאי טיולים 📚 אבל אם אתה צריך הפסקה מהלימודים - בוא נתכנן לך בריחה!',
    medical_advice:
      'לייעוץ רפואי פנה לרופא 👨‍⚕️ אבל אם אתה מחפש טיפוסי ספא או ריטריטים בריאותיים - אני כאן!',
    legal_advice:
      'לייעוץ משפטי צריך עורך דין. אבל אם יש לך שאלות על ויזות או דרישות כניסה - אני יכול לעזור!',
    financial_advice:
      'אני לא יועץ פיננסי, אבל אני מומחה בתכנון תקציב לטיולים! 💰',
    politics:
      'בואו נשאיר את הפוליטיקה בצד ונתמקד במקומות מדהימים לבקר! 🌍',
  };

  return messages[topic] || 'בוא נדבר על טיולים! לאן חשבת לנסוע?';
}

function getRedirectSuggestions(): SuggestionChip[] {
  return [
    {
      id: 'redirect-1',
      label: 'Plan a trip',
      labelHe: 'תכנון טיול',
      icon: 'airplane',
      action: { type: 'start_planning' },
      priority: 10,
    },
    {
      id: 'redirect-2',
      label: 'Get recommendations',
      labelHe: 'קבל המלצות',
      icon: 'sparkles',
      action: { type: 'send_message', text: 'תמליץ לי על יעד' },
      priority: 9,
    },
    {
      id: 'redirect-3',
      label: 'Check weather',
      labelHe: 'בדוק מזג אוויר',
      icon: 'partly-sunny',
      action: { type: 'show_weather' },
      priority: 8,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// AI TOOLS DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get AI tool definitions for function calling
 */
export function getAIToolDefinitions(): AIToolDefinition[] {
  return [
    {
      name: 'search_places',
      description:
        'Search for places (restaurants, attractions, hotels) near a location',
      parameters: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "best hummus", "museums")',
          required: true,
        },
        location: {
          type: 'object',
          description: 'Coordinates to search near',
          required: false,
        },
        type: {
          type: 'string',
          description: 'Place type filter',
          required: false,
          enum: [
            'restaurant',
            'cafe',
            'attraction',
            'museum',
            'hotel',
            'park',
            'shopping',
          ],
        },
        minRating: {
          type: 'number',
          description: 'Minimum rating (1-5)',
          required: false,
        },
        maxDistance: {
          type: 'number',
          description: 'Maximum distance in meters',
          required: false,
        },
      },
      returnsActionCard: true,
    },
    {
      name: 'get_weather',
      description: 'Get current weather and forecast for a location',
      parameters: {
        location: {
          type: 'object',
          description: 'Coordinates or city name',
          required: true,
        },
        date: {
          type: 'string',
          description: 'Date for forecast (ISO format)',
          required: false,
        },
      },
      returnsActionCard: true,
    },
    {
      name: 'get_opening_hours',
      description: 'Get opening hours for a specific place',
      parameters: {
        placeId: {
          type: 'string',
          description: 'Place ID',
          required: true,
        },
      },
      returnsActionCard: false,
    },
    {
      name: 'add_to_trip',
      description: "Add a place or activity to the user's trip",
      parameters: {
        tripId: {
          type: 'string',
          description: 'Trip ID (optional, uses active trip if not provided)',
          required: false,
        },
        placeId: {
          type: 'string',
          description: 'Place ID to add',
          required: true,
        },
        scheduledTime: {
          type: 'string',
          description: 'Suggested time (ISO format)',
          required: false,
        },
      },
      returnsActionCard: true,
    },
    {
      name: 'get_active_trip',
      description: "Get details of the user's currently active trip",
      parameters: {},
      returnsActionCard: false,
    },
    {
      name: 'search_destinations',
      description:
        'Search for destination recommendations based on preferences',
      parameters: {
        query: {
          type: 'string',
          description: 'Optional search query',
          required: false,
        },
        travelMonth: {
          type: 'string',
          description: 'Preferred travel month',
          required: false,
        },
        budget: {
          type: 'string',
          description: 'Budget level',
          required: false,
          enum: ['budget', 'mid-range', 'luxury'],
        },
        tripLength: {
          type: 'number',
          description: 'Number of days',
          required: false,
        },
      },
      returnsActionCard: true,
    },
    {
      name: 'open_navigation',
      description: 'Open navigation to a destination',
      parameters: {
        placeId: {
          type: 'string',
          description: 'Destination place ID',
          required: true,
        },
        app: {
          type: 'string',
          description: 'Preferred navigation app',
          required: false,
          enum: ['waze', 'google_maps', 'apple_maps'],
        },
      },
      returnsActionCard: true,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT PERSISTENCE
// ═══════════════════════════════════════════════════════════════

/**
 * Save user context to storage
 */
export async function saveUserContext(context: UserContext): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_CONTEXT,
      JSON.stringify(context)
    );
  } catch (error) {
    console.error('Failed to save user context:', error);
  }
}

/**
 * Save Travel DNA to storage
 */
export async function saveTravelDNA(dna: TravelDNA): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRAVEL_DNA, JSON.stringify(dna));
  } catch (error) {
    console.error('Failed to save Travel DNA:', error);
  }
}

/**
 * Save travel preferences to storage
 */
export async function saveTravelPreferences(
  prefs: TravelPreferences
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

/**
 * Update travel history
 */
export async function updateTravelHistory(
  history: TravelHistory
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.TRAVEL_HISTORY,
      JSON.stringify(history)
    );
  } catch (error) {
    console.error('Failed to save travel history:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// SUGGESTION GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate context-aware suggestion chips
 */
export function generateSuggestions(
  context: ConversationContext
): SuggestionChip[] {
  const suggestions: SuggestionChip[] = [];

  // Active trip suggestions
  if (context.currentState.activeTrip) {
    suggestions.push({
      id: 'active-next',
      label: "What's next?",
      labelHe: 'מה הלאה?',
      icon: 'arrow-forward',
      action: { type: 'send_message', text: "What's next on my itinerary?" },
      priority: 10,
    });

    suggestions.push({
      id: 'active-nearby',
      label: 'Nearby places',
      labelHe: 'מקומות קרובים',
      icon: 'location',
      action: { type: 'send_message', text: 'Show me interesting places nearby' },
      priority: 9,
    });
  } else {
    // No active trip suggestions
    suggestions.push({
      id: 'no-trip-plan',
      label: 'Plan a trip',
      labelHe: 'תכנן טיול',
      icon: 'airplane',
      action: { type: 'start_planning' },
      priority: 10,
    });

    suggestions.push({
      id: 'no-trip-inspire',
      label: 'Inspire me',
      labelHe: 'תשכנע אותי',
      icon: 'sparkles',
      action: { type: 'send_message', text: 'Suggest a destination for me' },
      priority: 9,
    });
  }

  // Weather-based suggestions
  if (context.currentState.weather) {
    const temp = context.currentState.weather.temperature;
    if (temp > 30) {
      suggestions.push({
        id: 'weather-hot',
        label: 'Cool down spots',
        labelHe: 'מקומות להתקרר',
        icon: 'snow',
        action: {
          type: 'send_message',
          text: 'Find me cool places to escape the heat',
        },
        priority: 7,
      });
    } else if (temp < 10) {
      suggestions.push({
        id: 'weather-cold',
        label: 'Indoor activities',
        labelHe: 'פעילויות בפנים',
        icon: 'home',
        action: {
          type: 'send_message',
          text: 'Suggest indoor activities for this weather',
        },
        priority: 7,
      });
    }
  }

  // Bucket list suggestions
  if (context.history.bucketList.length > 0) {
    const topBucket = context.history.bucketList.find(
      (b) => b.priority === 'high'
    );
    if (topBucket) {
      suggestions.push({
        id: 'bucket-dream',
        label: `Plan ${topBucket.destination}`,
        labelHe: `תכנן ${topBucket.destination}`,
        icon: 'star',
        action: { type: 'start_planning', destination: topBucket.destination },
        priority: 6,
      });
    }
  }

  // Sort by priority and return top 4
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

export default {
  buildConversationContext,
  generateSystemPrompt,
  checkGuardrails,
  getAIToolDefinitions,
  generateSuggestions,
  saveUserContext,
  saveTravelDNA,
  saveTravelPreferences,
  updateTravelHistory,
};
