/**
 * TravelInsights Component
 *
 * Displays travel analytics with visualizations:
 * - Monthly travel patterns (bar chart)
 * - Trip duration breakdown
 * - Distance milestones
 * - AI-generated insights
 * - Year-over-year comparison
 *
 * Features:
 * - Animated bar charts
 * - Progress indicators
 * - Expandable insights cards
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Types
 */
interface MonthlyData {
  month: string;
  shortMonth: string;
  trips: number;
  days: number;
}

interface TripTypeData {
  type: string;
  icon: string;
  count: number;
  color: string;
}

interface DistanceMilestone {
  label: string;
  distance: number;
  achieved: boolean;
  icon: string;
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'pattern' | 'suggestion' | 'milestone' | 'fun_fact';
  icon: string;
}

interface TravelInsightsData {
  monthlyActivity: MonthlyData[];
  tripTypes: TripTypeData[];
  totalDistance: number;
  milestones: DistanceMilestone[];
  averageTripDuration: number;
  longestTrip: number;
  mostActiveMonth: string;
  aiInsights: AIInsight[];
  yearOverYear: {
    currentYear: number;
    previousYear: number;
    tripsChange: number;
    daysChange: number;
  };
}

interface TravelInsightsProps {
  insights: TravelInsightsData | null;
  isLoading?: boolean;
}

/**
 * Hebrew month names
 */
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const SHORT_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];

/**
 * Generate default insights data
 */
function getDefaultInsights(): TravelInsightsData {
  return {
    monthlyActivity: HEBREW_MONTHS.map((month, index) => ({
      month,
      shortMonth: SHORT_MONTHS[index],
      trips: 0,
      days: 0,
    })),
    tripTypes: [
      { type: 'עירוני', icon: '🏙️', count: 0, color: '#3B82F6' },
      { type: 'חוף', icon: '🏖️', count: 0, color: '#06B6D4' },
      { type: 'הרים', icon: '🏔️', count: 0, color: '#10B981' },
      { type: 'תרבות', icon: '🏛️', count: 0, color: '#8B5CF6' },
    ],
    totalDistance: 0,
    milestones: [
      { label: 'מטייל מתחיל', distance: 100, achieved: false, icon: '🚶' },
      { label: 'חוצה גבולות', distance: 1000, achieved: false, icon: '✈️' },
      { label: 'סוחר דרכים', distance: 5000, achieved: false, icon: '🌍' },
      { label: 'אזרח העולם', distance: 10000, achieved: false, icon: '🚀' },
      { label: 'לגנדה', distance: 50000, achieved: false, icon: '⭐' },
    ],
    averageTripDuration: 0,
    longestTrip: 0,
    mostActiveMonth: '',
    aiInsights: [],
    yearOverYear: {
      currentYear: new Date().getFullYear(),
      previousYear: new Date().getFullYear() - 1,
      tripsChange: 0,
      daysChange: 0,
    },
  };
}

/**
 * Bar Chart Component
 */
