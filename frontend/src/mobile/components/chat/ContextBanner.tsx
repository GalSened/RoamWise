/**
 * ContextBanner Component - AI Chat Context Display
 *
 * Production-ready banner showing active context (trip, location, weather).
 * Features: collapsible, context indicators, quick actions.
 *
 * Based on CHAT_PAGE_SPEC.md
 */

import React, { useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { CurrentStateContext, ActiveTripContext, TodaysPlanContext } from './types';
import { WeatherNow, LatLng } from '../../../types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ContextBannerProps {
  currentState: CurrentStateContext;
  onTripPress?: () => void;
  onLocationPress?: () => void;
  onWeatherPress?: () => void;
  language?: 'he' | 'en';
}

/**
 * Format location for display
 */
function formatLocation(location: LatLng | null, language: 'he' | 'en'): string {
  if (!location) {
    return language === 'he' ? 'מיקום לא זמין' : 'Location unavailable';
  }
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

/**
 * Get weather icon
 */
function getWeatherIcon(icon: string): string {
  const iconLower = icon.toLowerCase();

  if (iconLower.includes('sun') || iconLower.includes('clear')) {
    return 'sunny';
  }
  if (iconLower.includes('cloud') || iconLower.includes('overcast')) {
    return 'cloudy';
  }
  if (iconLower.includes('rain') || iconLower.includes('shower')) {
    return 'rainy';
  }
  if (iconLower.includes('snow')) {
    return 'snow';
  }
  if (iconLower.includes('storm') || iconLower.includes('thunder')) {
    return 'thunderstorm';
  }
  return 'partly-sunny';
}

/**
 * Get schedule status info
 */
function getScheduleStatusInfo(
  status: 'on_track' | 'behind' | 'ahead',
  language: 'he' | 'en'
): { label: string; color: string; icon: string } {
  switch (status) {
    case 'on_track':
      return {
        label: language === 'he' ? 'בזמן' : 'On Track',
        color: colors.success,
        icon: 'checkmark-circle',
      };
    case 'behind':
      return {
        label: language === 'he' ? 'מאחור' : 'Behind',
        color: colors.warning,
        icon: 'time-outline',
      };
    case 'ahead':
      return {
        label: language === 'he' ? 'מקדים' : 'Ahead',
        color: colors.info,
        icon: 'rocket-outline',
      };
  }
}

/**
 * Context item component
 */
function ContextItem({
  icon,
  label,
  value,
  color = colors.textSecondary,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.contextItem}>
      <Ionicons name={icon as any} size={16} color={color} />
      <View style={styles.contextItemText}>
        <Text style={styles.contextLabel}>{label}</Text>
        <Text style={styles.contextValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export function ContextBanner({
  currentState,
  onTripPress,
  onLocationPress,
  onWeatherPress,
  language = 'he',
}: ContextBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const { location, activeTrip, todaysPlan, timezone, localTime, weather } = currentState;

  // Toggle expansion
  const toggleExpanded = useCallback(() => {
    haptics.selection();

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);

    Animated.spring(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  // Rotation for chevron
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Has active context
  const hasActiveTrip = activeTrip !== null;
  const hasLocation = location !== null;
  const hasWeather = weather !== undefined;

  // Compute summary
  const summaryText = useMemo(() => {
    const parts: string[] = [];

    if (hasActiveTrip && activeTrip) {
      parts.push(
        language === 'he'
          ? `טיול ל${activeTrip.destination}`
          : `Trip to ${activeTrip.destination}`
      );
    }

    if (hasWeather && weather) {
      parts.push(`${Math.round(weather.temperature)}°C`);
    }

    if (parts.length === 0) {
      return language === 'he' ? 'אין הקשר פעיל' : 'No active context';
    }

    return parts.join(' • ');
  }, [hasActiveTrip, activeTrip, hasWeather, weather, language]);

  // Context indicators
  const indicators = useMemo(() => {
    const items: { icon: string; color: string; active: boolean }[] = [
      { icon: 'airplane', color: colors.primary, active: hasActiveTrip },
      { icon: 'location', color: colors.success, active: hasLocation },
      { icon: 'partly-sunny', color: colors.warning, active: hasWeather },
    ];

    return items.filter((item) => item.active);
  }, [hasActiveTrip, hasLocation, hasWeather]);

  return (
    <View style={styles.container}>
      {/* Collapsed header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {/* Context indicators */}
          <View style={styles.indicators}>
            {indicators.map((indicator, index) => (
              <View
                key={index}
                style={[styles.indicator, { backgroundColor: indicator.color }]}
              >
                <Ionicons name={indicator.icon as any} size={12} color="#FFFFFF" />
              </View>
            ))}
          </View>

          {/* Summary text */}
          <Text style={styles.summaryText} numberOfLines={1}>
            {summaryText}
          </Text>
        </View>

        {/* Expand chevron */}
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Active Trip */}
          {hasActiveTrip && activeTrip && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'he' ? 'טיול פעיל' : 'Active Trip'}
              </Text>
              <View style={styles.tripInfo}>
                <ContextItem
                  icon="airplane"
                  label={language === 'he' ? 'יעד' : 'Destination'}
                  value={activeTrip.destination}
                  color={colors.primary}
                  onPress={onTripPress}
                />
                <ContextItem
                  icon="calendar"
                  label={language === 'he' ? 'יום' : 'Day'}
                  value={`${activeTrip.currentDay}/${activeTrip.totalDays}`}
                />
                {activeTrip.scheduleStatus && (
                  <View style={styles.statusBadge}>
                    {(() => {
                      const statusInfo = getScheduleStatusInfo(activeTrip.scheduleStatus, language);
                      return (
                        <>
                          <Ionicons
                            name={statusInfo.icon as any}
                            size={14}
                            color={statusInfo.color}
                          />
                          <Text style={[styles.statusText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                          </Text>
                        </>
                      );
                    })()}
                  </View>
                )}
              </View>

              {/* Next activity */}
              {activeTrip.nextActivity && (
                <View style={styles.nextActivity}>
                  <Ionicons name="arrow-forward-circle" size={16} color={colors.secondary} />
                  <Text style={styles.nextActivityText}>
                    {language === 'he' ? 'הבא: ' : 'Next: '}
                    <Text style={styles.nextActivityName}>{activeTrip.nextActivity.name}</Text>
                    {' @ '}
                    {new Date(activeTrip.nextActivity.time).toLocaleTimeString(
                      language === 'he' ? 'he-IL' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Location */}
          {hasLocation && (
            <View style={styles.section}>
              <ContextItem
                icon="location"
                label={language === 'he' ? 'מיקום נוכחי' : 'Current Location'}
                value={formatLocation(location, language)}
                color={colors.success}
                onPress={onLocationPress}
              />
            </View>
          )}

          {/* Weather */}
          {hasWeather && weather && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.weatherCard}
                onPress={onWeatherPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={getWeatherIcon(weather.icon) as any}
                  size={24}
                  color={colors.warning}
                />
                <View style={styles.weatherInfo}>
                  <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°C</Text>
                  <Text style={styles.weatherCondition}>{weather.condition}</Text>
                </View>
                <View style={styles.weatherDetails}>
                  <Text style={styles.weatherDetail}>
                    {language === 'he' ? 'מרגיש כמו' : 'Feels like'} {Math.round(weather.feelsLike)}°
                  </Text>
                  <Text style={styles.weatherDetail}>
                    {language === 'he' ? 'לחות' : 'Humidity'} {weather.humidity}%
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Today's Plan Summary */}
          {todaysPlan && todaysPlan.activities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'he' ? 'תכנית להיום' : "Today's Plan"}
              </Text>
              <View style={styles.planStats}>
                <View style={styles.planStat}>
                  <Text style={styles.planStatValue}>{todaysPlan.completedCount}</Text>
                  <Text style={styles.planStatLabel}>
                    {language === 'he' ? 'הושלמו' : 'Done'}
                  </Text>
                </View>
                <View style={styles.planStatDivider} />
                <View style={styles.planStat}>
                  <Text style={styles.planStatValue}>{todaysPlan.upcomingCount}</Text>
                  <Text style={styles.planStatLabel}>
                    {language === 'he' ? 'נותרו' : 'Left'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Time zone info */}
          <View style={styles.timezoneRow}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.timezoneText}>
              {new Date(localTime).toLocaleString(
                language === 'he' ? 'he-IL' : 'en-US',
                {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
              {' • '}
              {timezone}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    ...shadows.small,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  indicators: {
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    ...typography.subhead,
    color: colors.text,
    flex: 1,
  },

  // Expanded content
  expandedContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },

  // Sections
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption1,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Context items
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contextItemText: {
    flex: 1,
  },
  contextLabel: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  contextValue: {
    ...typography.footnote,
    color: colors.text,
  },

  // Trip info
  tripInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption2,
    fontWeight: '600',
  },

  // Next activity
  nextActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  nextActivityText: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  nextActivityName: {
    color: colors.text,
    fontWeight: '500',
  },

  // Weather card
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    ...typography.title3,
    color: colors.text,
  },
  weatherCondition: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  weatherDetails: {
    alignItems: 'flex-end',
  },
  weatherDetail: {
    ...typography.caption2,
    color: colors.textTertiary,
  },

  // Plan stats
  planStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  planStat: {
    flex: 1,
    alignItems: 'center',
  },
  planStatValue: {
    ...typography.title3,
    color: colors.primary,
  },
  planStatLabel: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
  planStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.md,
  },

  // Timezone
  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  timezoneText: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
});

export default ContextBanner;
