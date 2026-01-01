/**
 * AI Planner Service - Multi-Provider Support (OpenAI / Groq)
 *
 * Real conversational AI travel co-pilot.
 * Supports: OpenAI GPT-4o-mini (paid) or Groq llama-3.3-70b (free)
 * Returns structured JSON for routes or clarifying questions.
 */

import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { config } from '../config/env';
import { travelContextManager, type TravelContext } from './TravelContextManager';

// ============================================================================
// AI Provider Configuration
// ============================================================================

// Initialize the appropriate AI client based on config
const aiProvider = config.ai.provider;

// OpenAI client (used when provider is 'openai')
const openai = aiProvider === 'openai' && config.ai.openaiKey
  ? new OpenAI({
      apiKey: config.ai.openaiKey,
      dangerouslyAllowBrowser: true  // PWA prototype - move to backend for production
    })
  : null;

// Groq client (used when provider is 'groq')
const groq = aiProvider === 'groq' && config.ai.groqKey
  ? new Groq({
      apiKey: config.ai.groqKey,
      dangerouslyAllowBrowser: true  // PWA prototype - move to backend for production
    })
  : null;

// Log AI provider status
if (config.app.isDev) {
  if (!config.ai.isConfigured) {
    console.warn(`[aiPlanner] ${aiProvider.toUpperCase()} API key not configured. AI features will not work.`);
  } else {
    console.log(`[aiPlanner] Using ${aiProvider.toUpperCase()} provider`);
  }
}

// Base system prompt for the AI travel agent
const BASE_SYSTEM_PROMPT = `
You are an expert Travel Co-Pilot.
Your goal: create specific, actionable daily itineraries.

PROTOCOL:
1. If the user request is VAGUE (e.g., "I'm hungry", "somewhere nice"), return a JSON with type "question" and ask for clarification with helpful options.
2. If you have enough info to suggest places, generate a ROUTE with real locations.
3. Always respond with valid JSON only. No markdown, no extra text.

RESPONSE SCHEMA (Route):
{
  "type": "route",
  "summary": "A 1-sentence summary of the trip vibe",
  "stops": [
    { "name": "Name of place", "lat": <number>, "lng": <number>, "description": "Short reason to visit", "stopType": "start|destination|food|attraction|rest" }
  ]
}

RESPONSE SCHEMA (Question):
{
  "type": "question",
  "content": "Your clarifying question here",
  "options": ["Option 1", "Option 2", "Option 3"]
}

IMPORTANT:
- Use real coordinates for the user's current location
- Suggest local cuisines and authentic experiences
- Keep routes practical and drivable within a day
`;

/**
 * Build context-aware system prompt based on travel context
 */
function buildSystemPrompt(): string {
  const contextPrompt = travelContextManager.getAIContextPrompt();
  return BASE_SYSTEM_PROMPT + '\n' + contextPrompt;
}

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'start' | 'destination' | 'food' | 'attraction' | 'rest' | 'fuel';
  duration?: number;
  icon?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'question' | 'suggestion' | 'route' | 'weather' | 'info';
    options?: string[];
    route?: RouteWaypoint[];
  };
}

export interface PlannerContext {
  destination?: string;
  preferences: {
    foodType?: string;
    scenicRoute?: boolean;
    restStops?: boolean;
    fuelStops?: boolean;
  };
  waypoints: RouteWaypoint[];
  conversationStage: 'greeting' | 'destination' | 'preferences' | 'refinement' | 'ready';
}

export interface PlannerResponse {
  message: string;
  type: 'question' | 'suggestion' | 'route' | 'info';
  options?: string[];
  route?: RouteWaypoint[];
}

