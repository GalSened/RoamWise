/**
 * DestinationCard Component - AI Chat Action Card
 *
 * Production-ready destination recommendation card displayed in chat.
 * Features: hero image, match percentage, best time, budget, duration, highlights.
 *
 * Based on CHAT_PAGE_SPEC.md
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { DestinationCardData, DestinationCardAction } from './types';

interface DestinationCardProps {
  data: DestinationCardData;
  onStartPlanning: (destination: string) => void;
  onAddToBucketList: (destination: string) => Promise<void>;
  onViewDetails: (destination: string) => void;
  onCompare?: (destination: string) => void;
  language?: 'he' | 'en';
}

/**
 * Get action button config
 */
function getActionConfig(
  action: DestinationCardAction,
  language: 'he' | 'en'
): { icon: string; label: string; color: string } {
  const configs: Record<
    DestinationCardAction,
    { icon: string; labelEn: string; labelHe: string; color: string }
  > = {
    start_planning: {
      icon: 'airplane',
      labelEn: 'Start Planning',
      labelHe: 'התחל לתכנן',
      color: colors.primary,
    },
    add_to_bucket_list: {
      icon: 'heart-outline',
      labelEn: 'Bucket List',
      labelHe: 'רשימת חלומות',
      color: colors.danger,
    },
    view_details: {
      icon: 'information-circle-outline',
      labelEn: 'Details',
      labelHe: 'פרטים',
      color: colors.info,
    },
    compare: {
      icon: 'git-compare-outline',
      labelEn: 'Compare',
      labelHe: 'השווה',
      color: colors.secondary,
    },
  };

  const config = configs[action];
  return {
    icon: config.icon,
    label: language === 'he' ? config.labelHe : config.labelEn,
    color: config.color,
  };
}

/**
 * Format budget range for display
 */
function formatBudget(
  budget: { min: number; max: number; currency: string },
  language: 'he' | 'en'
): string {
  const symbol = budget.currency === 'ILS' ? '₪' : budget.currency === 'USD' ? '$' : '€';

  if (language === 'he') {
    return `${symbol}${budget.min.toLocaleString()} - ${symbol}${budget.max.toLocaleString()}`;
  }
  return `${symbol}${budget.min.toLocaleString()} - ${symbol}${budget.max.toLocaleString()}`;
}

/**
 * Get match color based on percentage
 */
function getMatchColor(percentage: number): string {
  if (percentage >= 80) return colors.success;
  if (percentage >= 60) return '#8BC34A'; // Light green
  if (percentage >= 40) return colors.warning;
  return colors.danger;
}

/**
 * Get weather icon name
 */
function getWeatherIcon(condition: string): string {
  const conditionLower = condition.toLowerCase();

  if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
    return 'sunny';
  }
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
    return 'cloudy';
  }
  if (conditionLower.includes('rain') || conditionLower.includes('shower')) {
    return 'rainy';
  }
  if (conditionLower.includes('snow')) {
    return 'snow';
  }
  if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
    return 'thunderstorm';
  }
  return 'partly-sunny';
}

