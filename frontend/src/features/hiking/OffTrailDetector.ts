/**
 * Module B: Off-Trail Detection System
 *
 * Detects when user strays >50m from trail path with:
 * - Hysteresis filtering (3 consecutive readings to trigger alert)
 * - Median filter for GPS noise reduction
 * - Return vector calculation (direction + distance to nearest trail)
 */

import {
  GeoPoint,
  TrailData,
  TrailSegment,
  OffTrailStatus,
  ReturnVector,
  OffTrailDetectorConfig,
  DEFAULT_OFF_TRAIL_CONFIG,
} from './types';

export class OffTrailDetector {
  private config: OffTrailDetectorConfig;
  private trail: TrailData | null = null;
  private deviationHistory: number[] = [];
  private consecutiveOffTrailCount = 0;
  private lastOnTrailPosition: GeoPoint | null = null;
  private isCurrentlyOffTrail = false;

  constructor(config: Partial<OffTrailDetectorConfig> = {}) {
    this.config = { ...DEFAULT_OFF_TRAIL_CONFIG, ...config };
  }

  /**
   * Initialize detector with trail data
   */
  public initialize(trail: TrailData): void {
    this.trail = trail;
    this.reset();
  }

  /**
   * Check if user is off trail and calculate return vector
   */
  public checkPosition(position: GeoPoint): OffTrailStatus {
    if (!this.trail) {
      throw new Error('Detector not initialized. Call initialize() first.');
    }

    // Find nearest point on trail
    const { nearestPoint, distance, segmentIndex } = this.findNearestTrailPoint(position);

    // Apply median filter to smooth GPS noise
    const filteredDistance = this.applyMedianFilter(distance);

    // Calculate effective threshold including GPS accuracy
    const gpsAccuracy = position.accuracy || 0;
    const effectiveThreshold = this.config.deviationThresholdMeters +
                               this.config.gpsAccuracyBuffer +
                               gpsAccuracy;

    // Check if off trail
    const isOffTrail = filteredDistance > effectiveThreshold;

    // Update hysteresis counter
    if (isOffTrail) {
      this.consecutiveOffTrailCount++;
    } else {
      this.consecutiveOffTrailCount = 0;
      this.lastOnTrailPosition = position;
      this.isCurrentlyOffTrail = false;
    }

    // Trigger off-trail only after N consecutive readings
    const triggeredOffTrail = this.consecutiveOffTrailCount >= this.config.hysteresisCount;

    if (triggeredOffTrail && !this.isCurrentlyOffTrail) {
      this.isCurrentlyOffTrail = true;
    }

    // Calculate return vector if off trail
    const returnVector = this.isCurrentlyOffTrail
      ? this.calculateReturnVector(position, nearestPoint, segmentIndex)
      : undefined;

    // Calculate confidence based on GPS accuracy and consistency
    const confidence = this.calculateConfidence(position, filteredDistance);

    return {
      isOffTrail: this.isCurrentlyOffTrail,
      deviationDistance: filteredDistance,
      consecutiveOffTrailReadings: this.consecutiveOffTrailCount,
      returnVector,
      confidence,
      lastOnTrailPosition: this.lastOnTrailPosition || undefined,
    };
  }

  /**
   * Find the nearest point on the trail to current position
   */
  private findNearestTrailPoint(
    position: GeoPoint
  ): { nearestPoint: GeoPoint; distance: number; segmentIndex: number } {
    if (!this.trail) {
      throw new Error('Trail not initialized');
    }

    let nearestPoint: GeoPoint = this.trail.segments[0].start;
    let nearestDistance = Infinity;
    let nearestSegmentIndex = 0;

    for (let i = 0; i < this.trail.segments.length; i++) {
      const segment = this.trail.segments[i];
      const { closestPoint, distance } = this.pointToSegmentClosest(position, segment);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = closestPoint;
        nearestSegmentIndex = i;
      }
    }

