/**
 * AI Planner Service (Mock)
 *
 * Simulates conversational AI logic for the travel co-pilot.
 * Uses keyword detection to guide the conversation flow and
 * generate route waypoints based on user preferences.
 *
 * In production, this would connect to an LLM API (e.g., GPT, Claude).
 */

import {
  AIPlannerResponse,
  AIPlannerContext,
  RouteWaypoint,
  ConversationState,
  ChatMessage,
} from '../../types';
import { fetchWeather } from './weather';

// Sample destinations database (mock data)
const SAMPLE_DESTINATIONS: Record<string, { lat: number; lng: number; type: RouteWaypoint['type'] }> = {
  // Nature reserves
  'ein gedi': { lat: 31.4601, lng: 35.3878, type: 'destination' },
  'masada': { lat: 31.3156, lng: 35.3536, type: 'attraction' },
  'dead sea': { lat: 31.5, lng: 35.5, type: 'destination' },
  'galilee': { lat: 32.8, lng: 35.5, type: 'destination' },
  'golan heights': { lat: 33.0, lng: 35.8, type: 'destination' },
  'negev': { lat: 30.8, lng: 34.8, type: 'destination' },
  'eilat': { lat: 29.5577, lng: 34.9519, type: 'destination' },

  // Cities
  'tel aviv': { lat: 32.0853, lng: 34.7818, type: 'destination' },
  'jerusalem': { lat: 31.7683, lng: 35.2137, type: 'destination' },
  'haifa': { lat: 32.7940, lng: 34.9896, type: 'destination' },
};

// Sample food places
const FOOD_PLACES: Record<string, RouteWaypoint[]> = {
  pizza: [
    { id: 'pizza-1', name: 'Pizza Hut Express', lat: 32.08, lng: 34.80, type: 'food', duration: 30 },
    { id: 'pizza-2', name: 'Dominos Roadside', lat: 31.89, lng: 35.01, type: 'food', duration: 25 },
  ],
  burger: [
    { id: 'burger-1', name: 'Moses Burgers', lat: 32.07, lng: 34.79, type: 'food', duration: 35 },
    { id: 'burger-2', name: 'Burger Ranch', lat: 31.90, lng: 35.00, type: 'food', duration: 30 },
  ],
  sushi: [
    { id: 'sushi-1', name: 'Yakimono Express', lat: 32.08, lng: 34.78, type: 'food', duration: 40 },
  ],
  local: [
    { id: 'local-1', name: 'Roadside Hummus', lat: 31.95, lng: 35.05, type: 'food', duration: 25 },
    { id: 'local-2', name: 'Druze Pita House', lat: 32.50, lng: 35.40, type: 'food', duration: 30 },
  ],
  falafel: [
    { id: 'falafel-1', name: 'Abu Hassan Falafel', lat: 32.05, lng: 34.76, type: 'food', duration: 20 },
  ],
};

// Rest stops
const REST_STOPS: RouteWaypoint[] = [
  { id: 'rest-1', name: 'Latrun Rest Area', lat: 31.8389, lng: 34.9789, type: 'rest', duration: 15 },
  { id: 'rest-2', name: 'Dead Sea Viewpoint', lat: 31.55, lng: 35.40, type: 'rest', duration: 20 },
  { id: 'rest-3', name: 'Arad Junction Stop', lat: 31.2589, lng: 35.2126, type: 'rest', duration: 15 },
];

// Fuel stations
const FUEL_STATIONS: RouteWaypoint[] = [
  { id: 'fuel-1', name: 'Paz Gas Station', lat: 31.85, lng: 35.00, type: 'fuel', duration: 10 },
  { id: 'fuel-2', name: 'Sonol Highway', lat: 31.60, lng: 35.25, type: 'fuel', duration: 10 },
];

/**
 * Create initial planner context
 */
export function createPlannerContext(): AIPlannerContext {
  return {
    destination: undefined,
    preferences: {},
    waypoints: [],
    conversationStage: 'greeting',
  };
}

/**
 * Generate unique ID for messages/waypoints
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect keywords in user message
 */