// Sample destinations in Israel
const DESTINATIONS: Record<string, { lat: number; lng: number; description: string }> = {
  'ein gedi': { lat: 31.4500, lng: 35.3833, description: 'Ein Gedi Nature Reserve' },
  'dead sea': { lat: 31.5000, lng: 35.4700, description: 'Dead Sea' },
  'masada': { lat: 31.3156, lng: 35.3533, description: 'Masada National Park' },
  'jerusalem': { lat: 31.7683, lng: 35.2137, description: 'Jerusalem Old City' },
  'tel aviv': { lat: 32.0853, lng: 34.7818, description: 'Tel Aviv Beach' },
  'haifa': { lat: 32.7940, lng: 34.9896, description: 'Haifa & Bahai Gardens' },
  'eilat': { lat: 29.5577, lng: 34.9519, description: 'Eilat Red Sea' },
  'nazareth': { lat: 32.6996, lng: 35.3035, description: 'Nazareth' },
  'akko': { lat: 32.9272, lng: 35.0818, description: 'Akko Old City' },
};

// Sample food places by type
const FOOD_PLACES: Record<string, RouteWaypoint[]> = {
  pizza: [
    { id: 'food-1', name: 'Pizza Station', lat: 31.78, lng: 35.22, type: 'food', icon: 'pizza', duration: 30 },
  ],
  burger: [
    { id: 'food-2', name: 'Burger Ranch', lat: 31.77, lng: 35.21, type: 'food', icon: 'beef', duration: 25 },
  ],
  local: [
    { id: 'food-3', name: 'Hummus Abu Said', lat: 31.76, lng: 35.23, type: 'food', icon: 'utensils', duration: 35 },
  ],
  falafel: [
    { id: 'food-4', name: 'Falafel HaKosem', lat: 32.07, lng: 34.77, type: 'food', icon: 'leaf', duration: 20 },
  ],
};

// Rest stops
const REST_STOPS: RouteWaypoint[] = [
  { id: 'rest-1', name: 'Alon Junction Rest Area', lat: 31.65, lng: 35.15, type: 'rest', icon: 'coffee', duration: 15 },
  { id: 'rest-2', name: 'Dead Sea Overlook', lat: 31.52, lng: 35.38, type: 'rest', icon: 'camera', duration: 10 },
];

// Fuel stations
const FUEL_STATIONS: RouteWaypoint[] = [
  { id: 'fuel-1', name: 'Paz Station', lat: 31.72, lng: 35.20, type: 'fuel', icon: 'fuel', duration: 10 },
  { id: 'fuel-2', name: 'Sonol Gas', lat: 31.55, lng: 35.30, type: 'fuel', icon: 'fuel', duration: 10 },
];

/**
 * Create initial planner context
 */
export function createPlannerContext(): PlannerContext {
  return {
    preferences: {},
    waypoints: [],
    conversationStage: 'greeting',
  };
}

/**
 * Create welcome message
 */
export function createWelcomeMessage(): ChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    content: "\u200EHey! I'm your AI travel co-pilot. Where would you like to go today?",
    timestamp: new Date(),
    metadata: {
      type: 'question',
      options: ['Ein Gedi', 'Dead Sea', 'Masada', 'Jerusalem'],
    },
  };
}

/**
 * Process user message and generate response
 */
