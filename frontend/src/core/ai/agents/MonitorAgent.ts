// @ts-nocheck
/**
 * Monitor Agent - Intervention System
 *
 * Adaptive hybrid polling agent that monitors active trips and generates
 * proactive interventions for:
 * - Weather + Outdoor destination conflicts
 * - Traffic delays > 30 minutes
 * - Weather degradation during trip
 */

import type {
  LatLng,
  WeatherData,
  Intervention,
  InterventionSeverity,
  InterventionType,
  TripContext,
  OptimizedStop
} from '@/types';
import type { Agent, AgentContext } from './types';
import { EventBus } from '@/lib/utils/events';
import { telemetry } from '@/lib/telemetry';

const API_BASE = '/api';

// ═══════════════════════════════════════════════════════════════
// CHECK INTERVALS (milliseconds)
// ═══════════════════════════════════════════════════════════════

const CHECK_INTERVALS = {
  ACTIVE_NAVIGATION: 3 * 60 * 1000,    // 3 minutes - user driving
  TRIP_DURING: 5 * 60 * 1000,          // 5 minutes - between stops
  TRIP_PRE_DEPARTURE: 10 * 60 * 1000,  // 10 minutes - before start
  TRIP_UPCOMING: 30 * 60 * 1000,       // 30 minutes - starts tomorrow
  BACKGROUND: 0                         // disabled - no active trip
} as const;

type MonitorContext = 'navigation' | 'during' | 'pre_departure' | 'upcoming' | 'background';

// ═══════════════════════════════════════════════════════════════
// MONITOR AGENT CLASS
// ═══════════════════════════════════════════════════════════════

export class MonitorAgent extends EventBus implements Agent {
  id = 'agent_monitor';
  role = 'trip_monitor';

  private context: AgentContext;
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private monitorContext: MonitorContext = 'background';
  private activeTrip: TripContext | null = null;
  private interventionCache = new Map<string, Intervention>();
  private previousWeather: WeatherData | null = null;

  constructor(context: AgentContext) {
    super();
    this.context = context;
  }

  // ─────────────────────────────────────────────────────────────
  // AGENT INTERFACE
  // ─────────────────────────────────────────────────────────────

