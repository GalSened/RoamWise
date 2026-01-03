/**
 * AIGreeting Component
 *
 * Displays a personalized AI-generated greeting based on:
 * - Time of day
 * - Upcoming trips
 * - Recent achievements
 * - Trip anniversaries
 *
 * Features:
 * - Animated entrance
 * - Contextual messages
 * - Refresh capability
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { AIGreeting as AIGreetingType } from './types';

interface AIGreetingProps {
  greeting: AIGreetingType | null;
  userName: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/**
 * Get time-based gradient colors
 */
function getGradientColors(type: AIGreetingType['type']): string[] {
  switch (type) {
    case 'morning':
      return ['#FCD34D', '#F97316']; // Sunrise yellow to orange
    case 'afternoon':
      return ['#38BDF8', '#3B82F6']; // Sky blue
    case 'evening':
      return ['#8B5CF6', '#6366F1']; // Purple sunset
    case 'special':
      return ['#F472B6', '#EC4899']; // Celebration pink
    default:
      return [colors.primary, '#4F46E5'];
  }
}

/**
 * Get time-based icon
 */
function getTimeIcon(type: AIGreetingType['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'morning':
      return 'sunny-outline';
    case 'afternoon':
      return 'partly-sunny-outline';
    case 'evening':
      return 'moon-outline';
    case 'special':
      return 'sparkles-outline';
    default:
      return 'chatbubble-ellipses-outline';
  }
}

/**
 * Get default greeting by time
 */
function getDefaultGreeting(): AIGreetingType {
  const hour = new Date().getHours();
  let type: AIGreetingType['type'];
  let message: string;

  if (hour >= 5 && hour < 12) {
    type = 'morning';
    message = 'בוקר טוב! מוכן להרפתקה חדשה?';
  } else if (hour >= 12 && hour < 17) {
    type = 'afternoon';
    message = 'צהריים טובים! לאן הטיול הבא?';
  } else if (hour >= 17 && hour < 21) {
    type = 'evening';
    message = 'ערב טוב! זמן לתכנן את הטיול הבא';
  } else {
    type = 'evening';
    message = 'לילה טוב! חולם על יעדים חדשים?';
  }

  return {
    message,
    type,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
  };
}

/**
 * Contextual Badge Component
 */
function ContextBadge({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.contextBadge}>
      <Ionicons name={icon} size={12} color={colors.surface} />
      <Text style={styles.contextBadgeText}>{text}</Text>
    </View>
  );
}

/**
 * Loading Skeleton Component
 */
function LoadingSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <LinearGradient
      colors={[colors.primary, '#4F46E5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <Ionicons name="sparkles" size={28} color={colors.surface} />
        </Animated.View>
      </View>
      <View style={styles.contentContainer}>
        <Animated.View style={[styles.skeletonLine, styles.skeletonLineShort, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonLine, styles.skeletonLineLong, { opacity: pulseAnim }]} />
      </View>
    </LinearGradient>
  );
}

/**
 * Main AIGreeting Component
 */
export function AIGreeting({ greeting, userName, isLoading, onRefresh }: AIGreetingProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [displayGreeting, setDisplayGreeting] = useState<AIGreetingType | null>(null);

  useEffect(() => {
    const greetingToUse = greeting || getDefaultGreeting();
    setDisplayGreeting(greetingToUse);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [greeting, fadeAnim, slideAnim]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!displayGreeting) {
    return null;
  }

  const gradientColors = getGradientColors(displayGreeting.type);
  const timeIcon = getTimeIcon(displayGreeting.type);

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* AI Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={timeIcon} size={28} color={colors.surface} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Greeting Text */}
          <Text style={styles.greeting}>שלום {userName}! 👋</Text>
          <Text style={styles.message}>{displayGreeting.message}</Text>

          {/* Contextual Info */}
          {displayGreeting.contextual && (
            <View style={styles.contextRow}>
              {displayGreeting.contextual.upcomingTrip && (
                <ContextBadge
                  icon="airplane-outline"
                  text={displayGreeting.contextual.upcomingTrip}
                />
              )}
              {displayGreeting.contextual.anniversary && (
                <ContextBadge
                  icon="calendar-outline"
                  text={displayGreeting.contextual.anniversary}
                />
              )}
              {displayGreeting.contextual.achievement && (
                <ContextBadge
                  icon="trophy-outline"
                  text={displayGreeting.contextual.achievement}
                />
              )}
            </View>
          )}
        </View>

        {/* Refresh Button */}
        {onRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color={`${colors.surface}80`} />
          </TouchableOpacity>
        )}

        {/* AI Badge */}
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={10} color={colors.surface} />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.medium,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  greeting: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  message: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    lineHeight: 22,
  },
  contextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  contextBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '500',
  },
  refreshButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  aiBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  aiBadgeText: {
    fontSize: 9,
    color: colors.surface,
    fontWeight: '700',
  },
  skeletonLine: {
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 7,
    marginBottom: spacing.xs,
  },
  skeletonLineShort: {
    width: '40%',
  },
  skeletonLineLong: {
    width: '80%',
  },
});

export default AIGreeting;
