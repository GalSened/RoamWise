/**
 * PlaceCard Component - AI Chat Action Card
 *
 * Production-ready place recommendation card displayed in chat.
 * Features: photo, rating, distance, match score, AI reasoning, action buttons.
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
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { PlaceCardData, PlaceCardAction } from './types';
import { Place } from '../../../types';

interface PlaceCardProps {
  data: PlaceCardData;
  onAddToTrip: (place: Place, tripId?: string) => Promise<void>;
  onNavigate: (place: Place) => void;
  onSave: (place: Place) => Promise<void>;
  onViewDetails: (place: Place) => void;
  language?: 'he' | 'en';
}

/**
 * Format distance for display
 */
function formatDistance(meters: number | undefined, language: 'he' | 'en'): string {
  if (!meters) return '';

  if (meters < 1000) {
    return language === 'he' ? `${meters} מטרים` : `${meters}m`;
  }

  const km = (meters / 1000).toFixed(1);
  return language === 'he' ? `${km} ק"מ` : `${km}km`;
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number | undefined, language: 'he' | 'en'): string {
  if (!minutes) return '';

  if (minutes < 60) {
    return language === 'he' ? `${minutes} דקות` : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (language === 'he') {
    return mins > 0 ? `${hours} שעות ${mins} דקות` : `${hours} שעות`;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format price range
 */
function formatPriceRange(priceLevel: number | undefined): string {
  if (!priceLevel) return '';
  return '$'.repeat(Math.min(priceLevel, 4));
}

/**
 * Get action button config
 */
function getActionConfig(
  action: PlaceCardAction,
  language: 'he' | 'en'
): { icon: string; label: string; color: string } {
  const configs: Record<PlaceCardAction, { icon: string; labelEn: string; labelHe: string; color: string }> = {
    add_to_trip: {
      icon: 'add-circle',
      labelEn: 'Add to Trip',
      labelHe: 'הוסף לטיול',
      color: colors.primary,
    },
    navigate: {
      icon: 'navigate',
      labelEn: 'Navigate',
      labelHe: 'ניווט',
      color: colors.success,
    },
    save: {
      icon: 'bookmark-outline',
      labelEn: 'Save',
      labelHe: 'שמור',
      color: colors.secondary,
    },
    view_details: {
      icon: 'information-circle-outline',
      labelEn: 'Details',
      labelHe: 'פרטים',
      color: colors.info,
    },
    call: {
      icon: 'call-outline',
      labelEn: 'Call',
      labelHe: 'התקשר',
      color: colors.success,
    },
    website: {
      icon: 'globe-outline',
      labelEn: 'Website',
      labelHe: 'אתר',
      color: colors.primary,
    },
  };

  const config = configs[action];
  return {
    icon: config.icon,
    label: language === 'he' ? config.labelHe : config.labelEn,
    color: config.color,
  };
}

export function PlaceCard({
  data,
  onAddToTrip,
  onNavigate,
  onSave,
  onViewDetails,
  language = 'he',
}: PlaceCardProps) {
  const { place, matchScore, distance, estimatedDuration, aiReasoning, actions, isOpen, priceRange } = data;

  // Get photo URL or placeholder
  const photoUrl = useMemo(() => {
    if (place.photos && place.photos.length > 0) {
      return place.photos[0].url;
    }
    return null;
  }, [place.photos]);

  // Handle action button press
  const handleActionPress = useCallback(
    async (action: PlaceCardAction) => {
      haptics.impact('light');

      switch (action) {
        case 'add_to_trip':
          try {
            await onAddToTrip(place);
            haptics.notification('success');
          } catch (error) {
            haptics.notification('error');
            Alert.alert(
              language === 'he' ? 'שגיאה' : 'Error',
              language === 'he' ? 'לא ניתן להוסיף לטיול' : 'Could not add to trip'
            );
          }
          break;

        case 'navigate':
          onNavigate(place);
          break;

        case 'save':
          try {
            await onSave(place);
            haptics.notification('success');
          } catch (error) {
            haptics.notification('error');
            Alert.alert(
              language === 'he' ? 'שגיאה' : 'Error',
              language === 'he' ? 'לא ניתן לשמור' : 'Could not save'
            );
          }
          break;

        case 'view_details':
          onViewDetails(place);
          break;

        case 'call':
          if (place.phoneNumber) {
            Linking.openURL(`tel:${place.phoneNumber}`);
          }
          break;

        case 'website':
          if (place.website) {
            Linking.openURL(place.website);
          }
          break;
      }
    },
    [place, onAddToTrip, onNavigate, onSave, onViewDetails, language]
  );

  // Filter available actions based on place data
  const availableActions = useMemo(() => {
    return actions.filter((action) => {
      if (action === 'call' && !place.phoneNumber) return false;
      if (action === 'website' && !place.website) return false;
      return true;
    });
  }, [actions, place.phoneNumber, place.website]);

  return (
    <View style={styles.container}>
      {/* Header with photo */}
      <View style={styles.header}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image-outline" size={32} color={colors.textTertiary} />
          </View>
        )}

        {/* Match score badge */}
        {matchScore !== undefined && matchScore > 0 && (
          <View style={styles.matchBadge}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            <Text style={styles.matchText}>{matchScore}%</Text>
          </View>
        )}

        {/* Open/Closed badge */}
        {isOpen !== undefined && (
          <View style={[styles.statusBadge, isOpen ? styles.openBadge : styles.closedBadge]}>
            <Text style={styles.statusText}>
              {isOpen
                ? language === 'he'
                  ? 'פתוח'
                  : 'Open'
                : language === 'he'
                  ? 'סגור'
                  : 'Closed'}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>
            {place.name}
          </Text>
          {priceRange && <Text style={styles.priceRange}>{priceRange}</Text>}
        </View>

        {/* Address */}
        {place.address && (
          <Text style={styles.address} numberOfLines={1}>
            {place.address}
          </Text>
        )}

        {/* Meta row: rating, distance, duration */}
        <View style={styles.metaRow}>
          {/* Rating */}
          {place.rating !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color="#FFB800" />
              <Text style={styles.metaText}>
                {place.rating.toFixed(1)}
                {place.userRatingsTotal && (
                  <Text style={styles.ratingCount}> ({place.userRatingsTotal})</Text>
                )}
              </Text>
            </View>
          )}

          {/* Distance */}
          {distance !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatDistance(distance, language)}</Text>
            </View>
          )}

          {/* Duration */}
          {estimatedDuration !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatDuration(estimatedDuration, language)}</Text>
            </View>
          )}
        </View>

        {/* AI Reasoning */}
        {aiReasoning && (
          <View style={styles.reasoningContainer}>
            <Ionicons name="sparkles-outline" size={14} color={colors.secondary} />
            <Text style={styles.reasoningText}>{aiReasoning}</Text>
          </View>
        )}

        {/* Types/Categories */}
        {place.types && place.types.length > 0 && (
          <View style={styles.typesRow}>
            {place.types.slice(0, 3).map((type, index) => (
              <View key={index} style={styles.typeChip}>
                <Text style={styles.typeText}>{formatPlaceType(type, language)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        {availableActions.map((action, index) => {
          const config = getActionConfig(action, language);
          const isPrimary = action === 'add_to_trip' || action === 'navigate';

          return (
            <TouchableOpacity
              key={action}
              style={[
                styles.actionButton,
                isPrimary && styles.primaryActionButton,
                { borderColor: config.color },
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

/**
 * Format place type for display
 */
function formatPlaceType(type: string, language: 'he' | 'en'): string {
  const typeMap: Record<string, { en: string; he: string }> = {
    restaurant: { en: 'Restaurant', he: 'מסעדה' },
    cafe: { en: 'Cafe', he: 'קפה' },
    bar: { en: 'Bar', he: 'בר' },
    museum: { en: 'Museum', he: 'מוזיאון' },
    park: { en: 'Park', he: 'פארק' },
    beach: { en: 'Beach', he: 'חוף' },
    hotel: { en: 'Hotel', he: 'מלון' },
    tourist_attraction: { en: 'Attraction', he: 'אטרקציה' },
    shopping_mall: { en: 'Mall', he: 'קניון' },
    synagogue: { en: 'Synagogue', he: 'בית כנסת' },
    church: { en: 'Church', he: 'כנסייה' },
    mosque: { en: 'Mosque', he: 'מסגד' },
    point_of_interest: { en: 'POI', he: 'נקודת עניין' },
    establishment: { en: 'Place', he: 'מקום' },
    food: { en: 'Food', he: 'אוכל' },
    lodging: { en: 'Lodging', he: 'לינה' },
    store: { en: 'Store', he: 'חנות' },
    gas_station: { en: 'Gas', he: 'דלק' },
    parking: { en: 'Parking', he: 'חנייה' },
    spa: { en: 'Spa', he: 'ספא' },
    gym: { en: 'Gym', he: 'חדר כושר' },
    night_club: { en: 'Club', he: 'מועדון' },
    movie_theater: { en: 'Cinema', he: 'קולנוע' },
    amusement_park: { en: 'Amusement', he: 'לונה פארק' },
    zoo: { en: 'Zoo', he: 'גן חיות' },
    aquarium: { en: 'Aquarium', he: 'אקווריום' },
  };

  const formatted = type.replace(/_/g, ' ');
  const mapped = typeMap[type];

  if (mapped) {
    return language === 'he' ? mapped.he : mapped.en;
  }

  // Capitalize first letter for unmapped types
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginVertical: spacing.xs,
    ...shadows.medium,
  },

  // Header / Photo
  header: {
    height: 140,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  openBadge: {
    backgroundColor: colors.success,
  },
  closedBadge: {
    backgroundColor: colors.danger,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Content
  content: {
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
  },
  priceRange: {
    ...typography.subhead,
    color: colors.success,
    fontWeight: '600',
  },
  address: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.footnote,
    color: colors.text,
  },
  ratingCount: {
    color: colors.textSecondary,
  },

  // AI Reasoning
  reasoningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  reasoningText: {
    ...typography.footnote,
    color: colors.secondary,
    fontStyle: 'italic',
    flex: 1,
  },

  // Types
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  typeChip: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    ...typography.caption2,
    color: colors.textSecondary,
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
  },
  actionText: {
    ...typography.footnote,
    fontWeight: '600',
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
});

export default PlaceCard;