export function DestinationCard({
  data,
  onStartPlanning,
  onAddToBucketList,
  onViewDetails,
  onCompare,
  language = 'he',
}: DestinationCardProps) {
  const {
    name,
    country,
    heroImage,
    matchPercentage,
    bestTime,
    estimatedBudget,
    suggestedDuration,
    highlights,
    weatherPreview,
    actions,
  } = data;

  // Handle action button press
  const handleActionPress = useCallback(
    async (action: DestinationCardAction) => {
      haptics.impact('light');

      switch (action) {
        case 'start_planning':
          onStartPlanning(name);
          break;

        case 'add_to_bucket_list':
          try {
            await onAddToBucketList(name);
            haptics.notification('success');
          } catch (error) {
            haptics.notification('error');
          }
          break;

        case 'view_details':
          onViewDetails(name);
          break;

        case 'compare':
          onCompare?.(name);
          break;
      }
    },
    [name, onStartPlanning, onAddToBucketList, onViewDetails, onCompare]
  );

  // Filter available actions
  const availableActions = useMemo(() => {
    return actions.filter((action) => {
      if (action === 'compare' && !onCompare) return false;
      return true;
    });
  }, [actions, onCompare]);

  const matchColor = getMatchColor(matchPercentage);

  return (
    <View style={styles.container}>
      {/* Hero Image with overlay */}
      <ImageBackground
        source={{ uri: heroImage }}
        style={styles.heroImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          {/* Match badge */}
          <View style={[styles.matchBadge, { backgroundColor: matchColor }]}>
            <Ionicons name="heart" size={14} color="#FFFFFF" />
            <Text style={styles.matchText}>{matchPercentage}%</Text>
            <Text style={styles.matchLabel}>
              {language === 'he' ? 'התאמה' : 'Match'}
            </Text>
          </View>

          {/* Destination info */}
          <View style={styles.heroContent}>
            <Text style={styles.destinationName}>{name}</Text>
            <View style={styles.countryRow}>
              <Ionicons name="location" size={14} color="#FFFFFF" />
              <Text style={styles.countryText}>{country}</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Content */}
      <View style={styles.content}>
        {/* Quick stats row */}
        <View style={styles.statsRow}>
          {/* Best Time */}
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.statLabel}>
              {language === 'he' ? 'הזמן הטוב' : 'Best Time'}
            </Text>
            <Text style={styles.statValue}>{bestTime}</Text>
          </View>

          {/* Duration */}
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={colors.secondary} />
            <Text style={styles.statLabel}>
              {language === 'he' ? 'משך מומלץ' : 'Duration'}
            </Text>
            <Text style={styles.statValue}>{suggestedDuration}</Text>
          </View>

          {/* Budget */}
          <View style={styles.statItem}>
            <Ionicons name="wallet-outline" size={18} color={colors.success} />
            <Text style={styles.statLabel}>
              {language === 'he' ? 'תקציב' : 'Budget'}
            </Text>
            <Text style={styles.statValue}>{formatBudget(estimatedBudget, language)}</Text>
          </View>
        </View>

        {/* Weather preview */}
        {weatherPreview && (
          <View style={styles.weatherRow}>
            <Ionicons
              name={getWeatherIcon(weatherPreview.condition) as any}
              size={20}
              color={colors.warning}
            />
            <Text style={styles.weatherText}>
              {weatherPreview.avgTemp}°C • {weatherPreview.condition}
            </Text>
          </View>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <View style={styles.highlightsContainer}>
            <Text style={styles.highlightsTitle}>
              {language === 'he' ? 'נקודות עניין' : 'Highlights'}
            </Text>
            <View style={styles.highlightsList}>
              {highlights.slice(0, 4).map((highlight, index) => (
                <View key={index} style={styles.highlightItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {availableActions.map((action) => {
          const config = getActionConfig(action, language);
          const isPrimary = action === 'start_planning';

          return (
            <TouchableOpacity
              key={action}
              style={[
                styles.actionButton,
                isPrimary && styles.primaryActionButton,
                !isPrimary && { borderColor: config.color },
              ]}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={config.icon as any}
                size={18}
                color={isPrimary ? '#FFFFFF' : config.color}
              />
              <Text
                style={[
                  styles.actionText,
                  isPrimary && styles.primaryActionText,
                  !isPrimary && { color: config.color },
                ]}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginVertical: spacing.xs,
    ...shadows.medium,
  },

  // Hero Image
  heroImage: {
    height: 180,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  matchBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  matchLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  heroContent: {
    gap: spacing.xs,
  },
  destinationName: {
    ...typography.title2,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countryText: {
    ...typography.subhead,
    color: 'rgba(255,255,255,0.9)',
  },

  // Content
  content: {
    padding: spacing.md,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statLabel: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.footnote,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Weather
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  weatherText: {
    ...typography.footnote,
    color: colors.text,
  },

  // Highlights
  highlightsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  highlightsTitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  highlightsList: {
    gap: spacing.xs,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  highlightText: {
    ...typography.footnote,
    color: colors.text,
    flex: 1,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  primaryActionButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    flex: 1,
    justifyContent: 'center',
  },
  actionText: {
    ...typography.footnote,
    fontWeight: '600',
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
});

export default DestinationCard;
