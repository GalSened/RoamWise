/**
 * Module C: Smart Offline Caching Strategy
 *
 * Triggers download when:
 * - Distance to trailhead < 10km
 * - Network status is "good" or better
 * - Battery level > 20%
 *
 * Manages OfflineTrailPackage for fully offline operation
 */

import {
  GeoPoint,
  TrailData,
  OfflineTrailPackage,
  CacheDownloadTrigger,
  CacheManagerConfig,
  NetworkStatus,
  BoundingBox,
  DEFAULT_CACHE_CONFIG,
} from './types';

export interface CacheStorageAdapter {
  get(key: string): Promise<OfflineTrailPackage | null>;
  set(key: string, value: OfflineTrailPackage): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  getStorageUsed(): Promise<number>;
  getStorageQuota(): Promise<number>;
}

export interface PackageDownloader {
  downloadPackage(trailId: string, boundingBox: BoundingBox): Promise<OfflineTrailPackage>;
  getDownloadProgress(): number;
  cancelDownload(): void;
}

export class OfflineCacheManager {
  private config: CacheManagerConfig;
  private storage: CacheStorageAdapter;
  private downloader: PackageDownloader;
  private currentDownloadTrailId: string | null = null;
  private cachedPackages: Map<string, OfflineTrailPackage> = new Map();

  constructor(
    storage: CacheStorageAdapter,
    downloader: PackageDownloader,
    config: Partial<CacheManagerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.storage = storage;
    this.downloader = downloader;
  }

  /**
   * Check if download should be triggered based on current conditions
   */
  public evaluateDownloadTrigger(
    userPosition: GeoPoint,
    trailhead: GeoPoint,
    networkStatus: NetworkStatus,
    batteryLevel: number
  ): CacheDownloadTrigger {
    const distanceToTrailhead = this.haversineDistance(userPosition, trailhead);
    const distanceKm = distanceToTrailhead / 1000;

    const conditions = {
      proximityMet: distanceKm < this.config.proximityThresholdKm,
      networkMet: this.isNetworkSufficient(networkStatus),
      batteryMet: batteryLevel > this.config.minBatteryLevel,
    };

    const shouldDownload = this.config.autoDownloadEnabled &&
                           conditions.proximityMet &&
                           conditions.networkMet &&
                           conditions.batteryMet;

    let reason: string | undefined;
    if (!shouldDownload) {
      if (!conditions.proximityMet) {
        reason = `Too far from trailhead (${distanceKm.toFixed(1)}km > ${this.config.proximityThresholdKm}km)`;
      } else if (!conditions.networkMet) {
        reason = `Network quality insufficient (${networkStatus})`;
      } else if (!conditions.batteryMet) {
        reason = `Battery too low (${Math.round(batteryLevel * 100)}% < ${Math.round(this.config.minBatteryLevel * 100)}%)`;
      } else if (!this.config.autoDownloadEnabled) {
        reason = 'Auto-download disabled';
      }
    }

    return {
      distanceToTrailhead,
      networkStatus,
      batteryLevel,
      shouldDownload,
      reason,
    };
  }

  /**
   * Check if network quality meets minimum requirement
   */
  private isNetworkSufficient(status: NetworkStatus): boolean {
    const networkRanking: Record<NetworkStatus, number> = {
      excellent: 4,
      good: 3,
      fair: 2,
      poor: 1,
      offline: 0,
    };

    return networkRanking[status] >= networkRanking[this.config.minNetworkQuality];
  }

  /**
   * Download and cache trail package
   */
  public async downloadAndCachePackage(
    trail: TrailData,
    boundingBox: BoundingBox
  ): Promise<OfflineTrailPackage> {
    if (this.currentDownloadTrailId) {
      throw new Error(`Download already in progress for trail ${this.currentDownloadTrailId}`);
    }

    this.currentDownloadTrailId = trail.id;

    try {
      // Download the package
      const pkg = await this.downloader.downloadPackage(trail.id, boundingBox);

      // Validate the package
      const validation = this.validatePackage(pkg);
      if (!validation.isValid) {
        throw new Error(`Invalid package: ${validation.errors.join(', ')}`);
      }

      // Store in cache
      await this.storage.set(trail.id, pkg);
      this.cachedPackages.set(trail.id, pkg);

      return pkg;
    } finally {
      this.currentDownloadTrailId = null;
    }
  }

  /**
   * Get cached package for a trail
   */
  public async getPackage(trailId: string): Promise<OfflineTrailPackage | null> {
    // Check in-memory cache first
    if (this.cachedPackages.has(trailId)) {
      const pkg = this.cachedPackages.get(trailId)!;

      // Check if expired
      if (this.isPackageExpired(pkg)) {
        await this.removePackage(trailId);
        return null;
      }

      return pkg;
    }

    // Check persistent storage
    const pkg = await this.storage.get(trailId);

    if (pkg) {
      // Check if expired
      if (this.isPackageExpired(pkg)) {
        await this.removePackage(trailId);
        return null;
      }

      // Add to in-memory cache
      this.cachedPackages.set(trailId, pkg);
    }

    return pkg;
  }