function detectKeywords(message: string): {
  destination?: string;
  food?: string;
  wantsRest?: boolean;
  wantsFuel?: boolean;
  isReady?: boolean;
  isGreeting?: boolean;
  wantsWeather?: boolean;
} {
  const lower = message.toLowerCase();

  // Detect greetings
  const greetings = ['hi', 'hello', 'hey', 'shalom', 'good morning', 'good afternoon'];
  const isGreeting = greetings.some(g => lower.includes(g));

  // Detect destinations
  let destination: string | undefined;
  for (const dest of Object.keys(SAMPLE_DESTINATIONS)) {
    if (lower.includes(dest)) {
      destination = dest;
      break;
    }
  }

  // Detect food preferences
  let food: string | undefined;
  const foodKeywords = ['pizza', 'burger', 'sushi', 'local', 'falafel', 'hummus'];
  for (const f of foodKeywords) {
    if (lower.includes(f)) {
      food = f === 'hummus' ? 'local' : f;
      break;
    }
  }

  // Detect hunger
  const hungerKeywords = ['hungry', 'food', 'eat', 'starving', 'lunch', 'dinner', 'snack'];
  const isHungry = hungerKeywords.some(k => lower.includes(k)) && !food;

  // Detect rest need
  const restKeywords = ['tired', 'rest', 'break', 'stop', 'stretch'];
  const wantsRest = restKeywords.some(k => lower.includes(k));

  // Detect fuel need
  const fuelKeywords = ['fuel', 'gas', 'petrol', 'refuel'];
  const wantsFuel = fuelKeywords.some(k => lower.includes(k));

  // Detect ready to go
  const readyKeywords = ['ready', 'go', 'start', 'navigate', 'done', "let's go", 'finished'];
  const isReady = readyKeywords.some(k => lower.includes(k));

  // Detect weather query
  const weatherKeywords = ['weather', 'rain', 'sunny', 'temperature', 'forecast'];
  const wantsWeather = weatherKeywords.some(k => lower.includes(k));

  return {
    destination,
    food: isHungry ? 'ask' : food,
    wantsRest,
    wantsFuel,
    isReady,
    isGreeting,
    wantsWeather,
  };
}

/**
 * Process user message and generate AI response
 */
