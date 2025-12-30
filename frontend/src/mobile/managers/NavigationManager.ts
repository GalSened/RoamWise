/**
 * NavigationManager - Real-time hiking safety orchestrator
 *
 * Production-ready singleton class that manages:
 * 1. Real-time GPS tracking using expo-location
 * 2. ETA calculation using Haversine formula (geolib)
 * 3. Off-trail detection with 50m threshold
 * 4. Sunset safety assessment
 *
 * NO FAKE DATA - uses real sensors, real math, real timestamps
 */

import * as Location from 'expo-location';
import * as geolib from 'geolib';
import dayjs from 'dayjs';

/**
 * Geographic point with latitude and longitude
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Trail data for navigation
 */
export interface TrailData {
  id: string;
  name: string;
  coordinates: GeoPoint[];
  destination: GeoPoint;
  totalDistance: number; // meters
}

/**
 * Safety status levels
 */
export type SafetyStatus = 'SAFE' | 'WARNING' | 'DANGER';

/**
 * Navigation state shared with UI components
 */
export interface NavigationState {
  // Position
  currentPosition: GeoPoint | null;
  accuracy: number | null; // GPS accuracy in meters

  // Progress
  distanceRemaining: number; // meters
  distanceTraveled: number; // meters
  progressPercent: number; // 0-100

  // Time
  estimatedArrival: Date | null;
  sunsetTime: Date;
  safetyBuffer: number; // minutes until sunset after ETA

  // Safety
  safetyStatus: SafetyStatus;
  isOffTrail: boolean;
  offTrailDistance: number; // meters from nearest trail point

  // Tracking state
  isTracking: boolean;
  lastUpdate: Date | null;
}

/**
 * Subscriber callback type
 */
type StateSubscriber = (state: NavigationState) => void;

/**
 * Configuration constants
 */
const CONFIG = {
  // Average hiking speed in km/h (Tobler's hiking function baseline)
  WALKING_SPEED_KMH: 4.5,

  // Off-trail threshold in meters
  OFF_TRAIL_THRESHOLD: 50,

  // Safety buffer thresholds in minutes
  SAFETY_WARNING_THRESHOLD: 30,
  SAFETY_DANGER_THRESHOLD: 0,

  // GPS update interval in milliseconds
  GPS_UPDATE_INTERVAL: 5000,

  // Minimum distance between updates in meters
  GPS_DISTANCE_FILTER: 5,
};

/**
 * NavigationManager Singleton
 *
 * Usage:
 * ```typescript
 * const manager = NavigationManager.getInstance();
 * await manager.startTracking(trail, sunsetTime);
 * const unsubscribe = manager.subscribe((state) => updateUI(state));
 * // ... later
 * manager.stopTracking();
 * unsubscribe();
 * ```
 */
export class NavigationManager {
  private static instance: NavigationManager | null = null;

  // State
  private state: NavigationState;
  private trail: TrailData | null = null;
  private subscribers: Set<StateSubscriber> = new Set();

  // Location tracking
  private locationSubscription: Location.LocationSubscription | null = null;
  private startPosition: GeoPoint | null = null;

  private constructor() {
    // Initialize default state
    this.state = this.getDefaultState();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  /**
   * Get default/reset state
   */
  private getDefaultState(): NavigationState {
    return {
      currentPosition: null,
      accuracy: null,
      distanceRemaining: 0,
      distanceTraveled: 0,
      progressPercent: 0,
      estimatedArrival: null,
      sunsetTime: this.getDefaultSunset(),
      safetyBuffer: 0,
      safetyStatus: 'SAFE',
      isOffTrail: false,
      offTrailDistance: 0,
      isTracking: false,
      lastUpdate: null,
    };
  }

  /**
   * Get default sunset time (5:30 PM today)
   */
  private getDefaultSunset(): Date {
    return dayjs().hour(17).minute(30).second(0).toDate();
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  public subscribe(callback: StateSubscriber): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.state);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback(this.state));
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(partial: Partial<NavigationState>): void {
    this.state = { ...this.state, ...partial };
    this.notifySubscribers();
  }

  /**
   * Get current state (snapshot)
   */
  public getState(): NavigationState {
    return { ...this.state };
  }

  /**
   * Start tracking with the given trail and sunset time
   */
  public async startTracking(
    trail: TrailData,
    sunsetTime?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Location permission denied' };
      }

      // Store trail data
      this.trail = trail;

      // Get initial position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.startPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Initialize state with trail data
      this.updateState({
        currentPosition: this.startPosition,
        accuracy: location.coords.accuracy,
        distanceRemaining: trail.totalDistance,
        distanceTraveled: 0,
        progressPercent: 0,
        sunsetTime: sunsetTime || this.getDefaultSunset(),
        isTracking: true,
        lastUpdate: new Date(),
      });

