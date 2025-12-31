/**
 * Module D: Field Guardian State Machine
 *
 * Manages application states and transitions:
 * IDLE → PREPARING → READY_TO_HIKE → TRACKING → COMPLETING
 *
 * Alert sub-states:
 * - ALERTING_OFF_TRAIL
 * - ALERTING_SUNSET
 * - LOW_BATTERY_MODE
 * - EMERGENCY
 *
 * Includes adaptive GPS polling based on state and movement.
 */

import {
  AppState,
  StateTransitionEvent,
  StateTransition,
  StateMachineContext,
  GPSPollingConfig,
  DEFAULT_GPS_CONFIG,
} from './types';

export interface StateChangeCallback {
  (from: AppState, to: AppState, event: StateTransitionEvent): void;
}

export class FieldGuardianStateMachine {
  private context: StateMachineContext;
  private gpsConfig: GPSPollingConfig;
  private transitions: StateTransition[];
  private stateChangeCallbacks: StateChangeCallback[] = [];
  private gpsPollingTimer: ReturnType<typeof setTimeout> | null = null;
  private onGpsPoll: (() => void) | null = null;

  constructor(gpsConfig: Partial<GPSPollingConfig> = {}) {
    this.gpsConfig = { ...DEFAULT_GPS_CONFIG, ...gpsConfig };

    this.context = {
      currentState: 'IDLE',
      previousState: undefined,
      enteredStateAt: new Date(),
      gpsPollingInterval: this.gpsConfig.movingIntervalMs,
      batteryLevel: 1.0,
      isStationary: false,
      hasActiveAlerts: false,
    };

    this.transitions = this.defineTransitions();
  }

  /**
   * Define all valid state transitions
   */
  private defineTransitions(): StateTransition[] {
    return [
      // IDLE transitions
      { from: 'IDLE', event: 'TRAIL_SELECTED', to: 'PREPARING' },

      // PREPARING transitions
      { from: 'PREPARING', event: 'CACHE_READY', to: 'READY_TO_HIKE' },
      { from: 'PREPARING', event: 'CACHE_FAILED', to: 'LIMITED_MODE' },
      { from: 'PREPARING', event: 'RESET', to: 'IDLE' },

      // READY_TO_HIKE transitions
      { from: 'READY_TO_HIKE', event: 'START_HIKE', to: 'TRACKING' },
      { from: 'READY_TO_HIKE', event: 'RESET', to: 'IDLE' },

      // LIMITED_MODE transitions
      { from: 'LIMITED_MODE', event: 'START_HIKE', to: 'TRACKING' },
      { from: 'LIMITED_MODE', event: 'CACHE_READY', to: 'READY_TO_HIKE' },
      { from: 'LIMITED_MODE', event: 'RESET', to: 'IDLE' },

      // TRACKING transitions
      { from: 'TRACKING', event: 'OFF_TRAIL_DETECTED', to: 'ALERTING_OFF_TRAIL' },
      { from: 'TRACKING', event: 'SUNSET_WARNING', to: 'ALERTING_SUNSET' },
      { from: 'TRACKING', event: 'LOW_BATTERY', to: 'LOW_BATTERY_MODE' },
      { from: 'TRACKING', event: 'DESTINATION_REACHED', to: 'COMPLETING' },
      { from: 'TRACKING', event: 'EMERGENCY_TRIGGERED', to: 'EMERGENCY' },
      { from: 'TRACKING', event: 'RESET', to: 'IDLE' },

      // ALERTING_OFF_TRAIL transitions
      { from: 'ALERTING_OFF_TRAIL', event: 'BACK_ON_TRAIL', to: 'TRACKING' },
      { from: 'ALERTING_OFF_TRAIL', event: 'SUNSET_WARNING', to: 'ALERTING_SUNSET' },
      { from: 'ALERTING_OFF_TRAIL', event: 'LOW_BATTERY', to: 'LOW_BATTERY_MODE' },
      { from: 'ALERTING_OFF_TRAIL', event: 'EMERGENCY_TRIGGERED', to: 'EMERGENCY' },
      { from: 'ALERTING_OFF_TRAIL', event: 'RESET', to: 'IDLE' },

      // ALERTING_SUNSET transitions
      { from: 'ALERTING_SUNSET', event: 'SUNSET_CLEARED', to: 'TRACKING' },
      { from: 'ALERTING_SUNSET', event: 'OFF_TRAIL_DETECTED', to: 'ALERTING_OFF_TRAIL' },
      { from: 'ALERTING_SUNSET', event: 'LOW_BATTERY', to: 'LOW_BATTERY_MODE' },
      { from: 'ALERTING_SUNSET', event: 'DESTINATION_REACHED', to: 'COMPLETING' },
      { from: 'ALERTING_SUNSET', event: 'EMERGENCY_TRIGGERED', to: 'EMERGENCY' },
      { from: 'ALERTING_SUNSET', event: 'RESET', to: 'IDLE' },

      // LOW_BATTERY_MODE transitions
      { from: 'LOW_BATTERY_MODE', event: 'BATTERY_OK', to: 'TRACKING' },
      { from: 'LOW_BATTERY_MODE', event: 'DESTINATION_REACHED', to: 'COMPLETING' },
      { from: 'LOW_BATTERY_MODE', event: 'EMERGENCY_TRIGGERED', to: 'EMERGENCY' },
      { from: 'LOW_BATTERY_MODE', event: 'RESET', to: 'IDLE' },

      // COMPLETING transitions
      { from: 'COMPLETING', event: 'RESET', to: 'IDLE' },

      // EMERGENCY transitions
      { from: 'EMERGENCY', event: 'EMERGENCY_RESOLVED', to: 'TRACKING' },
      { from: 'EMERGENCY', event: 'RESET', to: 'IDLE' },
    ];
  }

