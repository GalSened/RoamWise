/**
 * useNavigationState - React hook for subscribing to NavigationManager state
 *
 * Provides reactive access to real-time navigation data:
 * - Current GPS position
 * - ETA and distance remaining
 * - Safety status (SAFE/WARNING/DANGER)
 * - Off-trail detection
 *
 * Usage:
 * ```typescript
 * function LiveScreen() {
 *   const { state, startTracking, stopTracking, formatTime } = useNavigationState();
 *
 *   return (
 *     <Text>ETA: {formatTime(state.estimatedArrival)}</Text>
 *     <Text>Status: {state.safetyStatus}</Text>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NavigationManager, {
  NavigationState,
  TrailData,
  GeoPoint,
} from '../managers/NavigationManager';

/**
 * Sample trail data for Ein Gedi (Israel)
 * Real coordinates along the David Waterfall trail
 */
export const SAMPLE_TRAIL: TrailData = {
  id: 'ein-gedi-david',
  name: 'Ein Gedi - David Waterfall',
  coordinates: [
    { latitude: 31.4645, longitude: 35.389 }, // Trailhead
    { latitude: 31.4652, longitude: 35.3885 },
    { latitude: 31.466, longitude: 35.388 },
    { latitude: 31.4668, longitude: 35.3875 },
    { latitude: 31.4675, longitude: 35.387 }, // First viewpoint
    { latitude: 31.4682, longitude: 35.3865 },
    { latitude: 31.469, longitude: 35.386 },
    { latitude: 31.4698, longitude: 35.3855 },
    { latitude: 31.4705, longitude: 35.385 }, // David Waterfall
  ],
  destination: { latitude: 31.4705, longitude: 35.385 },
  totalDistance: 3200, // 3.2 km
};

/**
 * Hook return type
 */
interface UseNavigationStateResult {
  // Current state
  state: NavigationState;

  // Actions
  startTracking: (trail?: TrailData, sunsetTime?: Date) => Promise<boolean>;
  stopTracking: () => void;
  setSunsetTime: (time: Date) => void;

  // Formatters
  formatTime: (date: Date | null) => string;
  formatDistance: (meters: number) => string;
  formatDuration: (minutes: number) => string;

  // Derived values
  etaFormatted: string;
  sunsetFormatted: string;
  distanceFormatted: string;
  bufferFormatted: string;
}

/**
 * Custom hook for NavigationManager state subscription
 */
export function useNavigationState(): UseNavigationStateResult {
  const managerRef = useRef(NavigationManager.getInstance());
  const [state, setState] = useState<NavigationState>(
    managerRef.current.getState()
  );

  // Subscribe to state changes
  useEffect(() => {
    const manager = managerRef.current;
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // Start tracking with optional trail data
  const startTracking = useCallback(
    async (trail?: TrailData, sunsetTime?: Date): Promise<boolean> => {
      const manager = managerRef.current;
      const result = await manager.startTracking(
        trail || SAMPLE_TRAIL,
        sunsetTime
      );

      if (!result.success) {
        console.error('Failed to start tracking:', result.error);
      }

      return result.success;
    },
    []
  );

  // Stop tracking
  const stopTracking = useCallback(() => {
    managerRef.current.stopTracking();
  }, []);

  // Set sunset time
  const setSunsetTime = useCallback((time: Date) => {
    managerRef.current.setSunsetTime(time);
  }, []);

  // Formatters
  const formatTime = useCallback(
    (date: Date | null) => NavigationManager.formatTime(date),
    []
  );

  const formatDistance = useCallback(
    (meters: number) => NavigationManager.formatDistance(meters),
    []
  );

  const formatDuration = useCallback(
    (minutes: number) => NavigationManager.formatDuration(minutes),
    []
  );

  // Derived formatted values
  const etaFormatted = formatTime(state.estimatedArrival);
  const sunsetFormatted = formatTime(state.sunsetTime);
  const distanceFormatted = formatDistance(state.distanceRemaining);
  const bufferFormatted = formatDuration(Math.abs(state.safetyBuffer));

  return {
    state,
    startTracking,
    stopTracking,
    setSunsetTime,
    formatTime,
    formatDistance,
    formatDuration,
    etaFormatted,
    sunsetFormatted,
    distanceFormatted,
    bufferFormatted,
  };
}

/**
 * Hook for tracking initialization on mount
 * Use this when you want tracking to start automatically
 */
export function useAutoTracking(
  trail?: TrailData,
  sunsetTime?: Date
): UseNavigationStateResult {
  const result = useNavigationState();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      result.startTracking(trail, sunsetTime);
    }

    return () => {
      result.stopTracking();
    };
  }, []);

  return result;
}

export default useNavigationState;