  async process(message: {
    action: 'start_monitoring' | 'stop_monitoring' | 'check_now' | 'update_context';
    tripContext?: TripContext;
    monitorContext?: MonitorContext;
  }): Promise<{ interventions: Intervention[]; status: string }> {

    switch (message.action) {
      case 'start_monitoring':
        if (message.tripContext) {
          this.startMonitoring(message.tripContext, message.monitorContext || 'during');
        }
        return { interventions: [], status: 'monitoring_started' };

      case 'stop_monitoring':
        this.stopMonitoring();
        return { interventions: [], status: 'monitoring_stopped' };

      case 'check_now':
        if (this.activeTrip) {
          const interventions = await this.checkInterventions();
          return { interventions, status: 'check_complete' };
        }
        return { interventions: [], status: 'no_active_trip' };

      case 'update_context':
        if (message.monitorContext) {
          this.updateMonitorContext(message.monitorContext);
        }
        if (message.tripContext) {
          this.activeTrip = message.tripContext;
        }
        return { interventions: [], status: 'context_updated' };

      default:
        return { interventions: [], status: 'unknown_action' };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MONITORING LIFECYCLE
  // ─────────────────────────────────────────────────────────────

  startMonitoring(tripContext: TripContext, context: MonitorContext = 'during'): void {
    this.activeTrip = tripContext;
    this.monitorContext = context;
    this.previousWeather = tripContext.currentWeather;

    // Clear any existing timer
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    const interval = this.getCheckInterval(context);
    if (interval > 0) {
      this.checkTimer = setInterval(() => this.runScheduledCheck(), interval);

      telemetry.track('monitor_agent_started', {
        context,
        interval,
        tripId: tripContext.tripId
      });

      this.emit('monitoring-started', { tripId: tripContext.tripId, context });
    }
  }

  stopMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    const tripId = this.activeTrip?.tripId;
    this.activeTrip = null;
    this.monitorContext = 'background';
    this.previousWeather = null;
    this.interventionCache.clear();

    telemetry.track('monitor_agent_stopped', { tripId });
    this.emit('monitoring-stopped', { tripId });
  }

  updateMonitorContext(context: MonitorContext): void {
    if (this.monitorContext === context) return;

    this.monitorContext = context;
    const interval = this.getCheckInterval(context);

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    if (interval > 0 && this.activeTrip) {
      this.checkTimer = setInterval(() => this.runScheduledCheck(), interval);
    }

    telemetry.track('monitor_context_updated', { context, interval });
    this.emit('context-updated', { context, interval });
  }

  private getCheckInterval(context: MonitorContext): number {
    switch (context) {
      case 'navigation': return CHECK_INTERVALS.ACTIVE_NAVIGATION;
      case 'during': return CHECK_INTERVALS.TRIP_DURING;
      case 'pre_departure': return CHECK_INTERVALS.TRIP_PRE_DEPARTURE;
      case 'upcoming': return CHECK_INTERVALS.TRIP_UPCOMING;
      default: return CHECK_INTERVALS.BACKGROUND;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SCHEDULED CHECK
  // ─────────────────────────────────────────────────────────────

  private async runScheduledCheck(): Promise<void> {
    if (!this.activeTrip) return;

    try {
      const interventions = await this.checkInterventions();

      if (interventions.length > 0) {
        // Adjust check frequency based on severity
        const maxSeverity = this.getMaxSeverity(interventions);
        this.adjustCheckFrequency(maxSeverity);

        this.emit('interventions-detected', interventions);
      }
    } catch (error) {
      telemetry.track('monitor_check_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private adjustCheckFrequency(severity: InterventionSeverity): void {
    // More frequent checks for urgent interventions
    const newInterval = severity === 'urgent'
      ? 1 * 60 * 1000  // 1 minute
      : severity === 'warning'
        ? 3 * 60 * 1000  // 3 minutes
        : this.getCheckInterval(this.monitorContext);

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = setInterval(() => this.runScheduledCheck(), newInterval);
    }
  }

  private getMaxSeverity(interventions: Intervention[]): InterventionSeverity {
    if (interventions.some(i => i.severity === 'urgent')) return 'urgent';
    if (interventions.some(i => i.severity === 'warning')) return 'warning';
    return 'info';
  }

  // ─────────────────────────────────────────────────────────────
  // INTERVENTION CHECKS
  // ─────────────────────────────────────────────────────────────

  async checkInterventions(): Promise<Intervention[]> {
    if (!this.activeTrip) return [];

    const startTime = performance.now();

    try {
      // Try backend API first
      const response = await fetch(`${API_BASE}/planner/interventions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: this.activeTrip.destination,
          currentWeather: this.activeTrip.currentWeather,
          previousWeather: this.previousWeather,
          liveTrafficDelay: this.activeTrip.liveTrafficDelay
        })
      });

      if (response.ok) {
        const result = await response.json();
        const interventions = result.interventions || [];

        // Update previous weather for degradation tracking
        this.previousWeather = this.activeTrip.currentWeather;

        // Cache and dedupe interventions
        const newInterventions = this.filterNewInterventions(interventions);

        telemetry.track('interventions_checked', {
          total: interventions.length,
          new: newInterventions.length,
          duration: performance.now() - startTime
        });

        return newInterventions;
      }
    } catch {
      // Fall back to local checks
    }

    // Local intervention checks (fallback)
    return this.localInterventionChecks();
  }

  private async localInterventionChecks(): Promise<Intervention[]> {
    if (!this.activeTrip) return [];

    const interventions: Intervention[] = [];

    // TRIGGER 1: Weather + Outdoor Destination
    const weatherOutdoorIntervention = this.checkWeatherOutdoorConflict();
    if (weatherOutdoorIntervention) {
      interventions.push(weatherOutdoorIntervention);
    }

    // TRIGGER 2: Traffic Delay
    const trafficIntervention = this.checkTrafficDelay();
    if (trafficIntervention) {
      interventions.push(trafficIntervention);
    }

    // TRIGGER 3: Weather Degradation
    const degradationIntervention = this.checkWeatherDegradation();
    if (degradationIntervention) {
      interventions.push(degradationIntervention);
    }

    // Update previous weather
    this.previousWeather = this.activeTrip.currentWeather;

    return this.filterNewInterventions(interventions);
  }

  // ─────────────────────────────────────────────────────────────
  // TRIGGER 1: Weather + Outdoor Conflict
  // ─────────────────────────────────────────────────────────────

  private checkWeatherOutdoorConflict(): Intervention | null {
    if (!this.activeTrip?.destination.isOutdoor) return null;

    const weather = this.activeTrip.currentWeather;
    const precipProb = weather.precipitation || 0;
    const visibility = weather.visibility || 10;
    const windSpeed = weather.windSpeed || 0;

    // Check thresholds
    const hasPrecipitation = precipProb > 40;
    const hasLowVisibility = visibility < 2;
    const hasHighWind = windSpeed > 50;

    if (!hasPrecipitation && !hasLowVisibility && !hasHighWind) {
      return null;
    }

    const reasoning: string[] = [];
    let severity: InterventionSeverity = 'info';

    if (hasPrecipitation) {
      reasoning.push(`Rain probability: ${precipProb}% exceeds 40% threshold`);
      severity = precipProb > 70 ? 'urgent' : 'warning';
    }

    if (hasLowVisibility) {
      reasoning.push(`Visibility: ${visibility}km below 2km minimum`);
      severity = visibility < 1 ? 'urgent' : 'warning';
    }

    if (hasHighWind) {
      reasoning.push(`Wind speed: ${windSpeed}km/h exceeds 50km/h threshold`);
      severity = windSpeed > 70 ? 'urgent' : 'warning';
    }

    return {
      id: `weather_outdoor_${Date.now()}`,
      type: 'weather_outdoor_conflict',
      severity,
      title: 'Weather Alert for Outdoor Destination',
      message: `Current weather conditions may affect your outdoor activity at ${this.activeTrip.destination.name}.`,
      reasoning,
      suggestions: [{
        id: 'suggest_indoor',
        type: 'alternative_place',
        actionLabel: 'Find Indoor Alternatives',
        place: {
          name: 'Indoor alternatives nearby',
          location: this.activeTrip.destination.location,
          distance: 0,
          isIndoor: true
        }
      }],
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  // ─────────────────────────────────────────────────────────────
  // TRIGGER 2: Traffic Delay
  // ─────────────────────────────────────────────────────────────

  private checkTrafficDelay(): Intervention | null {
    const delay = this.activeTrip?.liveTrafficDelay || 0;

    if (delay < 30 * 60) return null; // Less than 30 minutes

    const delayMinutes = Math.round(delay / 60);

    return {
      id: `traffic_delay_${Date.now()}`,
      type: 'traffic_delay',
      severity: delay > 60 * 60 ? 'urgent' : 'warning',
      title: 'Significant Traffic Delay',
      message: `Traffic is adding ${delayMinutes} minutes to your trip.`,
      reasoning: [
        `Live traffic delay: ${delayMinutes} minutes`,
        'This exceeds the 30-minute threshold for intervention'
      ],
      suggestions: [{
        id: 'reroute',
        type: 'route_change',
        actionLabel: 'Find Alternative Route'
      }],
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  // ─────────────────────────────────────────────────────────────
  // TRIGGER 3: Weather Degradation
  // ─────────────────────────────────────────────────────────────

  private checkWeatherDegradation(): Intervention | null {
    if (!this.previousWeather || !this.activeTrip?.currentWeather) return null;

    const prev = this.previousWeather;
    const curr = this.activeTrip.currentWeather;

    // Calculate degradation score
    const visibilityDegradation = prev.visibility && curr.visibility
      ? Math.max(0, (prev.visibility - curr.visibility) / prev.visibility)
      : 0;

    const precipDegradation = Math.max(0, ((curr.precipitation || 0) - (prev.precipitation || 0)) / 100);

    const windDegradation = (prev.windSpeed || 0) > 0
      ? Math.max(0, ((curr.windSpeed || 0) - (prev.windSpeed || 0)) / 50)
      : 0;

    const degradationScore = Math.max(visibilityDegradation, precipDegradation, windDegradation);

    if (degradationScore < 0.3) return null;

    let severity: InterventionSeverity = 'info';
    if (degradationScore > 0.7) severity = 'urgent';
    else if (degradationScore > 0.3) severity = 'warning';

    const reasoning: string[] = [];
    if (visibilityDegradation > 0.3) {
      reasoning.push(`Visibility dropped from ${prev.visibility}km to ${curr.visibility}km`);
    }
    if (precipDegradation > 0.3) {
      reasoning.push(`Precipitation increased from ${prev.precipitation || 0}% to ${curr.precipitation || 0}%`);
    }
    if (windDegradation > 0.3) {
      reasoning.push(`Wind speed increased from ${prev.windSpeed || 0}km/h to ${curr.windSpeed || 0}km/h`);
    }

    return {
      id: `weather_degradation_${Date.now()}`,
      type: 'weather_degradation',
      severity,
      title: 'Weather Conditions Worsening',
      message: 'Weather conditions have significantly degraded since your last check.',
      reasoning,
      suggestions: [{
        id: 'delay_trip',
        type: 'time_adjustment',
        actionLabel: 'Consider Delaying Trip'
      }],
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  }

  // ─────────────────────────────────────────────────────────────
  // INTERVENTION MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  private filterNewInterventions(interventions: Intervention[]): Intervention[] {
    return interventions.filter(intervention => {
      // Create a key based on type and severity to avoid duplicates
      const key = `${intervention.type}_${intervention.severity}`;

      // Check if we've already shown this intervention recently (within 10 mins)
      const cached = this.interventionCache.get(key);
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.createdAt).getTime();
        if (cacheAge < 10 * 60 * 1000) return false;
      }

      // Cache this intervention
      this.interventionCache.set(key, intervention);
      return true;
    });
  }

  acknowledgeIntervention(interventionId: string): void {
    // Find and update intervention status
    for (const [key, intervention] of this.interventionCache) {
      if (intervention.id === interventionId) {
        intervention.status = 'acknowledged';
        this.interventionCache.set(key, intervention);
        this.emit('intervention-acknowledged', intervention);
        break;
      }
    }

    telemetry.track('intervention_acknowledged', { interventionId });
  }

  acceptSuggestion(interventionId: string, suggestionId: string): void {
    for (const [key, intervention] of this.interventionCache) {
      if (intervention.id === interventionId) {
        intervention.status = 'accepted';
        this.interventionCache.set(key, intervention);
        this.emit('suggestion-accepted', { intervention, suggestionId });
        break;
      }
    }

    telemetry.track('suggestion_accepted', { interventionId, suggestionId });
  }

  dismissIntervention(interventionId: string): void {
    for (const [key, intervention] of this.interventionCache) {
      if (intervention.id === interventionId) {
        intervention.status = 'dismissed';
        this.interventionCache.set(key, intervention);
        this.emit('intervention-dismissed', intervention);
        break;
      }
    }

    telemetry.track('intervention_dismissed', { interventionId });
  }

  getPendingInterventions(): Intervention[] {
    return Array.from(this.interventionCache.values())
      .filter(i => i.status === 'pending');
  }

  clearInterventions(): void {
    this.interventionCache.clear();
    this.emit('interventions-cleared');
  }

  // ─────────────────────────────────────────────────────────────
  // STATE ACCESSORS
  // ─────────────────────────────────────────────────────────────

  isMonitoring(): boolean {
    return this.checkTimer !== null && this.activeTrip !== null;
  }

  getActiveTrip(): TripContext | null {
    return this.activeTrip;
  }

  getMonitorContext(): MonitorContext {
    return this.monitorContext;
  }

  getCheckInterval(): number {
    return this.getCheckInterval(this.monitorContext);
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY & SINGLETON
// ═══════════════════════════════════════════════════════════════

let instance: MonitorAgent | null = null;

export function getMonitorAgent(context?: AgentContext): MonitorAgent {
  if (!instance && context) {
    instance = new MonitorAgent(context);
  }
  if (!instance) {
    throw new Error('MonitorAgent not initialized. Call with AgentContext first.');
  }
  return instance;
}

export function createMonitorAgent(context: AgentContext): MonitorAgent {
  return new MonitorAgent(context);
}
