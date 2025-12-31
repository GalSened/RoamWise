/**
 * Module A: Dynamic Pacing & Sunset Safety Engine
 *
 * Calculates Safe Arrival Probability in real-time using:
 * - Trail GPX with elevation data
 * - Sunset time (ephemeris)
 * - User's current location
 * - 15-minute weighted velocity average
 * - Tobler's Hiking Function for terrain-adjusted ETA
 */

import {
  GeoPoint,
  TrailData,
  TrailSegment,
  VelocitySample,
  SafetyAssessment,
  CutoffPoint,
  AlertLevel,
  EphemerisData,
  SunsetEngineConfig,
  DEFAULT_SUNSET_CONFIG,
} from './types';

export class SunsetSafetyEngine {
  private config: SunsetEngineConfig;
  private velocitySamples: VelocitySample[] = [];
  private lastPosition: GeoPoint | null = null;
  private trail: TrailData | null = null;
  private ephemeris: EphemerisData | null = null;

  constructor(config: Partial<SunsetEngineConfig> = {}) {
    this.config = { ...DEFAULT_SUNSET_CONFIG, ...config };
  }

  /**
   * Initialize the engine with trail and ephemeris data
   */
  public initialize(trail: TrailData, ephemeris: EphemerisData): void {
    this.trail = trail;
    this.ephemeris = ephemeris;
    this.velocitySamples = [];
    this.lastPosition = null;
  }

  /**
   * Update position and calculate new safety assessment
   */
  public updatePosition(currentPosition: GeoPoint): SafetyAssessment {
    if (!this.trail || !this.ephemeris) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    // Calculate velocity if we have a previous position
    if (this.lastPosition) {
      const velocity = this.calculateVelocity(this.lastPosition, currentPosition);
      this.addVelocitySample(velocity, currentPosition.timestamp);
    }

    this.lastPosition = currentPosition;

    // Calculate remaining distance to destination
    const remainingDistance = this.calculateRemainingDistance(currentPosition);

    // Get terrain-adjusted ETA
    const averageVelocity = this.getWeightedAverageVelocity();
    const remainingTime = this.calculateETAWithTerrain(currentPosition, averageVelocity);

    // Calculate time to sunset
    const now = new Date(currentPosition.timestamp);
    const timeToSunset = (this.ephemeris.sunset.getTime() - now.getTime()) / 1000;

    // Calculate ETA
    const eta = new Date(now.getTime() + remainingTime * 1000);

    // Calculate safe arrival probability
    const safeArrivalProbability = this.calculateSafeArrivalProbability(
      remainingTime,
      timeToSunset
    );

    // Determine alert level
    const alertLevel = this.determineAlertLevel(remainingTime, timeToSunset);

    // Find cutoff point if needed
    const suggestedCutoff = alertLevel !== 'safe'
      ? this.findCutoffPoint(currentPosition, timeToSunset)
      : undefined;

    return {
      eta,
      safeArrivalProbability,
      remainingDistance,
      remainingTime,
      timeToSunset,
      alertLevel,
      suggestedCutoff,
      message: this.generateStatusMessage(alertLevel, remainingTime, timeToSunset),
    };
  }

  /**
   * Calculate velocity between two points (m/s)
   */
  private calculateVelocity(from: GeoPoint, to: GeoPoint): number {
    const distance = this.haversineDistance(from, to);
    const timeDelta = (to.timestamp - from.timestamp) / 1000; // seconds

    if (timeDelta <= 0) return 0;
    return distance / timeDelta;
  }