function MonthlyBarChart({ data }: { data: MonthlyData[] }) {
  const maxDays = Math.max(...data.map(d => d.days), 1);
  const animValues = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(50,
      animValues.map((anim, index) =>
        Animated.spring(anim, {
          toValue: data[index].days / maxDays,
          friction: 8,
          tension: 40,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [data, maxDays, animValues]);

  return (
    <View style={styles.barChartContainer}>
      <View style={styles.barChartBars}>
        {data.map((item, index) => (
          <View key={index} style={styles.barColumn}>
            <View style={styles.barWrapper}>
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: animValues[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: item.days > 0 ? colors.primary : colors.border,
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{item.shortMonth}</Text>
          </View>
        ))}
      </View>
      <View style={styles.barChartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>ימי טיול</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Trip Type Donut Component
 */
function TripTypeBreakdown({ data }: { data: TripTypeData[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="pie-chart-outline" size={32} color={colors.textSecondary} />
        <Text style={styles.emptyChartText}>עדיין אין נתונים</Text>
      </View>
    );
  }

  return (
    <View style={styles.tripTypeContainer}>
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <View key={index} style={styles.tripTypeRow}>
            <View style={styles.tripTypeInfo}>
              <Text style={styles.tripTypeIcon}>{item.icon}</Text>
              <Text style={styles.tripTypeName}>{item.type}</Text>
            </View>
            <View style={styles.tripTypeBarContainer}>
              <View
                style={[
                  styles.tripTypeBar,
                  { width: `${percentage}%`, backgroundColor: item.color }
                ]}
              />
            </View>
            <Text style={styles.tripTypeCount}>{item.count}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Distance Milestones Component
 */
function DistanceMilestones({
  milestones,
  currentDistance
}: {
  milestones: DistanceMilestone[];
  currentDistance: number;
}) {
  return (
    <View style={styles.milestonesContainer}>
      <View style={styles.distanceHeader}>
        <Text style={styles.distanceLabel}>סה"כ מרחק</Text>
        <Text style={styles.distanceValue}>
          {currentDistance.toLocaleString()} ק"מ
        </Text>
      </View>

      <View style={styles.milestonesList}>
        {milestones.map((milestone, index) => {
          const progress = Math.min(currentDistance / milestone.distance, 1);
          const isAchieved = currentDistance >= milestone.distance;

          return (
            <View
              key={index}
              style={[
                styles.milestoneItem,
                isAchieved && styles.milestoneItemAchieved,
              ]}
            >
              <View style={styles.milestoneIconContainer}>
                <Text style={styles.milestoneIcon}>{milestone.icon}</Text>
                {isAchieved && (
                  <View style={styles.milestoneCheck}>
                    <Ionicons name="checkmark" size={10} color={colors.surface} />
                  </View>
                )}
              </View>

              <View style={styles.milestoneContent}>
                <Text style={[
                  styles.milestoneLabel,
                  isAchieved && styles.milestoneLabelAchieved,
                ]}>
                  {milestone.label}
                </Text>
                <View style={styles.milestoneProgressContainer}>
                  <View
                    style={[
                      styles.milestoneProgress,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: isAchieved ? colors.success : colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.milestoneDistance}>
                  {milestone.distance.toLocaleString()} ק"מ
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * AI Insight Card Component
 */
function InsightCard({ insight }: { insight: AIInsight }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getInsightColor = () => {
    switch (insight.type) {
      case 'pattern': return '#3B82F6';
      case 'suggestion': return '#10B981';
      case 'milestone': return '#F59E0B';
      case 'fun_fact': return '#8B5CF6';
      default: return colors.primary;
    }
  };

  const getInsightIcon = () => {
    switch (insight.type) {
      case 'pattern': return 'analytics-outline';
      case 'suggestion': return 'bulb-outline';
      case 'milestone': return 'trophy-outline';
      case 'fun_fact': return 'sparkles-outline';
      default: return 'information-circle-outline';
    }
  };

  return (
    <TouchableOpacity
      style={styles.insightCard}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.7}
    >
      <View style={[styles.insightIconContainer, { backgroundColor: `${getInsightColor()}20` }]}>
        <Ionicons name={getInsightIcon()} size={20} color={getInsightColor()} />
      </View>

      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        {(isExpanded || insight.description.length < 60) && (
          <Text style={styles.insightDescription}>{insight.description}</Text>
        )}
      </View>

      {insight.description.length >= 60 && (
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      )}
    </TouchableOpacity>
  );
}

/**
 * Year Over Year Comparison
 */
function YearComparison({ data }: { data: TravelInsightsData['yearOverYear'] }) {
  const renderChange = (change: number, label: string) => {
    const isPositive = change > 0;
    const isNeutral = change === 0;

    return (
      <View style={styles.yoyItem}>
        <Text style={styles.yoyLabel}>{label}</Text>
        <View style={styles.yoyChangeContainer}>
          {!isNeutral && (
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={isPositive ? colors.success : colors.error}
            />
          )}
          <Text style={[
            styles.yoyChangeText,
            isPositive && styles.yoyPositive,
            !isPositive && !isNeutral && styles.yoyNegative,
          ]}>
            {isNeutral ? '0' : `${isPositive ? '+' : ''}${change}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.yoyContainer}>
      <Text style={styles.yoyTitle}>
        {data.currentYear} לעומת {data.previousYear}
      </Text>
      <View style={styles.yoyRow}>
        {renderChange(data.tripsChange, 'טיולים')}
        {renderChange(data.daysChange, 'ימים')}
      </View>
    </View>
  );
}

/**
 * Stats Summary Row
 */
function StatsSummary({ insights }: { insights: TravelInsightsData }) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={styles.statValue}>{insights.averageTripDuration}</Text>
        <Text style={styles.statLabel}>ימים בממוצע</Text>
      </View>

      <View style={styles.statCard}>
        <Ionicons name="time-outline" size={20} color={colors.secondary} />
        <Text style={styles.statValue}>{insights.longestTrip}</Text>
        <Text style={styles.statLabel}>הטיול הארוך</Text>
      </View>

      <View style={styles.statCard}>
        <Ionicons name="sunny-outline" size={20} color='#F59E0B' />
        <Text style={styles.statValue}>{insights.mostActiveMonth || '-'}</Text>
        <Text style={styles.statLabel}>החודש הפעיל</Text>
      </View>
    </View>
  );
}

/**
 * Loading State
 */
function LoadingState() {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingIcon, { opacity: pulseAnim }]}>
        <Ionicons name="bar-chart" size={48} color={colors.primary} />
      </Animated.View>
      <Text style={styles.loadingText}>מחשב תובנות...</Text>
    </View>
  );
}

/**
 * Empty State
 */
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>עוד אין מספיק נתונים</Text>
      <Text style={styles.emptyDescription}>
        התחל לתכנן וליהנות מטיולים כדי לראות את התובנות שלך
      </Text>
    </View>
  );
}

/**
 * Section Header
 */
function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/**
 * Main TravelInsights Component
 */
export function TravelInsights({ insights, isLoading }: TravelInsightsProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const displayData = insights || getDefaultInsights();

  const hasData = displayData.totalDistance > 0 ||
    displayData.monthlyActivity.some(m => m.days > 0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>תובנות מסע</Text>
        </View>
        <LoadingState />
      </View>
    );
  }

  if (!hasData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>תובנות מסע</Text>
        </View>
        <EmptyState />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>תובנות מסע</Text>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={12} color={colors.primary} />
          <Text style={styles.aiBadgeText}>AI מונע</Text>
        </View>
      </View>

      {/* Stats Summary */}
      <StatsSummary insights={displayData} />

      {/* Monthly Activity Chart */}
      <View style={styles.section}>
        <SectionHeader title="פעילות חודשית" icon="calendar" />
        <MonthlyBarChart data={displayData.monthlyActivity} />
      </View>

      {/* Trip Types */}
      <View style={styles.section}>
        <SectionHeader title="סוגי טיולים" icon="compass-outline" />
        <TripTypeBreakdown data={displayData.tripTypes} />
      </View>

      {/* Distance Milestones */}
      <View style={styles.section}>
        <SectionHeader title="אבני דרך" icon="flag-outline" />
        <DistanceMilestones
          milestones={displayData.milestones}
          currentDistance={displayData.totalDistance}
        />
      </View>

      {/* Year Over Year */}
      <View style={styles.section}>
        <YearComparison data={displayData.yearOverYear} />
      </View>

      {/* AI Insights */}
      {displayData.aiInsights.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="תובנות AI" icon="bulb-outline" />
          <View style={styles.insightsList}>
            {displayData.aiInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    margin: spacing.md,
    ...shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  aiBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },

  // Stats Summary
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Bar Chart
  barChartContainer: {
    paddingTop: spacing.sm,
  },
  barChartBars: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 9,
    marginTop: spacing.xs,
  },
  barChartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Trip Type Breakdown
  tripTypeContainer: {
    gap: spacing.sm,
  },
  tripTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tripTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: spacing.xs,
  },
  tripTypeIcon: {
    fontSize: 16,
  },
  tripTypeName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  tripTypeBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tripTypeBar: {
    height: '100%',
    borderRadius: 4,
  },
  tripTypeCount: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 24,
    textAlign: 'right',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyChartText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Distance Milestones
  milestonesContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  distanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  distanceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  distanceValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  milestonesList: {
    gap: spacing.sm,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    opacity: 0.6,
  },
  milestoneItemAchieved: {
    opacity: 1,
  },
  milestoneIconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIcon: {
    fontSize: 24,
  },
  milestoneCheck: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  milestoneLabelAchieved: {
    color: colors.text,
  },
  milestoneProgressContainer: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  milestoneProgress: {
    height: '100%',
    borderRadius: 2,
  },
  milestoneDistance: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Year Over Year
  yoyContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  yoyTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  yoyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  yoyItem: {
    alignItems: 'center',
  },
  yoyLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  yoyChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  yoyChangeText: {
    ...typography.h3,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  yoyPositive: {
    color: colors.success,
  },
  yoyNegative: {
    color: colors.error,
  },

  // AI Insights
  insightsList: {
    gap: spacing.sm,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  insightIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  insightDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  // Loading State
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingIcon: {
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default TravelInsights;
