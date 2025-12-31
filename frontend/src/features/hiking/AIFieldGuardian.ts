/**
 * AI Field Guardian - Main Orchestrator
 *
 * Real-time hiking safety assistant running locally on-device (Edge Computing)
 * ensuring safety and guidance without cellular connectivity.
 *
 * Integrates:
 * - Module A: SunsetSafetyEngine (Dynamic Pacing & Sunset)
 * - Module B: OffTrailDetector (Trail Deviation Detection)
 * - Module C: OfflineCacheManager (Smart Caching)
 * - Module D: FieldGuardianStateMachine (State Management)
 */

import {
  GeoPoint,
  TrailData,
  OfflineTrailPackage,
  SafetyAssessment,
  OffTrailStatus,
  AlertEvent,
  AlertLevel,
  FieldGuardianConfig,
  FieldGuardianStatus,
  FieldGuardianEventHandlers,
  NetworkStatus,
  AppState,
  DEFAULT_FIELD_GUARDIAN_CONFIG,
} from './types';

import { SunsetSafetyEngine } from './SunsetSafetyEngine';
import { OffTrailDetector } from './OffTrailDetector';
import { OfflineCacheManager, CacheStorageAdapter, PackageDownloader } from './OfflineCacheManager';
import { FieldGuardianStateMachine } from './FieldGuardianStateMachine';

export class AIFieldGuardian {
  private config: FieldGuardianConfig;
  private handlers: FieldGuardianEventHandlers;

  // Module instances
  private sunsetEngine: SunsetSafetyEngine;
  private offTrailDetector: OffTrailDetector;
  private cacheManager: OfflineCacheManager;
  private stateMachine: FieldGuardianStateMachine;

  // Current state
  private currentPackage: OfflineTrailPackage | null = null;
  private currentLocation: GeoPoint | null = null;
  private lastSafetyAssessment: SafetyAssessment | null = null;
  private lastOffTrailStatus: OffTrailStatus | null = null;
  private batteryLevel: number = 1.0;

  constructor(
    storage: CacheStorageAdapter,
    downloader: PackageDownloader,
    config: Partial<FieldGuardianConfig> = {},
    handlers: FieldGuardianEventHandlers = {}
  ) {
    this.config = { ...DEFAULT_FIELD_GUARDIAN_CONFIG, ...config };
    this.handlers = handlers;

    // Initialize modules
    this.sunsetEngine = new SunsetSafetyEngine(this.config.sunset);
    this.offTrailDetector = new OffTrailDetector(this.config.offTrail);
    this.cacheManager = new OfflineCacheManager(storage, downloader, this.config.cache);
    this.stateMachine = new FieldGuardianStateMachine(this.config.gps);

    // Set up state machine callbacks
    this.stateMachine.onStateChange((from, to, event) => {
      if (this.handlers.onStateChange) {
        this.handlers.onStateChange(from, to);
      }
    });
  }

  /**
   * Select a trail and begin preparation
   */
  public async selectTrail(trailId: string): Promise<void> {
    this.stateMachine.dispatch('TRAIL_SELECTED');

    try {
      // Check if we have a cached package
      const cachedPackage = await this.cacheManager.getPackage(trailId);

      if (cachedPackage) {
        await this.initializeWithPackage(cachedPackage);
        this.stateMachine.dispatch('CACHE_READY');
      } else {
        // Need to download - check if conditions are met
        this.stateMachine.dispatch('CACHE_FAILED');
        this.emitAlert({
          type: 'cache_expiring',
          severity: 'caution',
          title: 'Offline Data Not Available',
          message: 'Trail data needs to be downloaded. Connect to network near trailhead.',
          timestamp: new Date(),
          requiresUserAction: false,
        });
      }
    } catch (error) {
      this.stateMachine.dispatch('CACHE_FAILED');
      this.emitError(error as Error);
    }
  }

  /**
   * Attempt to download trail package
   */
  public async downloadPackage(
    trail: TrailData,
    userPosition: GeoPoint,
    networkStatus: NetworkStatus
  ): Promise<boolean> {
    const trigger = this.cacheManager.evaluateDownloadTrigger(
      userPosition,
      trail.trailhead,
      networkStatus,
      this.batteryLevel
    );

    if (!trigger.shouldDownload) {
      this.emitAlert({
        type: 'cache_expiring',
        severity: 'caution',
        title: 'Cannot Download',
        message: trigger.reason || 'Download conditions not met',
        timestamp: new Date(),
        requiresUserAction: false,
      });
      return false;
    }

    try {
      const boundingBox = OfflineCacheManager.calculateBoundingBox(trail);
      const pkg = await this.cacheManager.downloadAndCachePackage(trail, boundingBox);

      await this.initializeWithPackage(pkg);
      this.stateMachine.dispatch('CACHE_READY');
      return true;
    } catch (error) {
      this.emitError(error as Error);
      return false;
    }
  }

