/**
 * ActionCard Component - AI Chat Action Card Dispatcher
 *
 * Production-ready base component that renders the appropriate action card
 * based on type. Handles all card types with proper callbacks.
 *
 * Based on CHAT_PAGE_SPEC.md
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme/tokens';
import {
  ActionCard as ActionCardType,
  ActionCardCallbacks,
  PlaceCardData,
  DestinationCardData,
  ConfirmationCardData,
  WeatherCardData,
  ItineraryCardData,
  BookingLinkCardData,
  NavigationCardData,
} from './types';
import { PlaceCard } from './PlaceCard';
import { DestinationCard } from './DestinationCard';
import { ConfirmationCard } from './ConfirmationCard';
import { WeatherCard } from './WeatherCard';
import { ItineraryCard } from './ItineraryCard';
import { BookingLinkCard } from './BookingLinkCard';
import { NavigationCard } from './NavigationCard';

interface ActionCardProps {
  card: ActionCardType;
  callbacks: ActionCardCallbacks;
  language?: 'he' | 'en';
}

/**
 * Render action card based on type
 */
export function ActionCard({ card, callbacks, language = 'he' }: ActionCardProps) {
  switch (card.type) {
    case 'place':
      return (
        <PlaceCard
          data={card as PlaceCardData}
          onAddToTrip={callbacks.onAddToTrip}
          onNavigate={callbacks.onNavigate}
          onSave={callbacks.onSave}
          onViewDetails={callbacks.onViewDetails}
          language={language}
        />
      );

    case 'destination':
      return (
        <DestinationCard
          data={card as DestinationCardData}
          onStartPlanning={callbacks.onStartPlanning}
          onAddToBucketList={callbacks.onAddToBucketList}
          onViewDetails={(dest) => {
            // Convert destination to place-like view
            callbacks.onStartPlanning(dest);
          }}
          language={language}
        />
      );

    case 'confirmation':
      return (
        <ConfirmationCard
          data={card as ConfirmationCardData}
          onUndo={callbacks.onUndo}
          onViewRelated={(type, id) => {
            // Route to appropriate detail view
            if (type === 'trip') {
              callbacks.onViewItinerary(id);
            }
          }}
          language={language}
        />
      );

    case 'weather':
      return <WeatherCard data={card as WeatherCardData} language={language} />;

    case 'itinerary':
      return (
        <ItineraryCard
          data={card as ItineraryCardData}
          onViewFull={callbacks.onViewItinerary}
          language={language}
        />
      );

    case 'booking_link':
      return (
        <BookingLinkCard
          data={card as BookingLinkCardData}
          onOpenLink={callbacks.onOpenBookingLink}
          language={language}
        />
      );

    case 'navigation':
      return (
        <NavigationCard
          data={card as NavigationCardData}
          onNavigate={callbacks.onNavigate}
          language={language}
        />
      );

    default:
      // Fallback for unknown card types
      return (
        <View style={styles.fallbackCard}>
          <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.fallbackText}>
            {language === 'he' ? 'סוג כרטיס לא מוכר' : 'Unknown card type'}
          </Text>
        </View>
      );
  }
}

/**
 * WeatherCard - Inline weather display
 */
