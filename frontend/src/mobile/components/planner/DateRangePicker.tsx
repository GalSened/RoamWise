/**
 * DateRangePicker Component (Step 2)
 *
 * Allows users to select their trip dates with:
 * - Visual calendar for date range selection
 * - AI insights about selected dates
 * - Flexibility toggle
 *
 * Features:
 * - Month navigation
 * - Today highlight
 * - Selected range visualization
 * - Weather/crowd/price insights
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../../utils/haptics';
import { DateRange, DateInsight, DateRangePickerProps, Destination } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const HEBREW_DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// =============================================================================
// HELPERS
// =============================================================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isDateInRange(date: Date, range: DateRange | null): boolean {
  if (!range) return false;
  const time = date.getTime();
  return time >= range.startDate.getTime() && time <= range.endDate.getTime();
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const month = HEBREW_MONTHS[date.getMonth()];
  return `${day} ${month}`;
}

function getDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Mock function for getting AI insights
function getAIInsights(range: DateRange, destination?: Destination): DateInsight[] {
  const insights: DateInsight[] = [];
  const startMonth = range.startDate.getMonth();

  // Weather insight
  if (startMonth >= 6 && startMonth <= 8) {
    insights.push({
      type: 'weather',
      title: 'מזג אוויר חם',
      description: 'צפו לטמפרטורות גבוהות. מומלץ להביא בגדים קלים',
      impact: 'neutral',
      icon: 'sunny-outline',
    });
  } else if (startMonth >= 3 && startMonth <= 5) {
    insights.push({
      type: 'weather',
      title: 'מזג אוויר אידיאלי',
      description: 'תקופה מצוינת לביקור! טמפרטורות נעימות',
      impact: 'positive',
      icon: 'partly-sunny-outline',
    });
  }

  // Crowding insight
  const days = getDaysBetween(range.startDate, range.endDate);
  if (days >= 7) {
    insights.push({
      type: 'crowding',
      title: 'משך טיול מומלץ',
      description: `${days} ימים - מספיק זמן לחוויה מלאה`,
      impact: 'positive',
      icon: 'time-outline',
    });
  } else if (days <= 2) {
    insights.push({
      type: 'crowding',
      title: 'משך קצר',
      description: 'שקול להאריך את הטיול לחוויה מעמיקה יותר',
      impact: 'negative',
      icon: 'alert-circle-outline',
    });
  }

  // Holiday check (simplified)
  const startDay = range.startDate.getDay();
  if (startDay === 5 || startDay === 6) {
    insights.push({
      type: 'holiday',
      title: 'התחלה בסוף שבוע',
      description: 'חלק מהאתרים עשויים להיות סגורים או עמוסים',
      impact: 'neutral',
      icon: 'calendar-outline',
    });
  }

  return insights;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Calendar Header with month navigation
 */