  /**
   * Initialize modules with downloaded package
   */
  private async initializeWithPackage(pkg: OfflineTrailPackage): Promise<void> {
    this.currentPackage = pkg;

    // Initialize sunset engine with trail and today's ephemeris
    const todayEphemeris = pkg.ephemeris.find(e => {
      const today = new Date();
      const ephDate = new Date(e.date);
      return ephDate.toDateString() === today.toDateString();
    });

    if (!todayEphemeris) {
      throw new Error('No ephemeris data for today');
    }

    this.sunsetEngine.initialize(pkg.trail, todayEphemeris);
    this.offTrailDetector.initialize(pkg.trail);
  }

  /**
   * Start the hike - begin tracking
   */
  public startHike(): void {
    if (!this.currentPackage) {
      throw new Error('No trail package loaded. Call selectTrail first.');
    }

    this.stateMachine.dispatch('START_HIKE');

    // Start GPS polling
    this.stateMachine.startGpsPolling(() => {
      this.requestLocationUpdate();
    });
  }

  /**
   * Request location update from device
   * This should be called by the platform-specific GPS handler
   */
  private requestLocationUpdate(): void {
    // Platform integration point - this would trigger native GPS reading
    // The actual location update comes through updateLocation()
  }

  /**
   * Process a new location update
   */
  public updateLocation(location: GeoPoint): void {
    this.currentLocation = location;

    if (this.handlers.onLocationUpdate) {
      this.handlers.onLocationUpdate(location);
    }

    // Only process if we're in a tracking state
    if (!this.stateMachine.isTracking()) {
      return;
    }

    // Update safety assessment
    try {
      this.lastSafetyAssessment = this.sunsetEngine.updatePosition(location);

      if (this.handlers.onSafetyAssessmentUpdate) {
        this.handlers.onSafetyAssessmentUpdate(this.lastSafetyAssessment);
      }

      // Handle sunset alerts
      this.handleSunsetAlerts(this.lastSafetyAssessment);

      // Update stationary status for GPS polling optimization
      this.stateMachine.setStationary(this.sunsetEngine.isStationary());
    } catch (error) {
      this.emitError(error as Error);
    }

    // Check off-trail status
    try {
      this.lastOffTrailStatus = this.offTrailDetector.checkPosition(location);

      if (this.handlers.onOffTrailStatusUpdate) {
        this.handlers.onOffTrailStatusUpdate(this.lastOffTrailStatus);
      }

      // Handle off-trail alerts
      this.handleOffTrailAlerts(this.lastOffTrailStatus);
    } catch (error) {
      this.emitError(error as Error);
    }
  }

  /**
   * Handle sunset-related alerts and state transitions
   */
  private handleSunsetAlerts(assessment: SafetyAssessment): void {
    const currentState = this.stateMachine.getState();

    if (assessment.alertLevel === 'warning' || assessment.alertLevel === 'critical') {
      if (currentState !== 'ALERTING_SUNSET') {
        this.stateMachine.dispatch('SUNSET_WARNING');

        this.emitAlert({
          type: assessment.alertLevel === 'critical' ? 'sunset_critical' : 'sunset_warning',
          severity: assessment.alertLevel,
          title: assessment.alertLevel === 'critical' ? '🚨 Sunset Critical' : '⚠️ Sunset Warning',
          message: assessment.message,
          timestamp: new Date(),
          data: {
            eta: assessment.eta,
            timeToSunset: assessment.timeToSunset,
            suggestedCutoff: assessment.suggestedCutoff,
          },
          requiresUserAction: assessment.alertLevel === 'critical',
          actions: assessment.suggestedCutoff ? [
            {
              id: 'turn-back',
              label: 'Turn Back Now',
              isPrimary: true,
              action: () => this.navigateToCutoff(assessment.suggestedCutoff!),
            },
            {
              id: 'continue',
              label: 'I Understand the Risk',
              isPrimary: false,
              action: () => {},
            },
          ] : undefined,
        });
      }
    } else if (currentState === 'ALERTING_SUNSET' && assessment.alertLevel === 'safe') {
      this.stateMachine.dispatch('SUNSET_CLEARED');
    }
  }

  /**
   * Handle off-trail alerts and state transitions
   */
  private handleOffTrailAlerts(status: OffTrailStatus): void {
    const currentState = this.stateMachine.getState();

    if (status.isOffTrail) {
      if (currentState !== 'ALERTING_OFF_TRAIL') {
        this.stateMachine.dispatch('OFF_TRAIL_DETECTED');

        const returnInstruction = status.returnVector
          ? OffTrailDetector.formatReturnInstruction(status.returnVector)
          : 'Return to trail';

        this.emitAlert({
          type: 'off_trail',
          severity: 'warning',
          title: '⚠️ Off Trail',
          message: `You are ${Math.round(status.deviationDistance)}m from the trail. ${returnInstruction}`,
          timestamp: new Date(),
          data: {
            deviationDistance: status.deviationDistance,
            returnVector: status.returnVector,
          },
          requiresUserAction: false,
        });
      }
    } else if (currentState === 'ALERTING_OFF_TRAIL') {
      this.stateMachine.dispatch('BACK_ON_TRAIL');
    }
  }