  /**
   * Dispatch an event to trigger state transition
   */
  public dispatch(event: StateTransitionEvent): boolean {
    const transition = this.findTransition(this.context.currentState, event);

    if (!transition) {
      console.warn(`No transition found for state=${this.context.currentState} event=${event}`);
      return false;
    }

    // Check guard condition if present
    if (transition.guard && !transition.guard()) {
      console.warn(`Guard condition failed for transition ${this.context.currentState} -> ${transition.to}`);
      return false;
    }

    const previousState = this.context.currentState;

    // Execute transition action if present
    if (transition.action) {
      transition.action();
    }

    // Update context
    this.context.previousState = previousState;
    this.context.currentState = transition.to;
    this.context.enteredStateAt = new Date();

    // Update GPS polling based on new state
    this.updateGpsPolling();

    // Update alerts flag
    this.context.hasActiveAlerts = this.isAlertState(transition.to);

    // Notify listeners
    this.notifyStateChange(previousState, transition.to, event);

    return true;
  }

  /**
   * Find valid transition for current state and event
   */
  private findTransition(state: AppState, event: StateTransitionEvent): StateTransition | undefined {
    return this.transitions.find(t => t.from === state && t.event === event);
  }

  /**
   * Check if state is an alert state
   */
  private isAlertState(state: AppState): boolean {
    return ['ALERTING_OFF_TRAIL', 'ALERTING_SUNSET', 'LOW_BATTERY_MODE', 'EMERGENCY'].includes(state);
  }

  /**
   * Check if state is a tracking state
   */
  private isTrackingState(state: AppState): boolean {
    return [
      'TRACKING',
      'ALERTING_OFF_TRAIL',
      'ALERTING_SUNSET',
      'LOW_BATTERY_MODE',
    ].includes(state);
  }

  /**
   * Update GPS polling interval based on current state and conditions
   */
  private updateGpsPolling(): void {
    let interval: number;

    switch (this.context.currentState) {
      case 'LOW_BATTERY_MODE':
        interval = this.gpsConfig.lowBatteryIntervalMs;
        break;

      case 'TRACKING':
      case 'ALERTING_OFF_TRAIL':
      case 'ALERTING_SUNSET':
        if (this.context.isStationary) {
          interval = this.gpsConfig.stationaryIntervalMs;
        } else {
          interval = this.gpsConfig.movingIntervalMs;
        }
        break;

      case 'EMERGENCY':
        // Always use fast polling in emergency
        interval = this.gpsConfig.movingIntervalMs;
        break;

      default:
        // Non-tracking states - stop polling
        this.stopGpsPolling();
        return;
    }

    this.context.gpsPollingInterval = interval;
    this.restartGpsPolling();
  }