interface CalendarHeaderProps {
  month: number;
  year: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

function CalendarHeader({
  month,
  year,
  onPreviousMonth,
  onNextMonth,
}: CalendarHeaderProps) {
  const canGoBack = () => {
    const today = new Date();
    return year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  };

  return (
    <View style={styles.calendarHeader}>
      <TouchableOpacity
        onPress={onPreviousMonth}
        disabled={!canGoBack()}
        style={[styles.navButton, !canGoBack() && styles.navButtonDisabled]}
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color={canGoBack() ? colors.text : colors.textTertiary}
        />
      </TouchableOpacity>
      <Text style={styles.monthYearText}>
        {HEBREW_MONTHS[month]} {year}
      </Text>
      <TouchableOpacity onPress={onNextMonth} style={styles.navButton}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Day of week headers
 */
function WeekDayHeaders() {
  return (
    <View style={styles.weekDayRow}>
      {HEBREW_DAYS.map((day, index) => (
        <View key={index} style={styles.weekDayCell}>
          <Text
            style={[
              styles.weekDayText,
              (index === 5 || index === 6) && styles.weekendText,
            ]}
          >
            {day}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Single day cell
 */
interface DayCellProps {
  day: number;
  date: Date;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  onPress: () => void;
}

function DayCell({
  day,
  date,
  isToday,
  isPast,
  isSelected,
  isInRange,
  isRangeStart,
  isRangeEnd,
  onPress,
}: DayCellProps) {
  const isWeekend = date.getDay() === 5 || date.getDay() === 6;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isPast}
      style={[
        styles.dayCell,
        isInRange && styles.dayCellInRange,
        isRangeStart && styles.dayCellRangeStart,
        isRangeEnd && styles.dayCellRangeEnd,
      ]}
    >
      <View
        style={[
          styles.dayContent,
          isSelected && styles.dayContentSelected,
          isToday && !isSelected && styles.dayContentToday,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            isPast && styles.dayTextPast,
            isWeekend && !isSelected && styles.weekendText,
            isSelected && styles.dayTextSelected,
            isInRange && !isSelected && styles.dayTextInRange,
          ]}
        >
          {day}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Calendar Grid
 */
interface CalendarGridProps {
  month: number;
  year: number;
  dateRange: DateRange | null;
  onDayPress: (date: Date) => void;
}

function CalendarGrid({ month, year, dateRange, onDayPress }: CalendarGridProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Fill initial empty days
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }

  // Fill days
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill remaining empty days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <View style={styles.calendarGrid}>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day, dayIndex) => {
            if (day === null) {
              return <View key={dayIndex} style={styles.emptyCell} />;
            }

            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            const isPast = date < today;
            const isToday = isSameDay(date, today);
            const isRangeStart = dateRange ? isSameDay(date, dateRange.startDate) : false;
            const isRangeEnd = dateRange ? isSameDay(date, dateRange.endDate) : false;
            const isSelected = isRangeStart || isRangeEnd;
            const isInRange = isDateInRange(date, dateRange);

            return (
              <DayCell
                key={dayIndex}
                day={day}
                date={date}
                isToday={isToday}
                isPast={isPast}
                isSelected={isSelected}
                isInRange={isInRange}
                isRangeStart={isRangeStart}
                isRangeEnd={isRangeEnd}
                onPress={() => onDayPress(date)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Selected Range Summary
 */
interface RangeSummaryProps {
  dateRange: DateRange | null;
}

function RangeSummary({ dateRange }: RangeSummaryProps) {
  if (!dateRange) {
    return (
      <View style={styles.rangeSummary}>
        <Ionicons name="calendar-outline" size={20} color={colors.textTertiary} />
        <Text style={styles.rangeSummaryPlaceholder}>בחר תאריכים</Text>
      </View>
    );
  }

  const days = getDaysBetween(dateRange.startDate, dateRange.endDate);

  return (
    <View style={styles.rangeSummary}>
      <View style={styles.rangeDateBox}>
        <Text style={styles.rangeDateLabel}>התחלה</Text>
        <Text style={styles.rangeDateValue}>{formatDate(dateRange.startDate)}</Text>
      </View>
      <View style={styles.rangeDivider}>
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
        <Text style={styles.rangeDaysText}>{days} ימים</Text>
      </View>
      <View style={styles.rangeDateBox}>
        <Text style={styles.rangeDateLabel}>סיום</Text>
        <Text style={styles.rangeDateValue}>{formatDate(dateRange.endDate)}</Text>
      </View>
    </View>
  );
}

/**
 * Flexibility Toggle
 */
interface FlexibilityToggleProps {
  isFlexible: boolean;
  onToggle: (value: boolean) => void;
}

function FlexibilityToggle({ isFlexible, onToggle }: FlexibilityToggleProps) {
  return (
    <TouchableOpacity
      style={[styles.flexibilityToggle, isFlexible && styles.flexibilityToggleActive]}
      onPress={() => {
        haptics.impact('light');
        onToggle(!isFlexible);
      }}
    >
      <View style={styles.flexibilityContent}>
        <Ionicons
          name={isFlexible ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={isFlexible ? colors.primary : colors.textSecondary}
        />
        <View>
          <Text style={styles.flexibilityTitle}>תאריכים גמישים</Text>
          <Text style={styles.flexibilitySubtitle}>±2 ימים למציאת מחירים טובים יותר</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * AI Insight Card
 */
interface InsightCardProps {
  insight: DateInsight;
}

function InsightCard({ insight }: InsightCardProps) {
  const getImpactColor = () => {
    switch (insight.impact) {
      case 'positive':
        return colors.success;
      case 'negative':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.insightCard, { borderLeftColor: getImpactColor() }]}>
      <View style={[styles.insightIcon, { backgroundColor: `${getImpactColor()}20` }]}>
        <Ionicons name={insight.icon as any} size={16} color={getImpactColor()} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightDescription}>{insight.description}</Text>
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  isFlexible,
  onFlexibilityChange,
  insights,
  destination,
}: DateRangePickerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectingEnd, setSelectingEnd] = useState(false);

  // AI insights based on selected dates
  const computedInsights = useMemo(() => {
    if (dateRange) {
      return getAIInsights(dateRange, destination);
    }
    return [];
  }, [dateRange, destination]);

  const handlePreviousMonth = useCallback(() => {
    haptics.impact('light');
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }, [currentMonth, currentYear]);

  const handleNextMonth = useCallback(() => {
    haptics.impact('light');
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }, [currentMonth, currentYear]);

  const handleDayPress = useCallback(
    (date: Date) => {
      haptics.impact('light');

      if (!dateRange || !selectingEnd) {
        // Start new selection
        onDateRangeChange({ startDate: date, endDate: date });
        setSelectingEnd(true);
      } else {
        // Complete selection
        if (date >= dateRange.startDate) {
          onDateRangeChange({ startDate: dateRange.startDate, endDate: date });
        } else {
          onDateRangeChange({ startDate: date, endDate: dateRange.startDate });
        }
        setSelectingEnd(false);
      }
    },
    [dateRange, selectingEnd, onDateRangeChange]
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Range Summary */}
      <RangeSummary dateRange={dateRange} />

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <CalendarHeader
          month={currentMonth}
          year={currentYear}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
        />
        <WeekDayHeaders />
        <CalendarGrid
          month={currentMonth}
          year={currentYear}
          dateRange={dateRange}
          onDayPress={handleDayPress}
        />
      </View>

      {/* Selection Help */}
      {selectingEnd && (
        <View style={styles.helpText}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.helpTextContent}>בחר תאריך סיום</Text>
        </View>
      )}

      {/* Flexibility Toggle */}
      <FlexibilityToggle
        isFlexible={isFlexible}
        onToggle={onFlexibilityChange}
      />

      {/* AI Insights */}
      {computedInsights.length > 0 && (
        <View style={styles.insightsSection}>
          <View style={styles.insightsHeader}>
            <LinearGradient
              colors={[colors.primary, '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.insightsHeaderGradient}
            >
              <Ionicons name="sparkles" size={16} color={colors.surface} />
              <Text style={styles.insightsHeaderText}>תובנות AI</Text>
            </LinearGradient>
          </View>
          {computedInsights.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Range Summary
  rangeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.small,
  },
  rangeSummaryPlaceholder: {
    ...typography.body,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  rangeDateBox: {
    alignItems: 'center',
    flex: 1,
  },
  rangeDateLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rangeDateValue: {
    ...typography.h4,
    color: colors.text,
  },
  rangeDivider: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  rangeDaysText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  // Calendar
  calendarContainer: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.small,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.xs,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  monthYearText: {
    ...typography.h3,
    color: colors.text,
  },
  weekDayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekDayCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  weekDayText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  weekendText: {
    color: colors.primary,
  },
  calendarGrid: {},
  weekRow: {
    flexDirection: 'row',
  },
  emptyCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellInRange: {
    backgroundColor: `${colors.primary}15`,
  },
  dayCellRangeStart: {
    borderTopLeftRadius: CELL_SIZE / 2,
    borderBottomLeftRadius: CELL_SIZE / 2,
  },
  dayCellRangeEnd: {
    borderTopRightRadius: CELL_SIZE / 2,
    borderBottomRightRadius: CELL_SIZE / 2,
  },
  dayContent: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: (CELL_SIZE - 4) / 2,
  },
  dayContentSelected: {
    backgroundColor: colors.primary,
  },
  dayContentToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayText: {
    ...typography.body,
    color: colors.text,
  },
  dayTextPast: {
    color: colors.textTertiary,
  },
  dayTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  dayTextInRange: {
    color: colors.primary,
  },
  // Help Text
  helpText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  helpTextContent: {
    ...typography.body,
    color: colors.primary,
  },
  // Flexibility Toggle
  flexibilityToggle: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flexibilityToggleActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  flexibilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flexibilityTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  flexibilitySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Insights
  insightsSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  insightsHeader: {
    marginBottom: spacing.sm,
  },
  insightsHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  insightsHeaderText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    ...shadows.small,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  insightDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default DateRangePicker;
