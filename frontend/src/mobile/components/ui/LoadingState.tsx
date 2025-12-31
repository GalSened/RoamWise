/**
 * LoadingState Component
 *
 * Animated loading indicator with cycling messages.
 * Provides visual feedback during async operations like trip planning.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

/**
 * Loading messages that cycle during loading
 */
const LOADING_MESSAGES = [
  'Finding trails...',
  'Checking weather...',
  'Calculating routes...',
  'Discovering hidden gems...',
  'Preparing your adventure...',
];

interface LoadingStateProps {
  /** Override the default messages */
  messages?: string[];
  /** Time between message changes (ms) */
  interval?: number;
  /** Size of the activity indicator */
  size?: 'small' | 'large';
}

/**
 * Animated loading state with cycling messages
 */
export function LoadingState({
  messages = LOADING_MESSAGES,
  interval = 1500,
  size = 'large',
}: LoadingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Change message
        setMessageIndex((prev) => (prev + 1) % messages.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, interval);

    return () => clearInterval(timer);
  }, [interval, messages.length, fadeAnim]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
        {messages[messageIndex]}
      </Animated.Text>
    </View>
  );
}

/**
 * Simple loading spinner without messages
 */
export function LoadingSpinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View style={styles.spinnerContainer}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  message: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    ...typography.callout,
    textAlign: 'center',
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingState;
