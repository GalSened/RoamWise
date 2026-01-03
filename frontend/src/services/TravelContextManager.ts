/**
 * TravelContextManager - Minimal stub for aiPlanner compatibility
 *
 * This is a minimal implementation to support the AI planner.
 * Full context management was removed with mobile code cleanup.
 */

export interface TravelContext {
  location: { lat: number; lng: number } | null;
  weather: { temperature: number; condition: string } | null;
  activeTrip: { name: string; destination: string } | null;
}

class TravelContextManager {
  private context: TravelContext = {
    location: null,
    weather: null,
    activeTrip: null,
  };

  /**
   * Get AI context prompt for travel-aware responses
   */
  getAIContextPrompt(): string {
    const parts: string[] = [];

    if (this.context.location) {
      parts.push(`User location: ${this.context.location.lat}, ${this.context.location.lng}`);
    }

    if (this.context.weather) {
      parts.push(`Weather: ${this.context.weather.temperature}°C, ${this.context.weather.condition}`);
    }

    if (this.context.activeTrip) {
      parts.push(`Active trip: ${this.context.activeTrip.name} to ${this.context.activeTrip.destination}`);
    }

    return parts.length > 0 ? parts.join('\n') : '';
  }

  /**
   * Update context with new data
   */
  updateContext(updates: Partial<TravelContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Get current context
   */
  getContext(): TravelContext {
    return this.context;
  }
}

export const travelContextManager = new TravelContextManager();
