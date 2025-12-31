/**
 * Toast Component
 *
 * Non-intrusive notification banner that slides up from the bottom.
 * Auto-dismisses after a configurable duration.
 * Includes haptic feedback for notification type.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, typography } from '../../theme/tokens';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

/**
 * Icon and color configuration for each toast type
 */
const TOAST_CONFIG: Record<
  ToastType,
  { icon: keyof typeof Ionicons.glyphMap; backgroundColor: string; iconColor: string }
> = {
  success: {
    icon: 'checkmark-circle',
    backgroundColor: colors.success,
    iconColor: colors.textInverse,
  },
  info: {
    icon: 'information-circle',
    backgroundColor: colors.info,
    iconColor: colors.textInverse,
  },
  warning: {
    icon: 'warning',
    backgroundColor: colors.warning,
    iconColor: colors.textInverse,
  },
  error: {
    icon: 'close-circle',
    backgroundColor: colors.danger,
    iconColor: colors.textInverse,
  },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_BOTTOM = Platform.OS === 'ios' ? 100 : 80; // Above tab bar

/**
 * Toast notification banner
 */
export function Toast({
  message,
  type,
  visible,
  onHide,
  duration = 2500,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide up and fade in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      const timeout = setTimeout(() => {
        // Slide down and fade out
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 100,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [visible, duration, onHide, translateY, opacity]);

  if (!visible) return null;

  const config = TOAST_CONFIG[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons
        name={config.icon}
        size={24}
        color={config.iconColor}
        style={styles.icon}
      />
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: TOAST_BOTTOM,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    zIndex: 1000,
  },
  icon: {
    marginRight: spacing.sm,
  },
  message: {
    flex: 1,
    color: colors.textInverse,
    ...typography.callout,
    fontWeight: '500',
  },
});

export default Toast;
