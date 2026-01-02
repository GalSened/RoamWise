/**
 * Centralized configuration for RoamWise frontend
 * All magic numbers and configuration values should be defined here
 */

// ---- Cache Configuration ----
export const cacheConfig = {
  // Route cache settings
  route: {
    ttlMs: Number(import.meta.env.VITE_ROUTE_CACHE_TTL_MS) || 5 * 60 * 1000, // 5 minutes
    maxEntries: Number(import.meta.env.VITE_CACHE_MAX_ENTRIES) || 500
  },

  // Weather cache settings
  weather: {
    ttlMs: Number(import.meta.env.VITE_WEATHER_CACHE_TTL_MS) || 5 * 60 * 1000, // 5 minutes
    maxEntries: 200
  },

  // Places cache settings
  places: {
    ttlMs: 10 * 60 * 1000, // 10 minutes
    maxEntries: 1000
  }
} as const;

// ---- API Configuration ----
export const apiConfig = {
  // Timeout settings (in milliseconds)
  timeout: {
    default: 10000,    // 10 seconds
    routing: 15000,    // 15 seconds for routing requests
    weather: 8000,     // 8 seconds for weather
    places: 12000,     // 12 seconds for places
    ai: 30000          // 30 seconds for AI operations
  },

  // Retry settings
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000
  },

  // Rate limiting
  rateLimit: {
    maxRequestsPerMinute: 60,
    aiRequestsPerMinute: 10
  }
} as const;

// ---- Weather Thresholds ----
export const weatherConfig = {
  // Scores are 0-1, higher is better
  thresholds: {
    proceed: 0.6,        // Minimum score to recommend proceeding
    delay: 0.4,          // Below this, recommend delay
    cancel: 0.2          // Below this, recommend cancel
  },

  // Scoring weights
  weights: {
    precipitation: 0.4,
    visibility: 0.3,
    temperature: 0.2,
    wind: 0.1
  },

  // Temperature comfort range (Celsius)
  temperature: {
    idealMin: 15,
    idealMax: 25,
    acceptableMin: 5,
    acceptableMax: 35
  },

  // Visibility thresholds (km)
  visibility: {
    excellent: 10,
    good: 5,
    fair: 2,
    poor: 1
  },

  // Wind speed thresholds (km/h)
  wind: {
    calm: 20,
    moderate: 40,
    strong: 60,
    dangerous: 80
  },

  // Precipitation thresholds (mm/h)
  precipitation: {
    none: 0.5,
    light: 2.5,
    moderate: 7.5,
    heavy: 15
  }
} as const;

// ---- Trip Planning Configuration ----
export const planningConfig = {
  // Default trip duration in days
  defaultDurationDays: 1,

  // Maximum stops per day recommendation
  maxStopsPerDay: 10,

  // Maximum trip duration in days
  maxTripDurationDays: 30,

  // Stop duration limits per category (minutes)
  stopDuration: {
    meal: { min: 30, max: 180, default: 60 },
    scenic: { min: 15, max: 120, default: 30 },
    activity: { min: 60, max: 480, default: 120 },
    accommodation: { min: 60, max: 720, default: 480 },
    fuel: { min: 5, max: 30, default: 15 },
    shopping: { min: 30, max: 240, default: 60 },
    cultural: { min: 60, max: 360, default: 120 },
    other: { min: 15, max: 480, default: 60 }
  }
} as const;

// ---- Voice Configuration ----
export const voiceConfig = {
  // Default language
  defaultLanguage: 'he-IL',

  // Speech recognition settings
  recognition: {
    continuous: false,
    interimResults: true,
    maxAlternatives: 3
  },

  // Text-to-speech settings
  tts: {
    rate: 0.9,
    pitch: 1.0,
    volume: 0.8
  }
} as const;

// ---- Map Configuration ----
export const mapConfig = {
  // Default map center (Tel Aviv)
  defaultCenter: {
    lat: 32.0853,
    lng: 34.7818
  },

  // Default zoom levels
  zoom: {
    default: 13,
    city: 14,
    region: 10,
    country: 7
  },

  // Routing checkpoint interval (meters)
  weatherCheckpointInterval: 20000 // 20km
} as const;

// ---- Telemetry Configuration ----
export const telemetryConfig = {
  enabled: import.meta.env.VITE_TELEMETRY_ENABLED !== 'false',
  sampleRate: 1.0, // 100% of events
  batchSize: 10,
  flushIntervalMs: 30000 // 30 seconds
} as const;

// ---- Feature Flags ----
export const featureFlags = {
  enableVoice: true,
  enableAI: true,
  enableWeatherAwareRouting: true,
  enableOfflineMode: true,
  enablePWA: true,
  debugMode: import.meta.env.DEV
} as const;

// Export all configs as default
export default {
  cache: cacheConfig,
  api: apiConfig,
  weather: weatherConfig,
  planning: planningConfig,
  voice: voiceConfig,
  map: mapConfig,
  telemetry: telemetryConfig,
  features: featureFlags
};