export async function processMessage(
  userMessage: string,
  context: PlannerContext
): Promise<{ response: PlannerResponse; updatedContext: PlannerContext }> {
  const message = userMessage.toLowerCase().trim();
  const updatedContext = { ...context };

  // Simulate AI thinking delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

  // Check for destination
  for (const [key, dest] of Object.entries(DESTINATIONS)) {
    if (message.includes(key)) {
      updatedContext.destination = key;
      updatedContext.conversationStage = 'preferences';
      updatedContext.waypoints = [
        { id: 'start-1', name: 'Your Location', lat: 32.08, lng: 34.78, type: 'start' },
        { id: 'dest-1', name: dest.description, lat: dest.lat, lng: dest.lng, type: 'destination' },
      ];

      return {
        response: {
          message: `Great choice! ${dest.description} is beautiful. Want to stop for food along the way?`,
          type: 'question',
          options: ['Pizza', 'Burger', 'Local Food', 'Falafel', 'No thanks'],
        },
        updatedContext,
      };
    }
  }

  // Check for food preferences
  for (const foodType of Object.keys(FOOD_PLACES)) {
    if (message.includes(foodType)) {
      const foodStop = FOOD_PLACES[foodType][0];
      updatedContext.preferences.foodType = foodType;
      updatedContext.waypoints = [
        updatedContext.waypoints[0],
        foodStop,
        ...updatedContext.waypoints.slice(1),
      ];
      updatedContext.conversationStage = 'refinement';

      return {
        response: {
          message: `Added ${foodStop.name} to your route! Need any rest stops or fuel?`,
          type: 'question',
          options: ['Add rest stop', 'Add fuel stop', 'Both', "No, let's go!"],
        },
        updatedContext,
      };
    }
  }

  // Check for rest/fuel
  if (message.includes('rest') || message.includes('both')) {
    updatedContext.preferences.restStops = true;
    const restStop = REST_STOPS[0];
    const insertIndex = Math.max(1, updatedContext.waypoints.length - 1);
    updatedContext.waypoints.splice(insertIndex, 0, restStop);
  }

  if (message.includes('fuel') || message.includes('both')) {
    updatedContext.preferences.fuelStops = true;
    const fuelStop = FUEL_STATIONS[0];
    updatedContext.waypoints.splice(1, 0, fuelStop);
  }

  // Ready to go
  if (message.includes('go') || message.includes('ready') || message.includes('no')) {
    updatedContext.conversationStage = 'ready';
    return {
      response: {
        message: `Your route is ready! ${updatedContext.waypoints.length} stops planned. Tap "Navigate" to start!`,
        type: 'route',
        route: updatedContext.waypoints,
      },
      updatedContext,
    };
  }

  // Hungry/food keywords
  if (message.includes('hungry') || message.includes('food') || message.includes('eat')) {
    return {
      response: {
        message: "I know some great spots! What are you in the mood for?",
        type: 'question',
        options: ['Pizza', 'Burger', 'Local Food', 'Falafel'],
      },
      updatedContext,
    };
  }

  // Tired/rest keywords
  if (message.includes('tired') || message.includes('break')) {
    return {
      response: {
        message: "Let's find you a nice spot to rest. There's a scenic overlook nearby.",
        type: 'suggestion',
        options: ['Add rest stop', 'Keep going'],
      },
      updatedContext,
    };
  }

  // Default response
  return {
    response: {
      message: "Tell me where you'd like to go, and I'll help plan the perfect route!",
      type: 'question',
      options: ['Ein Gedi', 'Dead Sea', 'Masada', 'Jerusalem'],
    },
    updatedContext,
  };
}

/**
 * Get Waze navigation URL
 */
export function getWazeUrl(lat: number, lng: number, label?: string): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Get Google Maps navigation URL
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * OpenAI response types
 */
export interface AIRouteResponse {
  type: 'route';
  summary: string;
  stops: Array<{
    name: string;
    lat: number;
    lng: number;
    description: string;
    stopType?: string;
  }>;
}

export interface AIQuestionResponse {
  type: 'question';
  content: string;
  options?: string[];
}

export type AIResponse = AIRouteResponse | AIQuestionResponse;

/**
 * Interact with AI for travel planning
 * Automatically uses OpenAI or Groq based on config.ai.provider
 *
 * @param userMessage - The user's current message
 * @param history - Previous chat messages for context
 * @returns Parsed AI response (route or question)
 */

// ============================================================================
// Client-Side Security (Defense in Depth)
// ============================================================================