  /**
   * Start GPS polling with callback
   */
  public startGpsPolling(callback: () => void): void {
    this.onGpsPoll = callback;
    this.restartGpsPolling();
  }

  /**
   * Stop GPS polling
   */
  public stopGpsPolling(): void {
    if (this.gpsPollingTimer) {
      clearTimeout(this.gpsPollingTimer);
      this.gpsPollingTimer = null;
    }
  }

  /**
   * Restart GPS polling with current interval
   */
  private restartGpsPolling(): void {
    this.stopGpsPolling();

    if (!this.onGpsPoll || !this.isTrackingState(this.context.currentState)) {
      return;
    }

    const poll = () => {
      if (this.onGpsPoll && this.isTrackingState(this.context.currentState)) {
        this.onGpsPoll();
        this.gpsPollingTimer = setTimeout(poll, this.context.gpsPollingInterval);
      }
    };

    // Start polling
    this.gpsPollingTimer = setTimeout(poll, this.context.gpsPollingInterval);
  }

  /**
   * Update stationary status (affects GPS polling)
   */
  public setStationary(isStationary: boolean): void {
    if (this.context.isStationary !== isStationary) {
      this.context.isStationary = isStationary;

      // Only update polling if in tracking state
      if (this.isTrackingState(this.context.currentState)) {
        this.updateGpsPolling();
      }
    }
  }

  /**
   * Update battery level
   */
  public setBatteryLevel(level: number): void {
    this.context.batteryLevel = level;

    // Auto-transition to LOW_BATTERY_MODE if battery drops below threshold
    const LOW_BATTERY_THRESHOLD = 0.15; // 15%
    if (level < LOW_BATTERY_THRESHOLD && this.isTrackingState(this.context.currentState)) {
      if (this.context.currentState !== 'LOW_BATTERY_MODE') {
        this.dispatch('LOW_BATTERY');
      }
    }
  }

  /**
   * Register callback for state changes
   */
  public onStateChange(callback: StateChangeCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(from: AppState, to: AppState, event: StateTransitionEvent): void {
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(from, to, event);
      } catch (error) {
        console.error('State change callback error:', error);
      }
    }
  }

  /**
   * Get current state
   */
  public getState(): AppState {
    return this.context.currentState;
  }

  /**
   * Get full context
   */
  public getContext(): StateMachineContext {
    return { ...this.context };
  }

  /**
   * Get current GPS polling interval
   */
  public getGpsPollingInterval(): number {
    return this.context.gpsPollingInterval;
  }

  /**
   * Check if currently tracking
   */
  public isTracking(): boolean {
    return this.isTrackingState(this.context.currentState);
  }

  /**
   * Check if in alert state
   */
  public hasAlert(): boolean {
    return this.context.hasActiveAlerts;
  }

  /**
   * Get available events for current state
   */
  public getAvailableEvents(): StateTransitionEvent[] {
    return this.transitions
      .filter(t => t.from === this.context.currentState)
      .map(t => t.event);
  }

  /**
   * Check if event can be dispatched from current state
   */
  public canDispatch(event: StateTransitionEvent): boolean {
    return this.findTransition(this.context.currentState, event) !== undefined;
  }

  /**
   * Reset to initial state
   */
  public reset(): void {
    this.stopGpsPolling();
    this.dispatch('RESET');
  }

  /**
   * Get state duration in milliseconds
   */
  public getStateDuration(): number {
    return Date.now() - this.context.enteredStateAt.getTime();
  }

  /**
   * Generate state diagram (for debugging)
   */
  public getStateDiagram(): string {
    const lines: string[] = ['stateDiagram-v2'];

    // Group transitions by from state
    const grouped = new Map<AppState, Array<{ event: string; to: AppState }>>();

    for (const t of this.transitions) {
      if (!grouped.has(t.from)) {
        grouped.set(t.from, []);
      }
      grouped.get(t.from)!.push({ event: t.event, to: t.to });
    }

    // Generate Mermaid syntax
    for (const [from, transitions] of grouped) {
      for (const { event, to } of transitions) {
        lines.push(`    ${from} --> ${to}: ${event}`);
      }
    }

    return lines.join('\n');
  }
}
