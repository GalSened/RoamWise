/**
 * Haptics Utility
 *
 * Cross-platform haptic feedback using React Native's Vibration API.
 * Provides consistent tactile responses for user interactions.
 *
 * Patterns: [delay, vibrate, pause, vibrate, ...]
 * - First value is initial delay (0 = immediate)
 * - Subsequent values alternate between vibration and pause duration
 */

import { Vibration, Platform } from 'react-native';

/**
 * Vibration patterns for different feedback types
 * Durations in milliseconds
 */
const PATTERNS = {
  // Impact feedback - single vibrations of varying intensity
  light: [0, 30], // Quick tap
  medium: [0, 50], // Standard tap
  heavy: [0, 100], // Strong tap

  // Notification feedback - multi-pulse patterns
  success: [0, 50, 30, 50], // Double pulse - positive confirmation
  warning: [0, 100, 50, 100], // Double pulse - attention needed
  error: [0, 50, 30, 50, 30, 50], // Triple rapid - something went wrong
} as const;

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

/**
 * Haptic feedback utility
 *
 * Usage:
 * - haptics.impact('light') - Button press, checkbox toggle
 * - haptics.impact('medium') - Important action buttons
 * - haptics.impact('heavy') - Critical actions, confirmations
 * - haptics.notification('success') - Task completed
 * - haptics.notification('warning') - Attention needed
 * - haptics.notification('error') - Something went wrong
 */
export const haptics = {
  /**
   * Trigger impact feedback for UI interactions
   * @param style - Intensity of the haptic feedback
   */
  impact: (style: ImpactStyle): void => {
    try {
      Vibration.vibrate(PATTERNS[style]);
    } catch (e) {
      // Silently fail on web or if vibration not supported
    }
  },

  /**
   * Trigger notification feedback for status changes
   * @param type - Type of notification
   */
  notification: (type: NotificationType): void => {
    try {
      Vibration.vibrate(PATTERNS[type]);
    } catch (e) {
      // Silently fail on web or if vibration not supported
    }
  },

  /**
   * Cancel any ongoing vibration
   */
  cancel: (): void => {
    try {
      Vibration.cancel();
    } catch (e) {
      // Silently fail
    }
  },
};

export default haptics;
