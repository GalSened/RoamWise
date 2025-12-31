/**
 * AI Field Guardian - Type Definitions
 * Real-time hiking safety assistant running locally on-device (Edge Computing)
 */

// ============================================================================
// Core Geographic Types
// ============================================================================

export interface GeoPoint {
  lat: number;
  lon: number;
  altitude?: number;      // meters above sea level
  accuracy?: number;      // GPS accuracy in meters
  timestamp: number;      // Unix timestamp ms
}

export interface TrailSegment {
  start: GeoPoint;
  end: GeoPoint;
  distance: number;       // meters
  elevationGain: number;  // meters (positive = uphill)
  elevationLoss: number;  // meters (positive = downhill)
  averageSlope: number;   // grade as decimal (-0.1 = 10% downhill)
}

export interface TrailData {
  id: string;
  name: string;
  segments: TrailSegment[];
  totalDistance: number;  // meters
  totalElevationGain: number;
  totalElevationLoss: number;
  trailhead: GeoPoint;
  destination: GeoPoint;
  waypoints: GeoPoint[];
}

// ============================================================================
// Module A: Dynamic Pacing & Sunset Engine Types
// ============================================================================

export type AlertLevel = 'safe' | 'caution' | 'warning' | 'critical';

export interface CutoffPoint {
  location: GeoPoint;
  name: string;
  distanceFromCurrent: number;  // meters
  estimatedTimeToReach: number; // seconds
  reason: 'sunset' | 'weather' | 'battery';
}

export interface SafetyAssessment {
  eta: Date;
  safeArrivalProbability: number;   // 0.0 - 1.0
  remainingDistance: number;         // meters
  remainingTime: number;             // seconds
  timeToSunset: number;              // seconds
  alertLevel: AlertLevel;
  suggestedCutoff?: CutoffPoint;
  message: string;
}

export interface VelocitySample {
  velocity: number;       // m/s
  timestamp: number;      // Unix timestamp ms
  weight: number;         // Weight for averaging (decays over time)
}

export interface SunsetEngineConfig {
  safetyBufferMinutes: number;       // Default: 30
  velocityWindowMinutes: number;     // Default: 15
  minSamplesForETA: number;          // Default: 3
  stationaryThreshold: number;       // m/s, Default: 0.3
}

export interface EphemerisData {
  sunrise: Date;
  sunset: Date;
  civilTwilightEnd: Date;
  moonPhase: number;      // 0-1 (0 = new moon, 0.5 = full moon)
  date: Date;
}

// ============================================================================
// Module B: Off-Trail Detection Types
// ============================================================================

export interface ReturnVector {
  direction: number;      // degrees (0 = North, clockwise)
  distance: number;       // meters to nearest trail point
  nearestTrailPoint: GeoPoint;
  nearestSegmentIndex: number;
}

export interface OffTrailStatus {
  isOffTrail: boolean;
  deviationDistance: number;                // meters from trail
  consecutiveOffTrailReadings: number;
  returnVector?: ReturnVector;
  confidence: number;                       // 0.0 - 1.0
  lastOnTrailPosition?: GeoPoint;
}

export interface OffTrailDetectorConfig {
  deviationThresholdMeters: number;         // Default: 50
  hysteresisCount: number;                  // Default: 3
  gpsAccuracyBuffer: number;                // meters added to threshold
  medianFilterWindowSize: number;           // Default: 5
}

// ============================================================================
// Module C: Offline Caching Types
// ============================================================================

export type NetworkStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface POIData {
  id: string;
  name: string;
  type: 'viewpoint' | 'water' | 'shelter' | 'campsite' | 'hazard' | 'intersection' | 'emergency';
  location: GeoPoint;
  description?: string;
  audioUrl?: string;      // Cached audio guide
}

export interface EmergencyContact {
  name: string;
  phone: string;
  type: 'ranger' | 'rescue' | 'hospital' | 'personal';
  available24h: boolean;
}

export interface WeatherForecast {
  timestamp: Date;
  temperature: number;      // Celsius
  feelsLike: number;
  precipitation: number;    // mm
  windSpeed: number;        // m/s
  windDirection: number;    // degrees
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  uvIndex: number;
}

export interface OfflineTrailPackage {
  version: string;
  downloadedAt: Date;
  expiresAt: Date;
  trail: TrailData;
  boundingBox: BoundingBox;
  mapTiles: {
    format: 'mvt' | 'pbf' | 'mbtiles';
    zoomLevels: number[];
    sizeBytes: number;
    url: string;
  };
  pois: POIData[];
  emergencyContacts: EmergencyContact[];
  ephemeris: EphemerisData[];           // Array for multi-day trips
  weatherForecast: WeatherForecast[];
  checksum: string;
}

export interface CacheDownloadTrigger {
  distanceToTrailhead: number;  // meters
  networkStatus: NetworkStatus;
  batteryLevel: number;         // 0.0 - 1.0
  shouldDownload: boolean;
  reason?: string;
}

