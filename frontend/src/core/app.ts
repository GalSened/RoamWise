import { themeProvider } from './theme/ThemeProvider';
import { updateManager } from './update/UpdateManager';
import { createGoogleProviders } from '../providers/google/maps';
import { createOpenWeatherProvider } from '../providers/weather/openweather';
import { createOSRMProvider } from '../providers/routing/osrm';
import { createWeatherAwareRouter } from '../features/routing/WeatherAwareRouter';
import { createAIOrchestrator } from './ai/AIOrchestrator';
import { planningManager } from '../features/planning/PlanningManager';
import { voiceManager } from '../features/voice/VoiceManager';
import { navigationManager } from '../features/navigation/NavigationManager';
import { MapManager } from '../features/map/MapManager';
import { UIManager } from '../features/ui/UIManager';
import { telemetry } from '../lib/telemetry';

interface AppConfig {
  googleMapsApiKey?: string;
  openWeatherApiKey?: string;
  routingProvider: 'google' | 'osrm';
  weatherProvider: 'openweather';
}

class TravelingApp {
  private config: AppConfig;
  private providers: any = {};
  private managers: any = {};
  private aiOrchestrator: any;
  private isInitialized = false;

  constructor() {
    this.config = {
      googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      openWeatherApiKey: import.meta.env.VITE_OPENWEATHER_API_KEY,
      routingProvider: (import.meta.env.VITE_ROUTING_PROVIDER as 'google' | 'osrm') || 'google',
      weatherProvider: 'openweather'
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    telemetry.track('app_initialization_started');
    
    try {
      // Initialize core systems
      await this.initializeTheme();
      await this.initializeProviders();
      await this.initializeManagers();
      await this.initializeUI();
      await this.setupEventHandlers();
      
      this.isInitialized = true;
      telemetry.track('app_initialization_completed');
      
      // Check for updates after initialization
      setTimeout(() => updateManager.checkForUpdates(), 2000);
      
    } catch (error) {
      telemetry.track('app_initialization_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async initializeTheme(): Promise<void> {
    // Theme provider auto-initializes, just ensure it's ready
    const theme = themeProvider.getEffectiveTheme();
    telemetry.track('theme_initialized', { theme });
  }

  private async initializeProviders(): Promise<void> {
    // Google Maps providers
    if (this.config.googleMapsApiKey) {
      const googleProviders = createGoogleProviders(this.config.googleMapsApiKey);
      this.providers.googlePlaces = googleProviders.places;
      this.providers.googleRouting = googleProviders.routing;
    }

    // Routing provider
    if (this.config.routingProvider === 'google' && this.providers.googleRouting) {
      this.providers.routing = this.providers.googleRouting;
    } else {
      this.providers.routing = createOSRMProvider();
    }

    // Weather provider
    if (this.config.openWeatherApiKey) {
      this.providers.weather = createOpenWeatherProvider(this.config.openWeatherApiKey);
    }

    // Weather-aware routing
    if (this.providers.routing && this.providers.weather) {
      this.providers.weatherAwareRouter = createWeatherAwareRouter(
        this.providers.routing,
        this.providers.weather
      );
    }

    // Places provider fallback
    this.providers.places = this.providers.googlePlaces || {
      search: async () => [],
      details: async () => ({}),
      photos: async () => []
    };

    telemetry.track('providers_initialized', {
      routing: this.config.routingProvider,
      weather: this.config.weatherProvider,
      places: this.providers.googlePlaces ? 'google' : 'fallback'
    });
  }

  private async initializeManagers(): Promise<void> {
    // AI Orchestrator
    if (this.providers.places && this.providers.routing && this.providers.weather) {
      this.aiOrchestrator = createAIOrchestrator(
        this.providers.places,
        this.providers.routing,
        this.providers.weather
      );
    }

    // Map Manager
    this.managers.map = new MapManager({
      providers: this.providers
    });

    // UI Manager
    this.managers.ui = new UIManager({
      planningManager,
      voiceManager,
      navigationManager,
      aiOrchestrator: this.aiOrchestrator,
      providers: this.providers
    });

    telemetry.track('managers_initialized');
  }

  private async initializeUI(): Promise<void> {
    await this.managers.ui.initialize();
    await this.managers.map.initialize();
    
    telemetry.track('ui_initialized');
  }

  private async setupEventHandlers(): Promise<void> {
    // Theme change handler
    themeProvider.on('theme-changed', (data) => {
      this.managers.map?.updateTheme(data.theme);
      telemetry.track('theme_changed', { theme: data.theme });
    });

    // Update notifications
    updateManager.on('update-available', (updateInfo) => {
      this.managers.ui?.showUpdateNotification(updateInfo);
      telemetry.track('update_notification_shown', updateInfo);
    });

    // Voice intent handling
    voiceManager.on('intent-recognized', async (intent) => {
      if (this.aiOrchestrator) {
        try {
          const result = await this.aiOrchestrator.processVoiceIntent(intent, {
            location: this.managers.map?.getCurrentLocation(),
            userPreferences: await this.getUserPreferences()
          });
          
          this.managers.ui?.handleAIResult(intent.type, result);
        } catch (error) {
          console.error('Voice intent processing failed:', error);
          this.managers.ui?.showError('Failed to process voice command');
        }
      }
    });

    // Navigation events
    navigationManager.on('navigation-started', () => {
      this.managers.ui?.enterNavigationMode();
    });

    navigationManager.on('navigation-stopped', () => {
      this.managers.ui?.exitNavigationMode();
    });

    // Global error handling
    window.addEventListener('error', (event) => {
      this.managers.ui?.showError('An unexpected error occurred');
    });

    telemetry.track('event_handlers_setup');
  }

  private async getUserPreferences(): Promise<Record<string, any>> {
    // Load user preferences from storage
    return {
      language: navigator.language,
      units: 'metric',
      categories: ['meal', 'scenic', 'activity']
    };
  }

  // Public API
  getProviders() {
    return this.providers;
  }

  getManagers() {
    return this.managers;
  }

  getAIOrchestrator() {
    return this.aiOrchestrator;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Global app instance
const app = new TravelingApp();

// Export initialization function
export async function initializeApp(): Promise<void> {
  await app.initialize();
}

// Export app instance for debugging
if (import.meta.env.DEV) {
  (window as any).__travelingApp = app;
}

export { app };