    return {
      nearestPoint,
      distance: nearestDistance,
      segmentIndex: nearestSegmentIndex,
    };
  }

  /**
   * Find closest point on a segment to given position
   * Uses perpendicular projection
   */
  private pointToSegmentClosest(
    point: GeoPoint,
    segment: TrailSegment
  ): { closestPoint: GeoPoint; distance: number } {
    const { start, end } = segment;

    // Convert to local Cartesian for projection calculation
    // Using simple equirectangular approximation (valid for small distances)
    const cosLat = Math.cos(this.toRadians(point.lat));

    // Segment vector
    const dx = (end.lon - start.lon) * cosLat;
    const dy = end.lat - start.lat;

    // Point to start vector
    const px = (point.lon - start.lon) * cosLat;
    const py = point.lat - start.lat;

    // Project point onto segment line
    const dot = px * dx + py * dy;
    const lenSq = dx * dx + dy * dy;

    let t = lenSq > 0 ? dot / lenSq : 0;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment

    // Calculate closest point
    const closestLon = start.lon + t * (end.lon - start.lon);
    const closestLat = start.lat + t * (end.lat - start.lat);

    // Interpolate altitude if available
    const closestAlt = start.altitude !== undefined && end.altitude !== undefined
      ? start.altitude + t * (end.altitude - start.altitude)
      : undefined;

    const closestPoint: GeoPoint = {
      lat: closestLat,
      lon: closestLon,
      altitude: closestAlt,
      timestamp: point.timestamp,
    };

    // Calculate actual distance using Haversine
    const distance = this.haversineDistance(point, closestPoint);

    return { closestPoint, distance };
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

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Apply median filter to smooth GPS noise
   * Uses sliding window of recent deviation readings
   */
  private applyMedianFilter(newDeviation: number): number {
    this.deviationHistory.push(newDeviation);

    // Keep only window size samples
    while (this.deviationHistory.length > this.config.medianFilterWindowSize) {
      this.deviationHistory.shift();
    }

    // Calculate median
    const sorted = [...this.deviationHistory].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate return vector to guide user back to trail
   */
  private calculateReturnVector(
    currentPosition: GeoPoint,
    nearestTrailPoint: GeoPoint,
    segmentIndex: number
  ): ReturnVector {
    // Calculate bearing from current position to nearest trail point
    const direction = this.calculateBearing(currentPosition, nearestTrailPoint);

    // Calculate distance
    const distance = this.haversineDistance(currentPosition, nearestTrailPoint);

    return {
      direction,
      distance,
      nearestTrailPoint,
      nearestSegmentIndex: segmentIndex,
    };
  }

  /**
   * Calculate bearing (compass direction) from point A to point B
   * Returns degrees (0 = North, 90 = East, etc.)
   */
  private calculateBearing(from: GeoPoint, to: GeoPoint): number {
    const lat1 = this.toRadians(from.lat);
    const lat2 = this.toRadians(to.lat);
    const dLon = this.toRadians(to.lon - from.lon);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = this.toDegrees(Math.atan2(y, x));

    // Normalize to 0-360
    bearing = (bearing + 360) % 360;

    return bearing;
  }

  /**
   * Calculate confidence in the off-trail detection
   * Based on GPS accuracy and reading consistency
   */
  private calculateConfidence(position: GeoPoint, filteredDistance: number): number {
    let confidence = 1.0;

    // Reduce confidence based on GPS accuracy
    const gpsAccuracy = position.accuracy || 0;
    if (gpsAccuracy > 0) {
      // If GPS accuracy is worse than our threshold, reduce confidence
      const accuracyFactor = Math.max(0, 1 - gpsAccuracy / this.config.deviationThresholdMeters);
      confidence *= (0.5 + 0.5 * accuracyFactor);
    }

    // Reduce confidence if we don't have enough history
    const historyFactor = Math.min(1, this.deviationHistory.length / this.config.medianFilterWindowSize);
    confidence *= (0.7 + 0.3 * historyFactor);

    // Increase confidence with consistent readings
    if (this.consecutiveOffTrailCount >= this.config.hysteresisCount) {
      confidence = Math.min(1, confidence * 1.2);
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get compass direction label from bearing
   */
  public static bearingToDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  /**
   * Format return vector as human-readable instruction
   */
  public static formatReturnInstruction(returnVector: ReturnVector): string {
    const direction = OffTrailDetector.bearingToDirection(returnVector.direction);
    const distanceMeters = Math.round(returnVector.distance);

    if (distanceMeters < 100) {
      return `Head ${direction} for ${distanceMeters}m to return to trail`;
    } else {
      const distanceKm = (distanceMeters / 1000).toFixed(1);
      return `Head ${direction} for ${distanceKm}km to return to trail`;
    }
  }

  /**
   * Check if user just returned to trail
   */
  public didJustReturnToTrail(): boolean {
    return this.isCurrentlyOffTrail === false &&
           this.consecutiveOffTrailCount === 0 &&
           this.lastOnTrailPosition !== null;
  }

  /**
   * Get the threshold being used (including GPS buffer)
   */
  public getEffectiveThreshold(gpsAccuracy: number = 0): number {
    return this.config.deviationThresholdMeters +
           this.config.gpsAccuracyBuffer +
           gpsAccuracy;
  }

  /**
   * Reset detector state
   */
  public reset(): void {
    this.deviationHistory = [];
    this.consecutiveOffTrailCount = 0;
    this.lastOnTrailPosition = null;
    this.isCurrentlyOffTrail = false;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<OffTrailDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
