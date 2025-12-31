/**
 * Web Haptics Utility
 *
 * Provides haptic feedback using the Web Vibration API.
 * Falls back gracefully on unsupported devices.
 */

type HapticIntensity = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

const VIBRATION_PATTERNS: Record<HapticIntensity, number> = {
  light: 10,
  medium: 25,
  heavy: 50,
};

const NOTIFICATION_PATTERNS: Record<NotificationType, number[]> = {
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [50, 100, 50, 100, 50],
};

/**
 * Check if vibration is supported
 */
function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger a simple haptic tap
 */
export function triggerHaptic(intensity: HapticIntensity = 'light'): void {
  if (canVibrate()) {
    navigator.vibrate(VIBRATION_PATTERNS[intensity]);
  }
}

/**
 * Trigger a notification-style haptic pattern
 */
export function triggerNotification(type: NotificationType = 'success'): void {
  if (canVibrate()) {
    navigator.vibrate(NOTIFICATION_PATTERNS[type]);
  }
}

/**
 * Trigger selection feedback (for toggles, chips)
 */
export function triggerSelection(): void {
  if (canVibrate()) {
    navigator.vibrate(5);
  }
}

/**
 * Haptics object for compatibility with existing code patterns
 */
export const haptics = {
  impact: triggerHaptic,
  notification: triggerNotification,
  selection: triggerSelection,
};

export default haptics;
