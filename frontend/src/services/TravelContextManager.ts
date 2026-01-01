/**
 * TravelContextManager - Manages travel context and determines user's travel mode
 * Compares current location with user's configured home base
 */

import locationService, { LocationInfo } from './LocationService';

export type TravelMode = 'home' | 'domestic' | 'international';

export interface TravelContext {
  isHome: boolean;
  currentLocation: LocationInfo | null;
  homeCountry: string;
  homeCity: string;
  lastDetected: Date | null;
  travelMode: TravelMode;
}

// Storage keys
const HOME_COUNTRY_KEY = 'traveling-home-country';
const HOME_CITY_KEY = 'traveling-home-city';
const CONTEXT_KEY = 'traveling-context';

// Default home base (Israel)
const DEFAULT_HOME_COUNTRY = 'IL';
const DEFAULT_HOME_CITY = '';

class TravelContextManager {
  private static instance: TravelContextManager;
  private context: TravelContext;

  private constructor() {
    // Initialize with stored or default values
    this.context = this.loadContext();
  }

  static getInstance(): TravelContextManager {
    if (!TravelContextManager.instance) {
      TravelContextManager.instance = new TravelContextManager();
    }
    return TravelContextManager.instance;
  }

  /**
   * Load context from localStorage
   */
  private loadContext(): TravelContext {
    try {
      const stored = localStorage.getItem(CONTEXT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          lastDetected: parsed.lastDetected ? new Date(parsed.lastDetected) : null,
        };
      }
    } catch {
      // Ignore parse errors
    }

    return {
      isHome: true,
      currentLocation: null,
      homeCountry: this.getHomeCountry(),
      homeCity: this.getHomeCity(),
      lastDetected: null,
      travelMode: 'home',
    };
  }

  /**
   * Save context to localStorage
   */
  private saveContext(): void {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(this.context));
  }

  /**
   * Get configured home country code
   */
  getHomeCountry(): string {
    return localStorage.getItem(HOME_COUNTRY_KEY) || DEFAULT_HOME_COUNTRY;
  }

  /**
   * Set home country code
   */
  setHomeCountry(countryCode: string): void {
    localStorage.setItem(HOME_COUNTRY_KEY, countryCode.toUpperCase());
    this.context.homeCountry = countryCode.toUpperCase();
    this.updateTravelMode();
    this.saveContext();
  }

  /**
   * Get configured home city
   */
  getHomeCity(): string {
    return localStorage.getItem(HOME_CITY_KEY) || DEFAULT_HOME_CITY;
  }

  /**
   * Set home city
   */
  setHomeCity(city: string): void {
    localStorage.setItem(HOME_CITY_KEY, city);
    this.context.homeCity = city;
    this.updateTravelMode();
    this.saveContext();
  }

  /**
   * Determine travel mode based on current location vs home
   */
  private updateTravelMode(): void {
    const { currentLocation, homeCountry, homeCity } = this.context;

    if (!currentLocation) {
      this.context.travelMode = 'home';
      this.context.isHome = true;
      return;
    }

    const currentCountry = currentLocation.countryCode;
    const currentCity = currentLocation.city;

    // International: different country
    if (currentCountry !== homeCountry) {
      this.context.travelMode = 'international';
      this.context.isHome = false;
      return;
    }

    // If home city is configured and different, it's domestic travel
    if (homeCity && currentCity.toLowerCase() !== homeCity.toLowerCase()) {
      this.context.travelMode = 'domestic';
      this.context.isHome = false;
      return;
    }

    // At home
    this.context.travelMode = 'home';
    this.context.isHome = true;
  }

  /**
   * Detect location and update context
   */
  async refreshContext(): Promise<TravelContext> {
    try {
      const location = await locationService.detectLocation();
      this.context.currentLocation = location;
      this.context.lastDetected = new Date();
      this.context.homeCountry = this.getHomeCountry();
      this.context.homeCity = this.getHomeCity();
      this.updateTravelMode();
      this.saveContext();

      console.log('[TravelContextManager] Context updated:', this.context.travelMode);
      return this.context;
    } catch (error) {
      console.warn('[TravelContextManager] Failed to refresh context:', error);
      // Return current context (may have cached location)
      return this.context;
    }
  }

  /**
   * Get current context without refreshing
   */
  getContext(): TravelContext {
    return { ...this.context };
  }

  /**
   * Check if user is currently traveling (not at home)
   */
  isTraveling(): boolean {
    return !this.context.isHome;
  }

  /**
   * Get travel mode
   */
  getTravelMode(): TravelMode {
    return this.context.travelMode;
  }

  /**
   * Generate greeting message based on context
   */
  getGreeting(userName: string, t: (key: string, params?: Record<string, string>) => string): {
    title: string;
    subtitle: string;
    icon: string;
  } {
    const { travelMode, currentLocation } = this.context;

    if (!currentLocation) {
      return {
        title: t('greeting.welcome_home', { name: userName }),
        subtitle: t('greeting.plan_next'),
        icon: '👋',
      };
    }

    switch (travelMode) {
      case 'international':
        return {
          title: t('greeting.youre_in', { city: currentLocation.city }),
          subtitle: t('greeting.exploring', { country: currentLocation.country }),
          icon: '✈️',
        };

      case 'domestic':
        return {
          title: t('greeting.youre_in', { city: currentLocation.city }),
          subtitle: t('greeting.find_nearby'),
          icon: '🚗',
        };

      case 'home':
      default:
        return {
          title: t('greeting.welcome_home', { name: userName }),
          subtitle: t('greeting.plan_next'),
          icon: '🏠',
        };
    }
  }

  /**
   * Get AI system prompt context based on travel mode
   */
  getAIContextPrompt(): string {
    const { travelMode, currentLocation, homeCountry } = this.context;

    const countryNames: Record<string, string> = {
      IL: 'Israel',
      US: 'United States',
      GB: 'United Kingdom',
      FR: 'France',
      DE: 'Germany',
      IT: 'Italy',
      ES: 'Spain',
      JP: 'Japan',
      AU: 'Australia',
      CA: 'Canada',
    };

    const homeCountryName = countryNames[homeCountry] || homeCountry;

    if (travelMode === 'international' && currentLocation) {
      return `
CONTEXT: The user is currently traveling internationally in ${currentLocation.country} (${currentLocation.city}).
They are from ${homeCountryName}.

BEHAVIOR:
- Prioritize safety tips and local customs when relevant
- Suggest emergency numbers and embassy info if asked
- Recommend popular tourist spots and hidden gems
- Consider jet lag and travel fatigue
- Offer currency/language tips if relevant
- Focus on practical travel advice for visitors`;
    }

    if (travelMode === 'domestic' && currentLocation) {
      return `
CONTEXT: The user is traveling within their home country (${homeCountryName}).
Currently in ${currentLocation.city}.

BEHAVIOR:
- Focus on local experiences and day trips
- Suggest road trip optimizations
- Recommend local specialties and attractions
- Consider driving times and local traffic patterns`;
    }

    // Home mode
    return `
CONTEXT: The user is at home in ${homeCountryName}.

BEHAVIOR:
- Help plan future trips and vacations
- Suggest weekend getaways and nearby destinations
- Help organize saved places and wishlists
- Assist with trip research and budgeting
- Provide inspiration for upcoming travel`;
  }
}

export const travelContextManager = TravelContextManager.getInstance();
export default travelContextManager;