function WeatherCard({
  data,
  language,
}: {
  data: WeatherCardData;
  language: 'he' | 'en';
}) {
  const { location, current, forecast, travelAdvice } = data;

  const getWeatherIcon = (icon: string): string => {
    const iconLower = icon.toLowerCase();
    if (iconLower.includes('sun') || iconLower.includes('clear')) return 'sunny';
    if (iconLower.includes('cloud')) return 'cloudy';
    if (iconLower.includes('rain')) return 'rainy';
    if (iconLower.includes('snow')) return 'snow';
    if (iconLower.includes('storm')) return 'thunderstorm';
    return 'partly-sunny';
  };

  return (
    <View style={styles.weatherCard}>
      {/* Header */}
      <View style={styles.weatherHeader}>
        <Ionicons name="location" size={14} color={colors.textSecondary} />
        <Text style={styles.weatherLocation}>{location}</Text>
      </View>

      {/* Current weather */}
      <View style={styles.weatherCurrent}>
        <Ionicons
          name={getWeatherIcon(current.icon) as any}
          size={48}
          color={colors.warning}
        />
        <View style={styles.weatherCurrentInfo}>
          <Text style={styles.weatherTemp}>{Math.round(current.temperature)}°C</Text>
          <Text style={styles.weatherCondition}>{current.condition}</Text>
          <Text style={styles.weatherFeelsLike}>
            {language === 'he' ? 'מרגיש כמו' : 'Feels like'} {Math.round(current.feelsLike)}°
          </Text>
        </View>
        <View style={styles.weatherStats}>
          <View style={styles.weatherStat}>
            <Ionicons name="water-outline" size={14} color={colors.info} />
            <Text style={styles.weatherStatText}>{current.humidity}%</Text>
          </View>
          <View style={styles.weatherStat}>
            <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.weatherStatText}>{current.windSpeed} km/h</Text>
          </View>
          {current.uvIndex > 0 && (
            <View style={styles.weatherStat}>
              <Ionicons name="sunny-outline" size={14} color={colors.warning} />
              <Text style={styles.weatherStatText}>UV {current.uvIndex}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Forecast */}
      {forecast && forecast.length > 0 && (
        <View style={styles.forecastRow}>
          {forecast.slice(0, 5).map((day, index) => (
            <View key={index} style={styles.forecastDay}>
              <Text style={styles.forecastDayName}>
                {new Date(day.date).toLocaleDateString(
                  language === 'he' ? 'he-IL' : 'en-US',
                  { weekday: 'short' }
                )}
              </Text>
              <Ionicons
                name={getWeatherIcon(day.icon) as any}
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.forecastTemp}>
                {Math.round(day.high)}° / {Math.round(day.low)}°
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Travel advice */}
      {travelAdvice && (
        <View style={styles.adviceContainer}>
          <Ionicons name="bulb-outline" size={16} color={colors.secondary} />
          <Text style={styles.adviceText}>{travelAdvice}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * ItineraryCard - Trip itinerary summary
 */
function ItineraryCard({
  data,
  onViewFull,
  language,
}: {
  data: ItineraryCardData;
  onViewFull: (tripId: string) => void;
  language: 'he' | 'en';
}) {
  const { tripId, destination, dateRange, days, totalActivities, estimatedBudget, actions } = data;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(
      language === 'he' ? 'he-IL' : 'en-US',
      { month: 'short', day: 'numeric' }
    );
  };

  return (
    <View style={styles.itineraryCard}>
      {/* Header */}
      <View style={styles.itineraryHeader}>
        <View>
          <Text style={styles.itineraryTitle}>{destination}</Text>
          <Text style={styles.itineraryDates}>
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </Text>
        </View>
        <View style={styles.itineraryStats}>
          <Text style={styles.itineraryStat}>
            {days.length} {language === 'he' ? 'ימים' : 'days'}
          </Text>
          <Text style={styles.itineraryStat}>
            {totalActivities} {language === 'he' ? 'פעילויות' : 'activities'}
          </Text>
        </View>
      </View>

      {/* Days summary */}
      <View style={styles.daysList}>
        {days.slice(0, 3).map((day) => (
          <View key={day.dayNumber} style={styles.dayItem}>
            <View style={styles.dayNumber}>
              <Text style={styles.dayNumberText}>{day.dayNumber}</Text>
            </View>
            <View style={styles.dayInfo}>
              <Text style={styles.dayDate}>
                {new Date(day.date).toLocaleDateString(
                  language === 'he' ? 'he-IL' : 'en-US',
                  { weekday: 'short', month: 'short', day: 'numeric' }
                )}
              </Text>
              <Text style={styles.dayHighlights} numberOfLines={1}>
                {day.highlights.slice(0, 2).join(' • ')}
              </Text>
            </View>
            <Text style={styles.dayCount}>
              {day.activityCount} {language === 'he' ? 'פעילויות' : 'activities'}
            </Text>
          </View>
        ))}
        {days.length > 3 && (
          <Text style={styles.moreDays}>
            +{days.length - 3} {language === 'he' ? 'ימים נוספים' : 'more days'}
          </Text>
        )}
      </View>

      {/* Budget */}
      {estimatedBudget && (
        <View style={styles.budgetRow}>
          <Ionicons name="wallet-outline" size={16} color={colors.success} />
          <Text style={styles.budgetText}>
            {language === 'he' ? 'תקציב משוער:' : 'Est. budget:'} ₪{estimatedBudget.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.itineraryActions}>
        {actions.includes('view_full') && (
          <TouchableOpacity
            style={styles.viewFullButton}
            onPress={() => onViewFull(tripId)}
          >
            <Text style={styles.viewFullText}>
              {language === 'he' ? 'צפה במסלול המלא' : 'View Full Itinerary'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * BookingLinkCard - External booking with affiliate tracking
 */
function BookingLinkCard({
  data,
  onOpenLink,
  language,
}: {
  data: BookingLinkCardData;
  onOpenLink: (url: string, provider: string) => void;
  language: 'he' | 'en';
}) {
  const { provider, providerLogo, title, originalPrice, currentPrice, currency, discountPercent, externalUrl, disclaimer } = data;

  const currencySymbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€';

  return (
    <View style={styles.bookingCard}>
      {/* Provider header */}
      <View style={styles.bookingHeader}>
        {providerLogo ? (
          <Image source={{ uri: providerLogo }} style={styles.providerLogo} />
        ) : (
          <Text style={styles.providerName}>{provider}</Text>
        )}
        {discountPercent && discountPercent > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.bookingTitle} numberOfLines={2}>{title}</Text>

      {/* Pricing */}
      <View style={styles.pricingRow}>
        {originalPrice && originalPrice > currentPrice && (
          <Text style={styles.originalPrice}>
            {currencySymbol}{originalPrice.toLocaleString()}
          </Text>
        )}
        <Text style={styles.currentPrice}>
          {currencySymbol}{currentPrice.toLocaleString()}
        </Text>
      </View>

      {/* Book button */}
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => onOpenLink(externalUrl, provider)}
      >
        <Text style={styles.bookButtonText}>
          {language === 'he' ? 'הזמן עכשיו' : 'Book Now'}
        </Text>
        <Ionicons name="open-outline" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </View>
  );
}

/**
 * NavigationCard - Start navigation to destination
 */
function NavigationCard({
  data,
  onNavigate,
  language,
}: {
  data: NavigationCardData;
  onNavigate: (place: any) => void;
  language: 'he' | 'en';
}) {
  const { destination, estimatedTime, estimatedDistance, trafficCondition, navigationApps } = data;

  const getTrafficColor = (condition: 'light' | 'moderate' | 'heavy'): string => {
    switch (condition) {
      case 'light': return colors.success;
      case 'moderate': return colors.warning;
      case 'heavy': return colors.danger;
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return language === 'he' ? `${meters} מ'` : `${meters}m`;
    }
    return language === 'he' ? `${(meters / 1000).toFixed(1)} ק"מ` : `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return language === 'he' ? `${minutes} דקות` : `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return language === 'he' ? `${hours} שעות ${mins} דקות` : `${hours}h ${mins}m`;
  };

  return (
    <View style={styles.navigationCard}>
      {/* Destination */}
      <View style={styles.navDestination}>
        <Ionicons name="navigate" size={24} color={colors.primary} />
        <View style={styles.navDestInfo}>
          <Text style={styles.navDestName}>{destination.name}</Text>
          {destination.address && (
            <Text style={styles.navDestAddress} numberOfLines={1}>
              {destination.address}
            </Text>
          )}
        </View>
      </View>

      {/* Trip info */}
      <View style={styles.navInfo}>
        <View style={styles.navInfoItem}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.navInfoText}>{formatTime(estimatedTime)}</Text>
        </View>
        <View style={styles.navInfoItem}>
          <Ionicons name="car-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.navInfoText}>{formatDistance(estimatedDistance)}</Text>
        </View>
        <View style={styles.navInfoItem}>
          <View style={[styles.trafficDot, { backgroundColor: getTrafficColor(trafficCondition) }]} />
          <Text style={[styles.navInfoText, { color: getTrafficColor(trafficCondition) }]}>
            {trafficCondition === 'light'
              ? language === 'he' ? 'תנועה קלה' : 'Light traffic'
              : trafficCondition === 'moderate'
                ? language === 'he' ? 'תנועה בינונית' : 'Moderate traffic'
                : language === 'he' ? 'תנועה כבדה' : 'Heavy traffic'}
          </Text>
        </View>
      </View>

      {/* Navigation apps */}
      <View style={styles.navApps}>
        {navigationApps.filter(app => app.available).map((app) => (
          <TouchableOpacity
            key={app.id}
            style={styles.navAppButton}
            onPress={() => {
              // Open deep link
              Linking.openURL(app.deepLink).catch(() => {
                onNavigate(destination);
              });
            }}
          >
            <Ionicons
              name={
                app.id === 'waze' ? 'navigate-circle' :
                app.id === 'google_maps' ? 'map' :
                'compass'
              }
              size={20}
              color={colors.primary}
            />
            <Text style={styles.navAppText}>{app.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Import needed for BookingLinkCard and NavigationCard
import { Image, TouchableOpacity, Linking } from 'react-native';

const styles = StyleSheet.create({
  // Fallback
  fallbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
  },
  fallbackText: {
    ...typography.footnote,
    color: colors.textSecondary,
  },

  // Weather Card
  weatherCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weatherLocation: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  weatherCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weatherCurrentInfo: {
    flex: 1,
  },
  weatherTemp: {
    ...typography.largeTitle,
    color: colors.text,
  },
  weatherCondition: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  weatherFeelsLike: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  weatherStats: {
    gap: spacing.xs,
  },
  weatherStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherStatText: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  forecastDay: {
    alignItems: 'center',
    gap: 4,
  },
  forecastDayName: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  forecastTemp: {
    ...typography.caption2,
    color: colors.text,
  },
  adviceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
  },
  adviceText: {
    ...typography.footnote,
    color: colors.secondary,
    fontStyle: 'italic',
    flex: 1,
  },

  // Itinerary Card
  itineraryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itineraryTitle: {
    ...typography.headline,
    color: colors.text,
  },
  itineraryDates: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  itineraryStats: {
    alignItems: 'flex-end',
  },
  itineraryStat: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
  daysList: {
    gap: spacing.sm,
  },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberText: {
    ...typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayInfo: {
    flex: 1,
  },
  dayDate: {
    ...typography.footnote,
    color: colors.text,
    fontWeight: '500',
  },
  dayHighlights: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
  dayCount: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  moreDays: {
    ...typography.footnote,
    color: colors.primary,
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  budgetText: {
    ...typography.footnote,
    color: colors.success,
    fontWeight: '500',
  },
  itineraryActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  viewFullText: {
    ...typography.subhead,
    color: colors.primary,
    fontWeight: '600',
  },

  // Booking Card
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerLogo: {
    height: 24,
    width: 80,
    resizeMode: 'contain',
  },
  providerName: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  discountBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    ...typography.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bookingTitle: {
    ...typography.subhead,
    color: colors.text,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  originalPrice: {
    ...typography.footnote,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  currentPrice: {
    ...typography.title3,
    color: colors.success,
    fontWeight: '700',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  bookButtonText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disclaimer: {
    ...typography.caption2,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Navigation Card
  navigationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  navDestination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navDestInfo: {
    flex: 1,
  },
  navDestName: {
    ...typography.headline,
    color: colors.text,
  },
  navDestAddress: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  navInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
  },
  navInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navInfoText: {
    ...typography.footnote,
    color: colors.text,
  },
  trafficDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  navApps: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navAppButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  navAppText: {
    ...typography.footnote,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default ActionCard;
