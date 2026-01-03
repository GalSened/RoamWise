/**
 * ItineraryEditor Component (Step 5)
 *
 * Allows users to review and edit the AI-generated itinerary:
 * - View day-by-day schedule
 * - Reorder activities (drag and drop)
 * - Add/remove activities
 * - View activity details
 *
 * Features:
 * - Day tabs navigation
 * - Activity cards with timing
 * - Summary stats
 * - Save and start trip actions
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../../utils/haptics';
import {
  Itinerary,
  DayPlan,
  Activity,
  ItineraryEditorProps,
  ItineraryStats,
} from './types';

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(date: Date): string {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  return `יום ${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
}

function getActivityIcon(type: Activity['type']): string {
  const icons: Record<Activity['type'], string> = {
    attraction: 'camera-outline',
    restaurant: 'restaurant-outline',
    cafe: 'cafe-outline',
    museum: 'business-outline',
    park: 'leaf-outline',
    shopping: 'bag-outline',
    transport: 'car-outline',
    accommodation: 'bed-outline',
    event: 'ticket-outline',
    free_time: 'time-outline',
    custom: 'flag-outline',
  };
  return icons[type] || 'location-outline';
}

function calculateStats(itinerary: Itinerary): ItineraryStats {
  const totalActivities = itinerary.days.reduce((sum, day) => sum + day.activities.length, 0);
  const topInterests = itinerary.preferences.interests?.slice(0, 3) || [];

  return {
    totalDays: itinerary.days.length,
    totalActivities,
    totalCost: itinerary.totalCost,
    totalWalkingDistance: itinerary.totalDistance,
    averageActivitiesPerDay: Math.round(totalActivities / itinerary.days.length),
    topInterests,
  };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Day Tabs
 */
interface DayTabsProps {
  days: DayPlan[];
  selectedDay: number;
  onSelectDay: (dayIndex: number) => void;
}