  /**
   * Check if a package is cached and valid
   */
  public async hasValidPackage(trailId: string): Promise<boolean> {
    const pkg = await this.getPackage(trailId);
    return pkg !== null;
  }

  /**
   * Remove a package from cache
   */
  public async removePackage(trailId: string): Promise<void> {
    this.cachedPackages.delete(trailId);
    await this.storage.delete(trailId);
  }

  /**
   * Check if package is expired
   */
  private isPackageExpired(pkg: OfflineTrailPackage): boolean {
    const now = new Date();
    return pkg.expiresAt < now;
  }

  /**
   * Validate an offline trail package
   */
  public validatePackage(pkg: OfflineTrailPackage): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!pkg.version) errors.push('Missing version');
    if (!pkg.trail) errors.push('Missing trail data');
    if (!pkg.boundingBox) errors.push('Missing bounding box');
    if (!pkg.mapTiles) errors.push('Missing map tiles');
    if (!pkg.checksum) errors.push('Missing checksum');

    // Trail validation
    if (pkg.trail) {
      if (!pkg.trail.segments || pkg.trail.segments.length === 0) {
        errors.push('Trail has no segments');
      }
      if (!pkg.trail.trailhead) errors.push('Missing trailhead');
      if (!pkg.trail.destination) errors.push('Missing destination');
    }

    // Ephemeris validation
    if (!pkg.ephemeris || pkg.ephemeris.length === 0) {
      errors.push('Missing ephemeris (sunrise/sunset) data');
    }

    // Emergency contacts
    if (!pkg.emergencyContacts || pkg.emergencyContacts.length === 0) {
      warnings.push('No emergency contacts defined');
    }

    // POI validation
    if (!pkg.pois || pkg.pois.length === 0) {
      warnings.push('No POI data included');
    }

    // Weather forecast
    if (!pkg.weatherForecast || pkg.weatherForecast.length === 0) {
      warnings.push('No weather forecast included');
    }

    // Expiration check
    if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
      warnings.push('Package has expired');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate checksum for verification
   */
  public async verifyChecksum(pkg: OfflineTrailPackage): Promise<boolean> {
    // In production, this would compute a hash of the package contents
    // and compare with the stored checksum
    // For now, we just check if checksum exists
    return !!pkg.checksum;
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    used: number;
    quota: number;
    available: number;
    percentUsed: number;
  }> {
    const used = await this.storage.getStorageUsed();
    const quota = await this.storage.getStorageQuota();
    const available = quota - used;
    const percentUsed = quota > 0 ? (used / quota) * 100 : 0;

    return { used, quota, available, percentUsed };
  }

  /**
   * Get download progress for current download
   */
  public getDownloadProgress(): { isDownloading: boolean; progress: number; trailId: string | null } {
    return {
      isDownloading: this.currentDownloadTrailId !== null,
      progress: this.currentDownloadTrailId ? this.downloader.getDownloadProgress() : 0,
      trailId: this.currentDownloadTrailId,
    };
  }

  /**
   * Cancel current download
   */
  public cancelDownload(): void {
    if (this.currentDownloadTrailId) {
      this.downloader.cancelDownload();
      this.currentDownloadTrailId = null;
    }
  }

  /**
   * Clean up expired packages
   */
  public async cleanupExpiredPackages(): Promise<number> {
    let removedCount = 0;

    for (const [trailId, pkg] of this.cachedPackages) {
      if (this.isPackageExpired(pkg)) {
        await this.removePackage(trailId);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Calculate bounding box for a trail with buffer
   */
  public static calculateBoundingBox(trail: TrailData, bufferKm: number = 2): BoundingBox {
    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    // Include all segments
    for (const segment of trail.segments) {
      north = Math.max(north, segment.start.lat, segment.end.lat);
      south = Math.min(south, segment.start.lat, segment.end.lat);
      east = Math.max(east, segment.start.lon, segment.end.lon);
      west = Math.min(west, segment.start.lon, segment.end.lon);
    }

    // Include waypoints
    for (const waypoint of trail.waypoints) {
      north = Math.max(north, waypoint.lat);
      south = Math.min(south, waypoint.lat);
      east = Math.max(east, waypoint.lon);
      west = Math.min(west, waypoint.lon);
    }

    // Add buffer (approximate degrees)
    const bufferDegrees = bufferKm / 111; // ~111km per degree latitude
    const bufferDegreesLon = bufferKm / (111 * Math.cos(((north + south) / 2) * Math.PI / 180));

    return {
      north: north + bufferDegrees,
      south: south - bufferDegrees,
      east: east + bufferDegreesLon,
      west: west - bufferDegreesLon,
    };
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
   * Update configuration
   */
  public updateConfig(config: Partial<CacheManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
