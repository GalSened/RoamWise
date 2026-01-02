/**
 * Haptics Utility
 *
 * Cross-platform haptic feedback using expo-haptics.
 * Provides consistent tactile responses for user interactions.
 *
 * expo-haptics provides three types of feedback:
 * - Impact: For UI element interactions (buttons, toggles)
 * - Notification: For status changes (success, warning, error)
 * - Selection: For picker/selection changes
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

/**
 * Map our impact styles to expo-haptics ImpactFeedbackStyle
 */
const IMPACT_STYLES: Record<ImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/**
 * Map our notification types to expo-haptics NotificationFeedbackType
 */
const NOTIFICATION_TYPES: Record<NotificationType, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

/**
 * Haptic feedback utility
 *
 * Usage:
 * - haptics.impact('light') - Button press, checkbox toggle, chip selection
 * - haptics.impact('medium') - Important action buttons, navigation
 * - haptics.impact('heavy') - Critical actions, confirmations
 * - haptics.notification('success') - Task completed, route generated
 * - haptics.notification('warning') - Attention needed
 * - haptics.notification('error') - Something went wrong
 * - haptics.selection() - Picker changes, filter toggles
 */
export const haptics = {
  /**
   * Trigger impact feedback for UI interactions
   * @param style - Intensity of the haptic feedback
   */
  impact: (style: ImpactStyle = 'medium'): void => {
    // Only run on native platforms
    if (Platform.OS === 'web') return;

    try {
      Haptics.impactAsync(IMPACT_STYLES[style]);
    } catch (e) {
      // Silently fail if haptics not supported
    }
  },

  /**
   * Trigger notification feedback for status changes
   * @param type - Type of notification
   */
  notification: (type: NotificationType = 'success'): void => {
    // Only run on native platforms
    if (Platform.OS === 'web') return;

    try {
      Haptics.notificationAsync(NOTIFICATION_TYPES[type]);
    } catch (e) {
      // Silently fail if haptics not supported
    }
  },

  /**
   * Trigger selection feedback for picker/toggle interactions
   * Lighter than impact, perfect for selection changes
   */
  selection: (): void => {
    // Only run on native platforms
    if (Platform.OS === 'web') return;

    try {
      Haptics.selectionAsync();
    } catch (e) {
      // Silently fail if haptics not supported
    }
  },
};

export default haptics;