function DayTabs({ days, selectedDay, onSelectDay }: DayTabsProps) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.dayTabsContainer}
      contentContainerStyle={styles.dayTabsContent}
    >
      {days.map((day, index) => {
        const isSelected = selectedDay === index;
        return (
          <TouchableOpacity
            key={day.id}
            style={[styles.dayTab, isSelected && styles.dayTabSelected]}
            onPress={() => {
              haptics.impact('light');
              onSelectDay(index);
            }}
          >
            <Text style={[styles.dayTabNumber, isSelected && styles.dayTabNumberSelected]}>
              יום {day.dayNumber}
            </Text>
            <Text style={[styles.dayTabCount, isSelected && styles.dayTabCountSelected]}>
              {day.activities.length} פעילויות
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/**
 * Activity Card
 */
interface ActivityCardProps {
  activity: Activity;
  index: number;
  isLast: boolean;
  onPress: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function ActivityCard({
  activity,
  index,
  isLast,
  onPress,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ActivityCardProps) {
  const [showActions, setShowActions] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.98, friction: 3, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const handleLongPress = () => {
    haptics.impact('medium');
    setShowActions(true);
  };

  return (
    <View style={styles.activityWrapper}>
      {/* Timeline Connector */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineDot}>
          <Ionicons name={getActivityIcon(activity.type) as any} size={14} color={colors.primary} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Card */}
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.9}
        style={{ flex: 1 }}
      >
        <Animated.View style={[styles.activityCard, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header */}
          <View style={styles.activityHeader}>
            <View style={styles.activityTime}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.activityTimeText}>
                {activity.startTime} - {activity.endTime}
              </Text>
            </View>
            {activity.aiMatchScore && (
              <View style={styles.matchBadge}>
                <Ionicons name="sparkles" size={10} color={colors.surface} />
                <Text style={styles.matchBadgeText}>{activity.aiMatchScore}%</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <Text style={styles.activityName}>{activity.name}</Text>
          {activity.description && (
            <Text style={styles.activityDescription} numberOfLines={2}>
              {activity.description}
            </Text>
          )}

          {/* Footer */}
          <View style={styles.activityFooter}>
            <View style={styles.activityMeta}>
              <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.activityMetaText} numberOfLines={1}>
                {activity.location.address}
              </Text>
            </View>
            <View style={styles.activityStats}>
              <View style={styles.activityStat}>
                <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.activityStatText}>{activity.duration} דקות</Text>
              </View>
              {activity.cost && activity.cost > 0 && (
                <View style={styles.activityStat}>
                  <Ionicons name="cash-outline" size={12} color={colors.textTertiary} />
                  <Text style={styles.activityStatText}>₪{activity.cost}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Actions Overlay */}
          {showActions && (
            <View style={styles.actionsOverlay}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShowActions(false);
                  onMoveUp();
                }}
                disabled={!canMoveUp}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={canMoveUp ? colors.surface : colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setShowActions(false);
                  onMoveDown();
                }}
                disabled={!canMoveDown}
              >
                <Ionicons
                  name="arrow-down"
                  size={20}
                  color={canMoveDown ? colors.surface : colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => {
                  setShowActions(false);
                  onRemove();
                }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.surface} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowActions(false)}
              >
                <Ionicons name="close" size={20} color={colors.surface} />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Day Summary
 */
interface DaySummaryProps {
  day: DayPlan;
}

function DaySummary({ day }: DaySummaryProps) {
  const hours = Math.floor(day.totalDuration / 60);
  const minutes = day.totalDuration % 60;

  return (
    <View style={styles.daySummary}>
      <Text style={styles.daySummaryDate}>{formatDate(day.date)}</Text>
      {day.title && <Text style={styles.daySummaryTitle}>{day.title}</Text>}
      <View style={styles.daySummaryStats}>
        <View style={styles.daySummaryStat}>
          <Ionicons name="list-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.daySummaryStatText}>{day.activities.length} פעילויות</Text>
        </View>
        <View style={styles.daySummaryStat}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.daySummaryStatText}>
            {hours > 0 ? `${hours} שעות ` : ''}{minutes > 0 ? `${minutes} דקות` : ''}
          </Text>
        </View>
        {day.totalCost > 0 && (
          <View style={styles.daySummaryStat}>
            <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.daySummaryStatText}>₪{day.totalCost}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Trip Stats Card
 */
interface TripStatsCardProps {
  stats: ItineraryStats;
}

function TripStatsCard({ stats }: TripStatsCardProps) {
  return (
    <View style={styles.statsCard}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats.totalDays}</Text>
          <Text style={styles.statLabel}>ימים</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="flag-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats.totalActivities}</Text>
          <Text style={styles.statLabel}>פעילויות</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="walk-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats.totalWalkingDistance}</Text>
          <Text style={styles.statLabel}>ק"מ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>₪{stats.totalCost}</Text>
          <Text style={styles.statLabel}>סה"כ</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Action Buttons
 */
interface ActionButtonsProps {
  onSave: () => void;
  onStartTrip: () => void;
}

function ActionButtons({ onSave, onStartTrip }: ActionButtonsProps) {
  return (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => {
          haptics.impact('medium');
          onSave();
        }}
      >
        <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
        <Text style={styles.saveButtonText}>שמור טיול</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => {
          haptics.impact('heavy');
          onStartTrip();
        }}
      >
        <LinearGradient
          colors={[colors.primary, '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startButtonGradient}
        >
          <Ionicons name="play" size={20} color={colors.surface} />
          <Text style={styles.startButtonText}>התחל טיול!</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ItineraryEditor({
  itinerary,
  onItineraryChange,
  onSave,
  onStartTrip,
}: ItineraryEditorProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const selectedDay = itinerary.days[selectedDayIndex];
  const stats = calculateStats(itinerary);

  const handleRemoveActivity = useCallback(
    (activityIndex: number) => {
      Alert.alert(
        'הסרת פעילות',
        'האם אתה בטוח שברצונך להסיר פעילות זו?',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'הסר',
            style: 'destructive',
            onPress: () => {
              haptics.notification('warning');
              const newDays = [...itinerary.days];
              newDays[selectedDayIndex] = {
                ...newDays[selectedDayIndex],
                activities: newDays[selectedDayIndex].activities.filter(
                  (_, i) => i !== activityIndex
                ),
              };
              onItineraryChange({ ...itinerary, days: newDays });
            },
          },
        ]
      );
    },
    [itinerary, selectedDayIndex, onItineraryChange]
  );

  const handleMoveActivity = useCallback(
    (activityIndex: number, direction: 'up' | 'down') => {
      const activities = [...selectedDay.activities];
      const newIndex = direction === 'up' ? activityIndex - 1 : activityIndex + 1;

      if (newIndex < 0 || newIndex >= activities.length) return;

      haptics.impact('light');
      [activities[activityIndex], activities[newIndex]] = [activities[newIndex], activities[activityIndex]];

      const newDays = [...itinerary.days];
      newDays[selectedDayIndex] = { ...newDays[selectedDayIndex], activities };
      onItineraryChange({ ...itinerary, days: newDays });
    },
    [itinerary, selectedDay, selectedDayIndex, onItineraryChange]
  );

  const handleActivityPress = useCallback((activity: Activity) => {
    // Could open a modal with full activity details
    haptics.impact('light');
    Alert.alert(
      activity.name,
      `${activity.description || ''}\n\n📍 ${activity.location.address}\n⏱ ${activity.duration} דקות`,
      [{ text: 'סגור' }]
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Trip Stats */}
      <TripStatsCard stats={stats} />

      {/* Day Tabs */}
      <DayTabs
        days={itinerary.days}
        selectedDay={selectedDayIndex}
        onSelectDay={setSelectedDayIndex}
      />

      {/* Day Summary */}
      <DaySummary day={selectedDay} />

      {/* Activities List */}
      <ScrollView
        style={styles.activitiesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.activitiesContent}
      >
        {selectedDay.activities.map((activity, index) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            index={index}
            isLast={index === selectedDay.activities.length - 1}
            onPress={() => handleActivityPress(activity)}
            onRemove={() => handleRemoveActivity(index)}
            onMoveUp={() => handleMoveActivity(index, 'up')}
            onMoveDown={() => handleMoveActivity(index, 'down')}
            canMoveUp={index > 0}
            canMoveDown={index < selectedDay.activities.length - 1}
          />
        ))}

        {/* Add Activity Button */}
        <TouchableOpacity
          style={styles.addActivityButton}
          onPress={() => {
            haptics.impact('light');
            Alert.alert('בקרוב', 'הוספת פעילויות חדשות תהיה זמינה בקרוב!');
          }}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          <Text style={styles.addActivityText}>הוסף פעילות</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Action Buttons */}
      <ActionButtons onSave={onSave} onStartTrip={onStartTrip} />
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Stats Card
  statsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.small,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  statValue: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Day Tabs
  dayTabsContainer: {
    marginTop: spacing.md,
    maxHeight: 70,
  },
  dayTabsContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dayTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabNumber: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  dayTabNumberSelected: {
    color: colors.surface,
  },
  dayTabCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dayTabCountSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  // Day Summary
  daySummary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  daySummaryDate: {
    ...typography.h4,
    color: colors.text,
  },
  daySummaryTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daySummaryStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  daySummaryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daySummaryStatText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Activities
  activitiesContainer: {
    flex: 1,
  },
  activitiesContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  activityWrapper: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  timelineContainer: {
    width: 36,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 28,
    bottom: -spacing.sm,
    width: 2,
    backgroundColor: colors.border,
  },
  activityCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginLeft: spacing.sm,
    overflow: 'hidden',
    ...shadows.small,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  activityTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTimeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  matchBadgeText: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: '600',
  },
  activityName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  activityFooter: {},
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  activityMetaText: {
    ...typography.caption,
    color: colors.textTertiary,
    flex: 1,
  },
  activityStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  activityStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityStatText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  actionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.xl,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDanger: {
    backgroundColor: colors.error,
  },
  // Add Activity
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginLeft: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  addActivityText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  startButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  startButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
});

export default ItineraryEditor;