  /**
   * Navigate user back to cutoff point
   */
  private navigateToCutoff(cutoff: SafetyAssessment['suggestedCutoff']): void {
    // Platform integration point for navigation
    console.log('Navigating to cutoff:', cutoff);
  }

  /**
   * Update battery level
   */
  public updateBatteryLevel(level: number): void {
    this.batteryLevel = level;
    this.stateMachine.setBatteryLevel(level);

    if (level < 0.15) {
      this.emitAlert({
        type: 'low_battery',
        severity: 'warning',
        title: '🔋 Low Battery',
        message: `Battery at ${Math.round(level * 100)}%. GPS polling reduced to conserve power.`,
        timestamp: new Date(),
        requiresUserAction: false,
      });
    }
  }

  /**
   * Trigger emergency mode
   */
  public triggerEmergency(): void {
    this.stateMachine.dispatch('EMERGENCY_TRIGGERED');

    this.emitAlert({
      type: 'emergency',
      severity: 'critical',
      title: '🆘 EMERGENCY',
      message: 'Emergency mode activated. Attempting to send location.',
      timestamp: new Date(),
      data: {
        location: this.currentLocation,
        emergencyContacts: this.currentPackage?.emergencyContacts,
      },
      requiresUserAction: true,
      actions: [
        {
          id: 'call-rescue',
          label: 'Call Rescue',
          isPrimary: true,
          action: () => this.callEmergencyContact(),
        },
        {
          id: 'cancel',
          label: 'Cancel Emergency',
          isPrimary: false,
          action: () => this.stateMachine.dispatch('EMERGENCY_RESOLVED'),
        },
      ],
    });
  }

  /**
   * Call emergency contact
   */
  private callEmergencyContact(): void {
    if (!this.currentPackage?.emergencyContacts) return;

    const rescueContact = this.currentPackage.emergencyContacts.find(c => c.type === 'rescue');
    if (rescueContact) {
      // Platform integration point for phone call
      console.log('Calling:', rescueContact.phone);
    }
  }

  /**
   * Mark destination reached
   */
  public completeHike(): void {
    this.stateMachine.dispatch('DESTINATION_REACHED');
    this.stateMachine.stopGpsPolling();
  }

  /**
   * Stop hike and reset
   */
  public stopHike(): void {
    this.stateMachine.reset();
    this.sunsetEngine.reset();
    this.offTrailDetector.reset();
    this.currentLocation = null;
    this.lastSafetyAssessment = null;
    this.lastOffTrailStatus = null;
  }

  /**
   * Get current status
   */
  public getStatus(): FieldGuardianStatus {
    return {
      state: this.stateMachine.getState(),
      isTracking: this.stateMachine.isTracking(),
      currentLocation: this.currentLocation || undefined,
      safetyAssessment: this.lastSafetyAssessment || undefined,
      offTrailStatus: this.lastOffTrailStatus || undefined,
      cacheStatus: {
        isReady: this.currentPackage !== null,
        lastUpdated: this.currentPackage?.downloadedAt,
        expiresAt: this.currentPackage?.expiresAt,
      },
      batteryLevel: this.batteryLevel,
      gpsAccuracy: this.currentLocation?.accuracy,
    };
  }

  /**
   * Get current velocity
   */
  public getCurrentVelocity(): number {
    return this.sunsetEngine.getCurrentVelocity();
  }

  /**
   * Get GPS polling interval
   */
  public getGpsPollingInterval(): number {
    return this.stateMachine.getGpsPollingInterval();
  }

  /**
   * Emit alert to handlers
   */
  private emitAlert(alert: AlertEvent): void {
    if (this.handlers.onAlert) {
      this.handlers.onAlert(alert);
    }
  }

  /**
   * Emit error to handlers
   */
  private emitError(error: Error): void {
    if (this.handlers.onError) {
      this.handlers.onError(error);
    }
  }

  /**
   * Update event handlers
   */
  public setHandlers(handlers: FieldGuardianEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get state machine for debugging
   */
  public getStateMachine(): FieldGuardianStateMachine {
    return this.stateMachine;
  }

  /**
   * Get cache manager for advanced operations
   */
  public getCacheManager(): OfflineCacheManager {
    return this.cacheManager;
  }
}

// Export all modules for direct use if needed
export { SunsetSafetyEngine } from './SunsetSafetyEngine';
export { OffTrailDetector } from './OffTrailDetector';
export { OfflineCacheManager } from './OfflineCacheManager';
export { FieldGuardianStateMachine } from './FieldGuardianStateMachine';
export * from './types';
