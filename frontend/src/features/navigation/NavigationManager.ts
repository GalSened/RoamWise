import type { Route, RouteLeg, RouteStep, LatLng, TripPlan } from '@/types';
import { AppError } from '@/types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

interface NavigationState {
  isNavigating: boolean;
  currentRoute?: Route;
  currentLeg: number;
  currentStep: number;
  currentLocation?: LatLng;
  nextInstruction?: RouteStep;
  distanceToNextStep: number;
  estimatedTimeRemaining: number;
}

interface NavigationSettings {
  voiceGuidance: boolean;
  units: 'metric' | 'imperial';
  avoidTolls: boolean;
  routePreference: 'fastest' | 'shortest' | 'scenic';
}

class NavigationManager extends EventBus {
  private state: NavigationState = {
    isNavigating: false,
    currentLeg: 0,
    currentStep: 0,
    distanceToNextStep: 0,
    estimatedTimeRemaining: 0
  };

  private settings: NavigationSettings = {
    voiceGuidance: true,
    units: 'metric',
    avoidTolls: false,
    routePreference: 'fastest'
  };

  private watchId?: number;
  private lastAnnouncedStep = -1;

  constructor() {
    super();
    this.loadSettings();
  }

  async startNavigation(route: Route, startFromStep = 0): Promise<void> {
    try {
      this.state = {
        isNavigating: true,
        currentRoute: route,
        currentLeg: 0,
        currentStep: startFromStep,
        distanceToNextStep: 0,
        estimatedTimeRemaining: route.overview.duration
      };

      await this.startLocationTracking();
      this.emit('navigation-started', this.state);
      
      telemetry.track('navigation_started', {
        total_distance: route.overview.distance,
        total_duration: route.overview.duration,
        legs_count: route.legs.length
      });

      // Announce first instruction
      if (this.settings.voiceGuidance) {
        this.announceNextInstruction();
      }
    } catch (error) {
      telemetry.track('navigation_start_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async stopNavigation(): Promise<void> {
    this.state.isNavigating = false;
    this.stopLocationTracking();
    this.emit('navigation-stopped');
    
    telemetry.track('navigation_stopped', {
      was_completed: this.isNavigationComplete()
    });
  }

  async pauseNavigation(): Promise<void> {
    this.stopLocationTracking();
    this.emit('navigation-paused');
    telemetry.track('navigation_paused');
  }

  async resumeNavigation(): Promise<void> {
    if (!this.state.currentRoute) {
      throw new AppError('No active route to resume', 'NO_ACTIVE_ROUTE');
    }

    await this.startLocationTracking();
    this.emit('navigation-resumed');
    telemetry.track('navigation_resumed');
  }

  private async startLocationTracking(): Promise<void> {
    if (!navigator.geolocation) {
      throw new AppError('Geolocation not supported', 'GEOLOCATION_NOT_SUPPORTED');
    }

    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      };

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.updateLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          
          // Start watching position
          this.watchId = navigator.geolocation.watchPosition(
            (position) => {
              this.updateLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.error('Location tracking error:', error);
              this.emit('navigation-error', new AppError(
                `Location tracking failed: ${error.message}`,
                'LOCATION_TRACKING_FAILED'
              ));
            },
            options
          );
          
          resolve();
        },
        (error) => {
          reject(new AppError(
            `Failed to get initial location: ${error.message}`,
            'INITIAL_LOCATION_FAILED'
          ));
        },
        options
      );
    });
  }

  private stopLocationTracking(): void {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
    }
  }

  private updateLocation(location: LatLng): void {
    this.state.currentLocation = location;
    
    if (!this.state.currentRoute || !this.state.isNavigating) return;

    // Update navigation state based on current location
    this.updateNavigationProgress(location);
    this.emit('location-updated', { location, state: this.state });
  }

  private updateNavigationProgress(location: LatLng): void {
    if (!this.state.currentRoute) return;

    const currentLeg = this.state.currentRoute.legs[this.state.currentLeg];
    if (!currentLeg) return;

    const currentStep = currentLeg.steps[this.state.currentStep];
    if (!currentStep) return;

    // Calculate distance to next step
    this.state.distanceToNextStep = this.calculateDistance(location, currentStep.end);

    // Check if we've reached the current step
    if (this.state.distanceToNextStep < 20) { // 20 meters threshold
      this.advanceToNextStep();
    }

    // Update estimated time remaining
    this.updateEstimatedTime();

    // Check for voice announcements
    this.checkVoiceAnnouncements();
  }

  private advanceToNextStep(): void {
    if (!this.state.currentRoute) return;

    const currentLeg = this.state.currentRoute.legs[this.state.currentLeg];
    if (!currentLeg) return;

    this.state.currentStep++;

    // Check if we've completed the current leg
    if (this.state.currentStep >= currentLeg.steps.length) {
      this.state.currentLeg++;
      this.state.currentStep = 0;

      // Check if we've completed the entire route
      if (this.state.currentLeg >= this.state.currentRoute.legs.length) {
        this.completeNavigation();
        return;
      }

      this.emit('leg-completed', {
        completedLeg: this.state.currentLeg - 1,
        currentLeg: this.state.currentLeg
      });
    }

    // Announce next instruction
    if (this.settings.voiceGuidance) {
      this.announceNextInstruction();
    }

    this.emit('step-advanced', this.state);
    telemetry.track('navigation_step_advanced', {
      leg: this.state.currentLeg,
      step: this.state.currentStep
    });
  }

  private completeNavigation(): void {
    this.state.isNavigating = false;
    this.stopLocationTracking();
    
    this.emit('navigation-completed');
    telemetry.track('navigation_completed', {
      total_legs: this.state.currentRoute?.legs.length,
      final_leg: this.state.currentLeg,
      final_step: this.state.currentStep
    });

    if (this.settings.voiceGuidance) {
      this.speak('You have arrived at your destination!');
    }
  }

  private updateEstimatedTime(): void {
    if (!this.state.currentRoute) return;

    // Calculate remaining time based on remaining distance and average speed
    let remainingDistance = 0;
    
    // Add distance from current location to end of current step
    remainingDistance += this.state.distanceToNextStep;
    
    // Add distance for remaining steps in current leg
    const currentLeg = this.state.currentRoute.legs[this.state.currentLeg];
    if (currentLeg) {
      for (let i = this.state.currentStep + 1; i < currentLeg.steps.length; i++) {
        remainingDistance += currentLeg.steps[i].distance;
      }
    }
    
    // Add distance for remaining legs
    for (let i = this.state.currentLeg + 1; i < this.state.currentRoute.legs.length; i++) {
      remainingDistance += this.state.currentRoute.legs[i].distance;
    }

    // Estimate time based on average speed (assuming 50 km/h average)
    const averageSpeedMs = 50 * 1000 / 3600; // 50 km/h to m/s
    this.state.estimatedTimeRemaining = Math.round(remainingDistance / averageSpeedMs);
  }

  private checkVoiceAnnouncements(): void {
    if (!this.settings.voiceGuidance) return;
    if (!this.state.currentRoute) return;

    const currentLeg = this.state.currentRoute.legs[this.state.currentLeg];
    if (!currentLeg) return;

    const currentStep = currentLeg.steps[this.state.currentStep];
    if (!currentStep) return;

    // Announce at different distances
    const distance = this.state.distanceToNextStep;
    
    if (distance <= 100 && this.lastAnnouncedStep !== this.state.currentStep) {
      this.announceNextInstruction();
      this.lastAnnouncedStep = this.state.currentStep;
    }
  }

  private announceNextInstruction(): void {
    if (!this.state.currentRoute) return;

    const currentLeg = this.state.currentRoute.legs[this.state.currentLeg];
    if (!currentLeg) return;

    const nextStepIndex = this.state.currentStep + 1;
    const nextStep = currentLeg.steps[nextStepIndex];
    
    if (nextStep) {
      const distance = this.formatDistance(this.state.distanceToNextStep);
      const instruction = `In ${distance}, ${nextStep.instruction}`;
      this.speak(instruction);
    }
  }

  private speak(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  }

  private formatDistance(meters: number): string {
    if (this.settings.units === 'imperial') {
      const feet = meters * 3.28084;
      if (feet < 1000) {
        return `${Math.round(feet)} feet`;
      } else {
        const miles = feet / 5280;
        return `${miles.toFixed(1)} miles`;
      }
    } else {
      if (meters < 1000) {
        return `${Math.round(meters)} meters`;
      } else {
        const km = meters / 1000;
        return `${km.toFixed(1)} kilometers`;
      }
    }
  }

  private calculateDistance(from: LatLng, to: LatLng): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = from.lat * Math.PI / 180;
    const φ2 = to.lat * Math.PI / 180;
    const Δφ = (to.lat - from.lat) * Math.PI / 180;
    const Δλ = (to.lng - from.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Public API methods
  getState(): NavigationState {
    return { ...this.state };
  }

  getCurrentInstruction(): string {
    if (!this.state.currentRoute) return '';

    const currentLeg = this.state.currentRoute.legs[this.state.currentLeg];
    if (!currentLeg) return '';

    const currentStep = currentLeg.steps[this.state.currentStep];
    return currentStep?.instruction || '';
  }

  getUpcomingInstructions(count = 3): RouteStep[] {
    if (!this.state.currentRoute) return [];

    const currentLeg = this.state.currentRoute.legs[this.state.currentLeg];
    if (!currentLeg) return [];

    const upcoming: RouteStep[] = [];
    let stepIndex = this.state.currentStep + 1;
    let legIndex = this.state.currentLeg;

    while (upcoming.length < count && legIndex < this.state.currentRoute.legs.length) {
      const leg = this.state.currentRoute.legs[legIndex];
      
      if (stepIndex < leg.steps.length) {
        upcoming.push(leg.steps[stepIndex]);
        stepIndex++;
      } else {
        legIndex++;
        stepIndex = 0;
      }
    }

    return upcoming;
  }

  updateSettings(newSettings: Partial<NavigationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.emit('settings-updated', this.settings);
  }

  getSettings(): NavigationSettings {
    return { ...this.settings };
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('navigation-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load navigation settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('navigation-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save navigation settings:', error);
    }
  }

  isNavigationComplete(): boolean {
    if (!this.state.currentRoute) return false;
    return this.state.currentLeg >= this.state.currentRoute.legs.length;
  }

  // Simulation methods for testing
  simulateLocation(location: LatLng): void {
    if (import.meta.env.DEV) {
      this.updateLocation(location);
    }
  }

  simulateProgress(legIndex: number, stepIndex: number): void {
    if (import.meta.env.DEV) {
      this.state.currentLeg = legIndex;
      this.state.currentStep = stepIndex;
      this.emit('step-advanced', this.state);
    }
  }
}

// Global navigation manager
export const navigationManager = new NavigationManager();

// Hook for easier usage
export function useNavigation() {
  return {
    startNavigation: navigationManager.startNavigation.bind(navigationManager),
    stopNavigation: navigationManager.stopNavigation.bind(navigationManager),
    pauseNavigation: navigationManager.pauseNavigation.bind(navigationManager),
    resumeNavigation: navigationManager.resumeNavigation.bind(navigationManager),
    getState: navigationManager.getState.bind(navigationManager),
    getCurrentInstruction: navigationManager.getCurrentInstruction.bind(navigationManager),
    getUpcomingInstructions: navigationManager.getUpcomingInstructions.bind(navigationManager),
    updateSettings: navigationManager.updateSettings.bind(navigationManager),
    getSettings: navigationManager.getSettings.bind(navigationManager),
    subscribe: (event: string, callback: Function) => {
      navigationManager.on(event, callback);
      return () => navigationManager.off(event, callback);
    }
  };
}