export async function processMessage(
  userMessage: string,
  context: AIPlannerContext
): Promise<{ response: AIPlannerResponse; updatedContext: AIPlannerContext }> {
  const keywords = detectKeywords(userMessage);
  const updatedContext = { ...context };

  // Handle greetings
  if (keywords.isGreeting && context.conversationStage === 'greeting') {
    updatedContext.conversationStage = 'destination';
    return {
      response: {
        message: "Hey there! I'm your travel co-pilot. Where would you like to go today?",
        type: 'question',
      },
      updatedContext,
    };
  }

  // Handle weather queries
  if (keywords.wantsWeather && context.destination) {
    const dest = SAMPLE_DESTINATIONS[context.destination.toLowerCase()];
    if (dest) {
      const weather = await fetchWeather(dest.lat, dest.lng);
      return {
        response: {
          message: `Weather at ${context.destination}: ${weather.temp}°C, ${weather.description}`,
          type: 'weather',
          weather,
        },
        updatedContext,
      };
    }
  }

  // Handle destination setting
  if (keywords.destination) {
    const dest = SAMPLE_DESTINATIONS[keywords.destination];
    updatedContext.destination = keywords.destination;
    updatedContext.conversationStage = 'preferences';
    updatedContext.waypoints = [
      { id: generateId(), name: 'Current Location', lat: 32.08, lng: 34.78, type: 'start' },
      {
        id: generateId(),
        name: keywords.destination.charAt(0).toUpperCase() + keywords.destination.slice(1),
        lat: dest.lat,
        lng: dest.lng,
        type: 'destination'
      },
    ];

    return {
      response: {
        message: `Great choice! ${keywords.destination.charAt(0).toUpperCase() + keywords.destination.slice(1)} is beautiful. Would you like to stop for food along the way?`,
        type: 'question',
        options: ['Yes, I\'m hungry', 'No, let\'s go direct'],
        route: updatedContext.waypoints,
      },
      updatedContext,
    };
  }

  // Handle food request (asking what type)
  if (keywords.food === 'ask') {
    return {
      response: {
        message: 'What are you in the mood for?',
        type: 'question',
        options: ['Pizza', 'Burger', 'Sushi', 'Local Food'],
      },
      updatedContext,
    };
  }

  // Handle specific food selection
  if (keywords.food && keywords.food !== 'ask') {
    const foodPlaces = FOOD_PLACES[keywords.food] || FOOD_PLACES.local;
    const selectedPlace = foodPlaces[Math.floor(Math.random() * foodPlaces.length)];

    // Insert food stop before destination
    const destIndex = updatedContext.waypoints.findIndex(w => w.type === 'destination');
    if (destIndex > 0) {
      updatedContext.waypoints.splice(destIndex, 0, selectedPlace);
      updatedContext.preferences.foodType = keywords.food;
    }

    updatedContext.conversationStage = 'refinement';

    return {
      response: {
        message: `I've added ${selectedPlace.name} to your route. Anything else? Need a rest stop or fuel?`,
        type: 'suggestion',
        options: ['Add rest stop', 'Add fuel stop', 'Ready to go!'],
        route: updatedContext.waypoints,
      },
      updatedContext,
    };
  }

  // Handle rest stop
  if (keywords.wantsRest) {
    const restStop = REST_STOPS[Math.floor(Math.random() * REST_STOPS.length)];
    const destIndex = updatedContext.waypoints.findIndex(w => w.type === 'destination');
    if (destIndex > 0) {
      updatedContext.waypoints.splice(destIndex, 0, restStop);
      updatedContext.preferences.restStops = true;
    }

    return {
      response: {
        message: `Added ${restStop.name} for a quick break. Need anything else?`,
        type: 'suggestion',
        options: ['Add food stop', 'Add fuel', 'Ready to go!'],
        route: updatedContext.waypoints,
      },
      updatedContext,
    };
  }

  // Handle fuel stop
  if (keywords.wantsFuel) {
    const fuelStop = FUEL_STATIONS[Math.floor(Math.random() * FUEL_STATIONS.length)];
    const destIndex = updatedContext.waypoints.findIndex(w => w.type === 'destination');
    if (destIndex > 0) {
      updatedContext.waypoints.splice(destIndex, 0, fuelStop);
      updatedContext.preferences.fuelStops = true;
    }

    return {
      response: {
        message: `Added ${fuelStop.name} to refuel. Anything else before we start?`,
        type: 'suggestion',
        options: ['Add food stop', 'Add rest stop', 'Ready to go!'],
        route: updatedContext.waypoints,
      },
      updatedContext,
    };
  }

  // Handle ready to go
  if (keywords.isReady && updatedContext.waypoints.length >= 2) {
    updatedContext.conversationStage = 'ready';

    // Fetch weather for destination
    const dest = updatedContext.waypoints.find(w => w.type === 'destination');
    let weather;
    if (dest) {
      weather = await fetchWeather(dest.lat, dest.lng);
    }

    const stopCount = updatedContext.waypoints.length - 2; // Exclude start and destination
    const stopText = stopCount > 0
      ? `with ${stopCount} stop${stopCount > 1 ? 's' : ''}`
      : 'direct route';

    return {
      response: {
        message: `Your route is ready! ${updatedContext.destination?.charAt(0).toUpperCase()}${updatedContext.destination?.slice(1)} ${stopText}. Tap "Navigate" to start!`,
        type: 'route',
        route: updatedContext.waypoints,
        weather,
      },
      updatedContext,
    };
  }

  // Handle "no" responses
  if (userMessage.toLowerCase().includes('no') || userMessage.toLowerCase().includes('direct')) {
    if (context.conversationStage === 'preferences' && context.waypoints.length >= 2) {
      updatedContext.conversationStage = 'ready';

      return {
        response: {
          message: "Direct route it is! Tap 'Navigate' when you're ready to go.",
          type: 'route',
          route: updatedContext.waypoints,
        },
        updatedContext,
      };
    }
  }

  // Default fallback
  if (context.conversationStage === 'greeting') {
    updatedContext.conversationStage = 'destination';
    return {
      response: {
        message: "Where would you like to go today? Try saying a destination like 'Ein Gedi' or 'Dead Sea'.",
        type: 'question',
      },
      updatedContext,
    };
  }

  return {
    response: {
      message: "I didn't quite catch that. Try telling me where you'd like to go, or if you need food, rest, or fuel along the way.",
      type: 'info',
    },
    updatedContext,
  };
}

/**
 * Create welcome message for new conversations
 */
export function createWelcomeMessage(): ChatMessage {
  return {
    id: generateId(),
    role: 'assistant',
    content: "\u200EHey! I'm your travel co-pilot. Where would you like to go today?",
    timestamp: new Date(),
    metadata: {
      type: 'question',
    },
  };
}

export default {
  processMessage,
  createPlannerContext,
  createWelcomeMessage,
};