const CLIENT_SECURITY_PATTERNS = {
  promptInjection: [
    /ignore\s*(all\s*)?(previous|prior|above)\s*(instructions?|prompts?|rules?)/i,
    /disregard\s*(all\s*)?(previous|prior)\s*(instructions?|prompts?)/i,
    /forget\s*(all\s*)?(previous|prior|your)\s*(instructions?|prompts?|rules?)/i,
    /override\s*(your|all|the)\s*(instructions?|rules?|constraints?)/i,
    /you\s*are\s*now\s*(a|an|my)\s*(new|different)/i,
    /jailbreak/i,
    /bypass\s*(all\s*)?(filters?|restrictions?|rules?|safety)/i,
    /reveal\s*(your|the)\s*(system|original)\s*prompt/i,
  ],
  securityExploits: [
    /sql\s*injection/i,
    /xss\s*(attack)?/i,
    /how\s*to\s*hack/i,
    /malware/i,
    /ransomware/i,
    /api\s*key/i,
    /password\s*(dump|crack|leak)/i,
  ],
};

/**
 * Check if input contains malicious patterns (client-side validation)
 */
function isInputMalicious(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const normalizedText = text.toLowerCase();
  
  for (const patterns of Object.values(CLIENT_SECURITY_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(normalizedText))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Sanitize user input before sending to AI
 */
function sanitizeUserInput(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '')           // Remove HTML tags
    .replace(/javascript:/gi, '')       // Remove script patterns
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .substring(0, 2000)                 // Limit length
    .trim();
}

export async function interactWithAI(
  userMessage: string,
  history: ChatMessage[]
): Promise<AIResponse> {
  // Client-side security validation (defense in depth)
  const sanitizedMessage = sanitizeUserInput(userMessage);
  
  if (isInputMalicious(sanitizedMessage)) {
    console.warn('[aiPlanner] Blocked potentially malicious input');
    return {
      type: 'question',
      content: "\u200EI'm here to help with travel planning! Where would you like to go?",
      options: ['Ein Gedi', 'Dead Sea', 'Jerusalem', 'Tel Aviv']
    };
  }

  try {
    // Build messages array with context-aware system prompt and history
    const systemPrompt = buildSystemPrompt();
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })),
      { role: 'user', content: sanitizedMessage }
    ];

    let content: string | null = null;

    // Use the appropriate provider
    if (aiProvider === 'groq' && groq) {
      // Groq with llama-3.3-70b-versatile
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1000
      });
      content = completion.choices[0]?.message?.content ?? null;
    } else if (openai) {
      // OpenAI with gpt-4o-mini (default)
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1000
      });
      content = completion.choices[0]?.message?.content ?? null;
    } else {
      throw new Error(`No AI client configured for provider: ${aiProvider}`);
    }

    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content) as AIResponse;
    return parsed;

  } catch (error) {
    console.error('AI Error:', error);
    // Return a fallback question response
    return {
      type: 'question',
      content: "\u200ESorry, I had trouble connecting. Can you try again?",
      options: ['Try again', 'Start over']
    };
  }
}

/**
 * Convert AI route stops to RouteWaypoint format
 */
export function convertAIStopsToWaypoints(
  stops: AIRouteResponse['stops'],
  startLocation?: { lat: number; lng: number }
): RouteWaypoint[] {
  const waypoints: RouteWaypoint[] = [];

  // Add start location if provided
  if (startLocation) {
    waypoints.push({
      id: 'start-0',
      name: 'Your Location',
      lat: startLocation.lat,
      lng: startLocation.lng,
      type: 'start'
    });
  }

  // Convert each stop
  stops.forEach((stop, index) => {
    const typeMap: Record<string, RouteWaypoint['type']> = {
      start: 'start',
      destination: 'destination',
      food: 'food',
      attraction: 'attraction',
      rest: 'rest'
    };

    waypoints.push({
      id: `stop-${index + 1}`,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      type: typeMap[stop.stopType || 'attraction'] || 'attraction'
    });
  });

  // Mark last stop as destination if not already
  if (waypoints.length > 1 && waypoints[waypoints.length - 1].type !== 'destination') {
    waypoints[waypoints.length - 1].type = 'destination';
  }

  return waypoints;
}