  /**
   * Haversine formula for distance between two points
   */
  private haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(p2.lat - p1.lat);
    const dLon = this.toRadians(p2.lon - p1.lon);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(p1.lat)) * Math.cos(this.toRadians(p2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Add velocity sample with time-decaying weight
   */
  private addVelocitySample(velocity: number, timestamp: number): void {
    // Filter out stationary samples for velocity calculation
    if (velocity < this.config.stationaryThreshold) {
      return;
    }

    this.velocitySamples.push({
      velocity,
      timestamp,
      weight: 1.0, // Initial weight, will decay
    });

    // Remove samples older than velocity window
    const windowMs = this.config.velocityWindowMinutes * 60 * 1000;
    const cutoffTime = timestamp - windowMs;
    this.velocitySamples = this.velocitySamples.filter(s => s.timestamp > cutoffTime);
  }

  /**
   * Calculate 15-minute weighted moving average velocity
   * Uses linear decay: newer samples have higher weight
   */
  private getWeightedAverageVelocity(): number {
    if (this.velocitySamples.length === 0) {
      return 1.2; // Default walking speed ~4.3 km/h
    }

    if (this.velocitySamples.length < this.config.minSamplesForETA) {
      // Not enough samples, use simple average
      const sum = this.velocitySamples.reduce((acc, s) => acc + s.velocity, 0);
      return sum / this.velocitySamples.length;
    }

    const now = this.velocitySamples[this.velocitySamples.length - 1].timestamp;
    const windowMs = this.config.velocityWindowMinutes * 60 * 1000;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const sample of this.velocitySamples) {
      // Linear decay: weight = 1 - (age / window)
      const age = now - sample.timestamp;
      const weight = Math.max(0, 1 - age / windowMs);

      weightedSum += sample.velocity * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 1.2;
  }

  /**
   * Calculate remaining distance along trail to destination
   */
  private calculateRemainingDistance(currentPosition: GeoPoint): number {
    if (!this.trail) return 0;

    // Find nearest segment
    const { segmentIndex, projectionRatio } = this.findNearestSegment(currentPosition);

    // Calculate distance remaining on current segment
    const currentSegment = this.trail.segments[segmentIndex];
    const distanceOnCurrentSegment = currentSegment.distance * (1 - projectionRatio);

    // Sum remaining segments
    let remainingDistance = distanceOnCurrentSegment;
    for (let i = segmentIndex + 1; i < this.trail.segments.length; i++) {
      remainingDistance += this.trail.segments[i].distance;
    }

    return remainingDistance;
  }

  /**
   * Find the nearest trail segment to current position
   */
  private findNearestSegment(position: GeoPoint): { segmentIndex: number; projectionRatio: number } {
    if (!this.trail) return { segmentIndex: 0, projectionRatio: 0 };

    let nearestIndex = 0;
    let nearestDistance = Infinity;
    let nearestRatio = 0;

    for (let i = 0; i < this.trail.segments.length; i++) {
      const segment = this.trail.segments[i];
      const { distance, ratio } = this.pointToSegmentDistance(position, segment);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
        nearestRatio = ratio;
      }
    }

    return { segmentIndex: nearestIndex, projectionRatio: nearestRatio };
  }

  /**
   * Calculate perpendicular distance from point to segment
   * Returns distance and projection ratio (0-1 along segment)
   */
  private pointToSegmentDistance(
    point: GeoPoint,
    segment: TrailSegment
  ): { distance: number; ratio: number } {
    const { start, end } = segment;

    // Vector from start to end
    const dx = end.lon - start.lon;
    const dy = end.lat - start.lat;

    // Vector from start to point
    const px = point.lon - start.lon;
    const py = point.lat - start.lat;

    // Project point onto segment
    const dot = px * dx + py * dy;
    const lenSq = dx * dx + dy * dy;

    let ratio = lenSq > 0 ? dot / lenSq : 0;
    ratio = Math.max(0, Math.min(1, ratio)); // Clamp to segment

    // Find closest point on segment
    const closestLon = start.lon + ratio * dx;
    const closestLat = start.lat + ratio * dy;

    const distance = this.haversineDistance(point, {
      lat: closestLat,
      lon: closestLon,
      timestamp: point.timestamp,
    });

    return { distance, ratio };
  }

  /**
   * Calculate ETA using Tobler's Hiking Function for terrain adjustment
   *
   * Tobler's formula: v = 6 * exp(-3.5 * |slope + 0.05|) km/h
   * Adjusted to: velocityFactor = exp(-3.5 * |slope + 0.05|)
   */
  private calculateETAWithTerrain(currentPosition: GeoPoint, baseVelocity: number): number {
    if (!this.trail) return 0;

    const { segmentIndex, projectionRatio } = this.findNearestSegment(currentPosition);
    let totalTime = 0;

    // Time for remainder of current segment
    const currentSegment = this.trail.segments[segmentIndex];
    const remainingOnCurrent = currentSegment.distance * (1 - projectionRatio);
    const currentFactor = this.toblerFactor(currentSegment.averageSlope);
    totalTime += remainingOnCurrent / (baseVelocity * currentFactor);

    // Time for remaining segments
    for (let i = segmentIndex + 1; i < this.trail.segments.length; i++) {
      const segment = this.trail.segments[i];
      const factor = this.toblerFactor(segment.averageSlope);
      const adjustedVelocity = baseVelocity * factor;
      totalTime += segment.distance / adjustedVelocity;
    }

    return totalTime; // seconds
  }

  /**
   * Tobler's Hiking Function velocity factor
   * Returns multiplier for base velocity based on slope
   */
  private toblerFactor(slope: number): number {
    // Tobler's formula: exp(-3.5 * |slope + 0.05|)
    // slope is expressed as grade (e.g., 0.1 = 10% uphill)
    return Math.exp(-3.5 * Math.abs(slope + 0.05));
  }

  /**
   * Calculate probability of safe arrival before sunset
   * Uses Gaussian probability with safety buffer
   */
  private calculateSafeArrivalProbability(
    remainingTime: number,
    timeToSunset: number
  ): number {
    const bufferSeconds = this.config.safetyBufferMinutes * 60;
    const safeWindow = timeToSunset - bufferSeconds;

    if (remainingTime <= 0) return 1.0;
    if (safeWindow <= 0) return 0.0;

    // Margin is how much time we have beyond ETA
    const margin = safeWindow - remainingTime;

    // Use sigmoid function for smooth probability curve
    // sigma determines the "uncertainty window"
    const sigma = Math.max(remainingTime * 0.15, 300); // 15% of remaining time, min 5 min
    const probability = 1 / (1 + Math.exp(-margin / sigma));

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Determine alert level based on ETA vs sunset
   */
  private determineAlertLevel(remainingTime: number, timeToSunset: number): AlertLevel {
    const bufferSeconds = this.config.safetyBufferMinutes * 60;
    const margin = timeToSunset - remainingTime;

    if (margin > bufferSeconds * 2) {
      return 'safe';       // > 1 hour buffer
    } else if (margin > bufferSeconds) {
      return 'caution';    // 30-60 min buffer
    } else if (margin > 0) {
      return 'warning';    // < 30 min buffer but before sunset
    } else {
      return 'critical';   // ETA after sunset
    }
  }

  /**
   * Find a suitable cutoff point if user should turn back
   */
  private findCutoffPoint(
    currentPosition: GeoPoint,
    timeToSunset: number
  ): CutoffPoint | undefined {
    if (!this.trail) return undefined;

    const { segmentIndex } = this.findNearestSegment(currentPosition);
    const bufferSeconds = this.config.safetyBufferMinutes * 60;
    const safeReturnTime = (timeToSunset - bufferSeconds) / 2; // Time to go and return

    // Search backwards for a safe turnaround point
    let accumulatedTime = 0;
    const baseVelocity = this.getWeightedAverageVelocity();

    for (let i = segmentIndex; i >= 0; i--) {
      const segment = this.trail.segments[i];
      const factor = this.toblerFactor(-segment.averageSlope); // Reverse slope for return
      const segmentTime = segment.distance / (baseVelocity * factor);

      accumulatedTime += segmentTime;

      if (accumulatedTime > safeReturnTime && i < segmentIndex) {
        // Previous waypoint is the suggested cutoff
        const cutoffPoint = this.trail.waypoints[i + 1] || segment.end;

        return {
          location: cutoffPoint,
          name: `Turnaround Point ${i + 1}`,
          distanceFromCurrent: this.calculateDistanceBetweenIndices(i + 1, segmentIndex),
          estimatedTimeToReach: accumulatedTime - segmentTime,
          reason: 'sunset',
        };
      }
    }

    // If no safe cutoff, suggest returning to trailhead immediately
    return {
      location: this.trail.trailhead,
      name: 'Trailhead',
      distanceFromCurrent: this.calculateRemainingDistance(currentPosition),
      estimatedTimeToReach: 0,
      reason: 'sunset',
    };
  }

  /**
   * Calculate distance between two segment indices
   */
  private calculateDistanceBetweenIndices(fromIndex: number, toIndex: number): number {
    if (!this.trail) return 0;

    let distance = 0;
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    for (let i = start; i < end; i++) {
      distance += this.trail.segments[i].distance;
    }

    return distance;
  }

  /**
   * Generate human-readable status message
   */
  private generateStatusMessage(
    alertLevel: AlertLevel,
    remainingTime: number,
    timeToSunset: number
  ): string {
    const etaMinutes = Math.round(remainingTime / 60);
    const sunsetMinutes = Math.round(timeToSunset / 60);

    switch (alertLevel) {
      case 'safe':
        return `On track. ETA in ${etaMinutes} min, ${sunsetMinutes} min until sunset.`;
      case 'caution':
        return `Maintain pace. ETA in ${etaMinutes} min, sunset in ${sunsetMinutes} min.`;
      case 'warning':
        return `⚠️ Tight margin. Consider turning back. ETA ${etaMinutes} min, sunset in ${sunsetMinutes} min.`;
      case 'critical':
        return `🚨 TURN BACK NOW. You will not reach destination before dark.`;
    }
  }

  /**
   * Check if user is stationary
   */
  public isStationary(): boolean {
    if (this.velocitySamples.length < 2) return false;

    const recentVelocity = this.getWeightedAverageVelocity();
    return recentVelocity < this.config.stationaryThreshold;
  }

  /**
   * Get current average velocity
   */
  public getCurrentVelocity(): number {
    return this.getWeightedAverageVelocity();
  }

  /**
   * Reset the engine state
   */
  public reset(): void {
    this.velocitySamples = [];
    this.lastPosition = null;
  }
}
