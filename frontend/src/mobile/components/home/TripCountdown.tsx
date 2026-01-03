/**
 * TripCountdown Component
 *
 * Displays countdown to upcoming trip with:
 * - Days/hours remaining
 * - Trip destination and dates
 * - Checklist progress
 * - Weather preview
 * - Quick action buttons
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { TripInfo } from './UserStateManager';

interface TripCountdownProps {
  trip: TripInfo;
  daysUntil: number;
  onPress?: () => void;
  onNavigateToChecklist?: () => void;
  onNavigateToWeather?: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = startDate.toLocaleDateString('he-IL', options);
  const end = endDate.toLocaleDateString('he-IL', options);
  return `${start} - ${end}`;
}

/**
 * Get countdown text based on days remaining
 */
function getCountdownText(days: number): { primary: string; secondary: string } {
  if (days === 0) {
    return { primary: 'היום!', secondary: 'הטיול מתחיל' };
  } else if (days === 1) {
    return { primary: 'מחר!', secondary: 'הטיול מתחיל' };
  } else if (days <= 7) {
    return { primary: `${days}`, secondary: 'ימים נותרו' };
  } else if (days <= 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return { primary: `${weeks}`, secondary: weeks === 1 ? 'שבוע נותר' : 'שבועות נותרו' };
    }
    return { primary: `${days}`, secondary: 'ימים נותרו' };
  } else {
    const months = Math.floor(days / 30);
    return { primary: `${months}+`, secondary: months === 1 ? 'חודש נותר' : 'חודשים נותרו' };
  }
}

/**
 * Mock checklist data (would come from trip data in real app)
 */
const mockChecklist: ChecklistItem[] = [
  { id: '1', label: 'הזמנת טיסות', completed: true },
  { id: '2', label: 'הזמנת מלון', completed: true },
  { id: '3', label: 'ביטוח נסיעות', completed: false },
  { id: '4', label: 'רשימת אריזה', completed: false },
  { id: '5', label: 'המרת מטבע', completed: false },
];

export function TripCountdown({
  trip,
  daysUntil,
  onPress,
  onNavigateToChecklist,
  onNavigateToWeather,
}: TripCountdownProps) {
  // Animation for countdown pulse
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (daysUntil <= 3) {
      // Pulse animation for imminent trips
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [daysUntil, pulseAnim]);

  // Calculate checklist progress
  const checklistProgress = useMemo(() => {
    const completed = mockChecklist.filter(item => item.completed).length;
    return {
      completed,
      total: mockChecklist.length,
      percentage: Math.round((completed / mockChecklist.length) * 100),
    };
  }, []);

  const countdownText = getCountdownText(daysUntil);
  const isImminent = daysUntil <= 3;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Background Image */}
      {trip.coverImage && (
        <Image
          source={{ uri: trip.coverImage }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      )}

      {/* Gradient Overlay */}
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.destinationInfo}>
            <Text style={styles.destination}>{trip.destination}</Text>
            <Text style={styles.dateRange}>
              {formatDateRange(trip.startDate, trip.endDate)} · {trip.daysCount} ימים
            </Text>
          </View>

          {/* Countdown Badge */}
          <Animated.View
            style={[
              styles.countdownBadge,
              isImminent && styles.countdownBadgeUrgent,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={[styles.countdownPrimary, isImminent && styles.countdownPrimaryUrgent]}>
              {countdownText.primary}
            </Text>
            <Text style={[styles.countdownSecondary, isImminent && styles.countdownSecondaryUrgent]}>
              {countdownText.secondary}
            </Text>
          </Animated.View>
        </View>

        {/* Trip Name */}
        {trip.name && (
          <Text style={styles.tripName}>{trip.name}</Text>
        )}

        {/* Checklist Progress */}
        <TouchableOpacity
          style={styles.checklistRow}
          onPress={onNavigateToChecklist}
          activeOpacity={0.7}
        >
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${checklistProgress.percentage}%` }]}
            />
          </View>
          <View style={styles.checklistInfo}>
            <Ionicons name="checkbox-outline" size={16} color={colors.surface} />
            <Text style={styles.checklistText}>
              {checklistProgress.completed}/{checklistProgress.total} משימות הושלמו
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.surface} />
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={onNavigateToWeather}>
            <Ionicons name="partly-sunny-outline" size={20} color={colors.surface} />
            <Text style={styles.actionText}>מזג אוויר</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onNavigateToChecklist}>
            <Ionicons name="list-outline" size={20} color={colors.surface} />
            <Text style={styles.actionText}>רשימה</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="calendar-outline" size={20} color={colors.surface} />
            <Text style={styles.actionText}>לו״ז</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color={colors.surface} />
            <Text style={styles.actionText}>שתף</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    height: 220,
    ...shadows.large,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  destinationInfo: {
    flex: 1,
  },
  destination: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dateRange: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  tripName: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  countdownBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  countdownBadgeUrgent: {
    backgroundColor: colors.warning,
  },
  countdownPrimary: {
    ...typography.h1,
    color: colors.surface,
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 32,
  },
  countdownPrimaryUrgent: {
    color: colors.text,
  },
  countdownSecondary: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 11,
  },
  countdownSecondaryUrgent: {
    color: colors.text,
  },
  checklistRow: {
    marginTop: spacing.md,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  checklistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  checklistText: {
    ...typography.caption,
    color: colors.surface,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButton: {
    alignItems: 'center',
    padding: spacing.xs,
  },
  actionText: {
    ...typography.caption,
    color: colors.surface,
    marginTop: 4,
    fontSize: 11,
  },
});

export default TripCountdown;