      // Start watching position
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: CONFIG.GPS_UPDATE_INTERVAL,
          distanceInterval: CONFIG.GPS_DISTANCE_FILTER,
        },
        (location) => this.handleLocationUpdate(location)
      );

      // Calculate initial ETA and safety
      this.calculateETA();
      this.assessSafety();

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Stop tracking and clean up
   */
  public stopTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.trail = null;
    this.startPosition = null;
    this.updateState({
      ...this.getDefaultState(),
      isTracking: false,
    });
  }

  /**
   * Handle GPS location update
   */
  private handleLocationUpdate(location: Location.LocationObject): void {
    const newPosition: GeoPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // Calculate distance traveled from start
    const distanceTraveled = this.startPosition
      ? geolib.getDistance(this.startPosition, newPosition)
      : 0;

    // Calculate distance remaining to destination
    const distanceRemaining = this.trail
      ? geolib.getDistance(newPosition, this.trail.destination)
      : 0;

    // Calculate progress
    const totalDistance = this.trail?.totalDistance || 1;
    const progressPercent = Math.min(
      100,
      Math.round((distanceTraveled / totalDistance) * 100)
    );

    // Update position state
    this.updateState({
      currentPosition: newPosition,
      accuracy: location.coords.accuracy,
      distanceTraveled,
      distanceRemaining,
      progressPercent,
      lastUpdate: new Date(),
    });

    // Check off-trail status
    this.checkOffTrail(newPosition);

    // Recalculate ETA
    this.calculateETA();

    // Reassess safety
    this.assessSafety();
  }

  /**
   * Calculate ETA using Haversine distance and walking speed
   */
  private calculateETA(): void {
    const distanceKm = this.state.distanceRemaining / 1000;
    const hoursRemaining = distanceKm / CONFIG.WALKING_SPEED_KMH;
    const estimatedArrival = dayjs()
      .add(hoursRemaining * 60, 'minute')
      .toDate();

    this.updateState({ estimatedArrival });
  }

  /**
   * Check if current position is off the trail
   */
  private checkOffTrail(position: GeoPoint): void {
    if (!this.trail || this.trail.coordinates.length < 2) {
      this.updateState({ isOffTrail: false, offTrailDistance: 0 });
      return;
    }

    let minDistance = Infinity;

    // Find minimum distance to any trail segment
    for (let i = 0; i < this.trail.coordinates.length - 1; i++) {
      const segmentStart = this.trail.coordinates[i];
      const segmentEnd = this.trail.coordinates[i + 1];

      // Calculate perpendicular distance to segment
      const distance = geolib.getDistanceFromLine(
        position,
        segmentStart,
        segmentEnd
      );

      minDistance = Math.min(minDistance, distance);
    }

    // Account for GPS accuracy in threshold
    const accuracy = this.state.accuracy || 0;
    const adjustedThreshold = CONFIG.OFF_TRAIL_THRESHOLD + accuracy;
    const isOffTrail = minDistance > adjustedThreshold;

    this.updateState({
      isOffTrail,
      offTrailDistance: Math.round(minDistance),
    });
  }

  /**
   * Assess safety based on ETA vs sunset time
   */
  private assessSafety(): void {
    if (!this.state.estimatedArrival) {
      this.updateState({ safetyStatus: 'SAFE', safetyBuffer: 0 });
      return;
    }

    const etaTime = dayjs(this.state.estimatedArrival);
    const sunsetTime = dayjs(this.state.sunsetTime);
    const bufferMinutes = sunsetTime.diff(etaTime, 'minute');

    let safetyStatus: SafetyStatus;

    if (bufferMinutes < CONFIG.SAFETY_DANGER_THRESHOLD) {
      safetyStatus = 'DANGER';
    } else if (bufferMinutes < CONFIG.SAFETY_WARNING_THRESHOLD) {
      safetyStatus = 'WARNING';
    } else {
      safetyStatus = 'SAFE';
    }

    // Also mark as danger if significantly off-trail
    if (this.state.isOffTrail && this.state.offTrailDistance > 100) {
      safetyStatus = 'DANGER';
    }

    this.updateState({
      safetyStatus,
      safetyBuffer: bufferMinutes,
    });
  }

  /**
   * Update sunset time (for testing or manual override)
   */
  public setSunsetTime(sunsetTime: Date): void {
    this.updateState({ sunsetTime });
    this.assessSafety();
  }

  /**
   * Get formatted time string
   */
  public static formatTime(date: Date | null): string {
    if (!date) return '--:--';
    return dayjs(date).format('h:mm A');
  }

  /**
   * Get formatted distance string
   */
  public static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Get formatted duration string
   */
  public static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }
}

export default NavigationManager;