export interface CacheManagerConfig {
  proximityThresholdKm: number;           // Default: 10
  minBatteryLevel: number;                // Default: 0.2
  minNetworkQuality: NetworkStatus;       // Default: 'good'
  maxCacheAgeHours: number;               // Default: 24
  autoDownloadEnabled: boolean;
}

// ============================================================================
// Module D: State Machine Types
// ============================================================================

export type AppState =
  | 'IDLE'
  | 'PREPARING'
  | 'READY_TO_HIKE'
  | 'LIMITED_MODE'
  | 'TRACKING'
  | 'ALERTING_OFF_TRAIL'
  | 'ALERTING_SUNSET'
  | 'LOW_BATTERY_MODE'
  | 'COMPLETING'
  | 'EMERGENCY';

export type StateTransitionEvent =
  | 'TRAIL_SELECTED'
  | 'CACHE_READY'
  | 'CACHE_FAILED'
  | 'START_HIKE'
  | 'MOVEMENT_DETECTED'
  | 'OFF_TRAIL_DETECTED'
  | 'BACK_ON_TRAIL'
  | 'SUNSET_WARNING'
  | 'SUNSET_CLEARED'
  | 'LOW_BATTERY'
  | 'BATTERY_OK'
  | 'DESTINATION_REACHED'
  | 'EMERGENCY_TRIGGERED'
  | 'EMERGENCY_RESOLVED'
  | 'RESET';

export interface StateTransition {
  from: AppState;
  event: StateTransitionEvent;
  to: AppState;
  guard?: () => boolean;
  action?: () => void;
}

export interface GPSPollingConfig {
  movingIntervalMs: number;       // Default: 10000 (10s)
  stationaryIntervalMs: number;   // Default: 60000 (60s)
  lowBatteryIntervalMs: number;   // Default: 120000 (120s)
  stationaryVelocityThreshold: number; // m/s, Default: 0.3
}

export interface StateMachineContext {
  currentState: AppState;
  previousState?: AppState;
  enteredStateAt: Date;
  gpsPollingInterval: number;
  batteryLevel: number;
  isStationary: boolean;
  hasActiveAlerts: boolean;
}

// ============================================================================
// Event System Types
// ============================================================================

export type AlertEventType =
  | 'off_trail'
  | 'sunset_warning'
  | 'sunset_critical'
  | 'low_battery'
  | 'cache_expiring'
  | 'emergency';

export interface AlertEvent {
  type: AlertEventType;
  severity: AlertLevel;
  title: string;
  message: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  requiresUserAction: boolean;
  actions?: AlertAction[];
}

export interface AlertAction {
  id: string;
  label: string;
  isPrimary: boolean;
  action: () => void;
}

export interface FieldGuardianEventHandlers {
  onStateChange?: (from: AppState, to: AppState) => void;
  onAlert?: (alert: AlertEvent) => void;
  onLocationUpdate?: (location: GeoPoint) => void;
  onSafetyAssessmentUpdate?: (assessment: SafetyAssessment) => void;
  onOffTrailStatusUpdate?: (status: OffTrailStatus) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Main Orchestrator Types
// ============================================================================

export interface FieldGuardianConfig {
  sunset: SunsetEngineConfig;
  offTrail: OffTrailDetectorConfig;
  cache: CacheManagerConfig;
  gps: GPSPollingConfig;
}

export interface FieldGuardianStatus {
  state: AppState;
  isTracking: boolean;
  currentLocation?: GeoPoint;
  safetyAssessment?: SafetyAssessment;
  offTrailStatus?: OffTrailStatus;
  cacheStatus: {
    isReady: boolean;
    lastUpdated?: Date;
    expiresAt?: Date;
  };
  batteryLevel: number;
  gpsAccuracy?: number;
}

// Default configurations
export const DEFAULT_SUNSET_CONFIG: SunsetEngineConfig = {
  safetyBufferMinutes: 30,
  velocityWindowMinutes: 15,
  minSamplesForETA: 3,
  stationaryThreshold: 0.3,
};

export const DEFAULT_OFF_TRAIL_CONFIG: OffTrailDetectorConfig = {
  deviationThresholdMeters: 50,
  hysteresisCount: 3,
  gpsAccuracyBuffer: 10,
  medianFilterWindowSize: 5,
};

export const DEFAULT_CACHE_CONFIG: CacheManagerConfig = {
  proximityThresholdKm: 10,
  minBatteryLevel: 0.2,
  minNetworkQuality: 'good',
  maxCacheAgeHours: 24,
  autoDownloadEnabled: true,
};

export const DEFAULT_GPS_CONFIG: GPSPollingConfig = {
  movingIntervalMs: 10000,
  stationaryIntervalMs: 60000,
  lowBatteryIntervalMs: 120000,
  stationaryVelocityThreshold: 0.3,
};

export const DEFAULT_FIELD_GUARDIAN_CONFIG: FieldGuardianConfig = {
  sunset: DEFAULT_SUNSET_CONFIG,
  offTrail: DEFAULT_OFF_TRAIL_CONFIG,
  cache: DEFAULT_CACHE_CONFIG,
  gps: DEFAULT_GPS_CONFIG,
};
