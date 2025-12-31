/**
 * Centralized Environment Configuration
 *
 * All environment variables are validated and typed here.
 * Services should import from this file instead of accessing import.meta.env directly.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface AppConfig {
  /** Application metadata */
  app: {
    version: string;
    environment: 'development' | 'production' | 'test';
    isDev: boolean;
    isProd: boolean;
  };

  /** OpenAI API configuration */
  openai: {
    apiKey: string;
    isConfigured: boolean;
  };

  /** Google Maps API configuration */
  googleMaps: {
    apiKey: string;
    isConfigured: boolean;
  };

  /** OpenWeather API configuration */
  openWeather: {
    apiKey: string;
    isConfigured: boolean;
  };

  /** Groq AI provider configuration */
  groq: {
    apiKey: string;
    isConfigured: boolean;
  };

  /** AI provider configuration (switch between OpenAI and Groq) */
  ai: {
    provider: 'openai' | 'groq';
    openaiKey: string;
    groqKey: string;
    isConfigured: boolean;
  };

  /** Backend API configuration */
  api: {
    baseUrl: string;
    proxyUrl: string;
  };

  /** Routing configuration */
  routing: {
    provider: 'google' | 'osrm';
  };

  /** Telemetry configuration */
  telemetry: {
    enabled: boolean;
    endpoint: string;
  };
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Get an environment variable with optional fallback
 */
function getEnvVar(key: string, fallback: string = ''): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value : fallback;
}

/**
 * Get a boolean environment variable
 */
function getEnvBool(key: string, fallback: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

/**
 * Check if an API key is configured (non-empty and not a placeholder)
 */
function isKeyConfigured(key: string): boolean {
  if (!key) return false;
  if (key.startsWith('sk-your') || key.startsWith('your_')) return false;
  if (key === 'placeholder' || key === 'PLACEHOLDER') return false;
  return key.length > 10;
}

/**
 * Validate critical configuration and log warnings
 */
function validateConfig(config: AppConfig): void {
  const warnings: string[] = [];

  if (!config.ai.isConfigured) {
    const providerName = config.ai.provider === 'openai' ? 'VITE_OPENAI_API_KEY' : 'VITE_GROQ_API_KEY';
    warnings.push(`${providerName} is not configured for AI provider "${config.ai.provider}" - AI features will not work`);
  }

  if (!config.googleMaps.isConfigured) {
    warnings.push('VITE_GOOGLE_MAPS_API_KEY is not configured - Google Maps features will be limited');
  }

  if (!config.openWeather.isConfigured) {
    warnings.push('VITE_OPENWEATHER_API_KEY is not configured - Weather features will be limited');
  }

  // Log warnings in development
  if (config.app.isDev && warnings.length > 0) {
    console.warn('[Config] Environment warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }
}

// ============================================================================
// Configuration Object
// ============================================================================

const openaiKey = getEnvVar('VITE_OPENAI_API_KEY');
const googleMapsKey = getEnvVar('VITE_GOOGLE_MAPS_API_KEY');
const openWeatherKey = getEnvVar('VITE_OPENWEATHER_API_KEY');
const groqKey = getEnvVar('VITE_GROQ_API_KEY');
const aiProvider = getEnvVar('VITE_AI_PROVIDER', 'openai') as 'openai' | 'groq';

/**
 * Application configuration object
 * Import this in services instead of accessing import.meta.env directly
 */
export const config: AppConfig = {
  app: {
    version: getEnvVar('VITE_APP_VERSION', '2.0.0'),
    environment: import.meta.env.MODE as 'development' | 'production' | 'test',
    isDev: import.meta.env.DEV === true,
    isProd: import.meta.env.PROD === true,
  },

  openai: {
    apiKey: openaiKey,
    isConfigured: isKeyConfigured(openaiKey),
  },

  googleMaps: {
    apiKey: googleMapsKey,
    isConfigured: isKeyConfigured(googleMapsKey),
  },

  openWeather: {
    apiKey: openWeatherKey,
    isConfigured: isKeyConfigured(openWeatherKey),
  },

  groq: {
    apiKey: groqKey,
    isConfigured: isKeyConfigured(groqKey),
  },

  ai: {
    provider: aiProvider,
    openaiKey: openaiKey,
    groqKey: groqKey,
    isConfigured: aiProvider === 'openai'
      ? isKeyConfigured(openaiKey)
      : isKeyConfigured(groqKey),
  },

  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL', 'https://roamwise-proxy-971999716773.us-central1.run.app'),
    proxyUrl: getEnvVar('VITE_PROXY_URL', 'https://roamwise-proxy-971999716773.us-central1.run.app'),
  },

  routing: {
    provider: (getEnvVar('VITE_ROUTING_PROVIDER', 'google') as 'google' | 'osrm'),
  },

  telemetry: {
    enabled: getEnvBool('VITE_TELEMETRY_ENABLED', false),
    endpoint: getEnvVar('VITE_TELEMETRY_ENDPOINT', '/api/telemetry'),
  },
};

// Validate configuration on load
validateConfig(config);

// ============================================================================
// Exports
// ============================================================================

export default config;

/**
 * Check if all required API keys are configured
 */
export function isFullyConfigured(): boolean {
  return config.ai.isConfigured;
}

/**
 * Get a safe display version of the config (API keys masked)
 */
export function getSafeConfig(): Record<string, unknown> {
  const maskKey = (key: string) => key ? `${key.slice(0, 8)}...${key.slice(-4)}` : '(not set)';

  return {
    app: config.app,
    openai: {
      apiKey: maskKey(config.openai.apiKey),
      isConfigured: config.openai.isConfigured,
    },
    googleMaps: {
      apiKey: maskKey(config.googleMaps.apiKey),
      isConfigured: config.googleMaps.isConfigured,
    },
    openWeather: {
      apiKey: maskKey(config.openWeather.apiKey),
      isConfigured: config.openWeather.isConfigured,
    },
    groq: {
      apiKey: maskKey(config.groq.apiKey),
      isConfigured: config.groq.isConfigured,
    },
    ai: {
      provider: config.ai.provider,
      openaiKey: maskKey(config.ai.openaiKey),
      groqKey: maskKey(config.ai.groqKey),
      isConfigured: config.ai.isConfigured,
    },
    api: config.api,
    routing: config.routing,
    telemetry: config.telemetry,
  };
}
