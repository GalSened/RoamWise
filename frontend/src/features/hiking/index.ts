/**
 * AI Field Guardian - Hiking Safety Module
 *
 * Real-time hiking safety assistant running locally on-device (Edge Computing)
 * ensuring safety and guidance without cellular connectivity.
 */

// Main orchestrator
export { AIFieldGuardian } from './AIFieldGuardian';

// Individual modules for direct use
export { SunsetSafetyEngine } from './SunsetSafetyEngine';
export { OffTrailDetector } from './OffTrailDetector';
export { OfflineCacheManager } from './OfflineCacheManager';
export type { CacheStorageAdapter, PackageDownloader } from './OfflineCacheManager';
export { FieldGuardianStateMachine } from './FieldGuardianStateMachine';
export type { StateChangeCallback } from './FieldGuardianStateMachine';

// All types
export * from './types';
