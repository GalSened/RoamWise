/**
 * TripSummaryCard Component
 *
 * Displays post-trip summary with:
 * - Trip highlight photos
 * - Stats (distance, activities, photos)
 * - Rating prompt
 * - Share and "Plan Next" CTAs
 * - Achievement unlocks
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import { TripInfo } from './UserStateManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TripStats {
  distanceKm: number;
  activitiesCompleted: number;
  photosCount: number;
  daysCount: number;
  citiesVisited: number;
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  isNew?: boolean;
}

interface TripSummaryCardProps {
  trip: TripInfo;
  stats?: TripStats;
  achievements?: Achievement[];
  photos?: string[];
  daysSince: number;
  userRating?: number;
  onRate?: (rating: number) => void;
  onShare?: () => void;
  onPlanNext?: () => void;
  onViewDetails?: () => void;
  onViewPhotos?: () => void;
}

/**
 * Star Rating Component
 */
function StarRating({
  rating,
  onRate,
  size = 28,
}: {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
}) {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => onRate?.(star)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? colors.warning : colors.textSecondary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Stat Item Component
 */
function StatItem({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Achievement Badge Component
 */
function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <View style={[styles.achievementBadge, achievement.isNew && styles.achievementNew]}>
      {achievement.isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>חדש!</Text></View>}
      <Text style={styles.achievementIcon}>{achievement.icon}</Text>
      <Text style={styles.achievementTitle}>{achievement.title}</Text>
    </View>
  );
}

/**
 * Photo Gallery Thumbnail
 */
function PhotoGallery({
  photos,
  onPress,
}: {
  photos: string[];
  onPress?: () => void;
}) {
  if (!photos || photos.length === 0) return null;

  const displayPhotos = photos.slice(0, 4);
  const remainingCount = photos.length - 4;

  return (
    <TouchableOpacity style={styles.photoGallery} onPress={onPress} activeOpacity={0.9}>
      {displayPhotos.map((photo, index) => (
        <View
          key={index}
          style={[
            styles.photoThumbnail,
            index === 0 && styles.photoThumbnailLarge,
          ]}
        >
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {index === 3 && remainingCount > 0 && (
            <View style={styles.photoOverlay}>
              <Text style={styles.photoOverlayText}>+{remainingCount}</Text>
            </View>
          )}
        </View>
      ))}
    </TouchableOpacity>
  );
}

// Mock data for demo
const mockStats: TripStats = {
  distanceKm: 127,
  activitiesCompleted: 18,
  photosCount: 243,
  daysCount: 5,
  citiesVisited: 3,
};

const mockAchievements: Achievement[] = [
  { id: '1', icon: '🎒', title: 'מטייל מתחיל', description: 'השלמת את הטיול הראשון!', isNew: true },
  { id: '2', icon: '📸', title: 'צלם', description: '100+ תמונות בטיול', isNew: true },
];

const mockPhotos = [
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400',
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400',
  'https://images.unsplash.com/photo-1471874708433-acd480424946?w=400',
  'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=400',
];

export function TripSummaryCard({
  trip,
  stats = mockStats,
  achievements = mockAchievements,
  photos = mockPhotos,
  daysSince,
  userRating = 0,
  onRate,
  onShare,
  onPlanNext,
  onViewDetails,
  onViewPhotos,
}: TripSummaryCardProps) {
  const [rating, setRating] = useState(userRating);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleRate = (newRating: number) => {
    setRating(newRating);
    onRate?.(newRating);
  };

  const getWelcomeMessage = () => {
    if (daysSince === 0) return 'סיימת עכשיו את הטיול!';
    if (daysSince === 1) return 'חזרת אתמול מהטיול';
    return `חזרת לפני ${daysSince} ימים`;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header with trip info */}
      <TouchableOpacity style={styles.header} onPress={onViewDetails} activeOpacity={0.9}>
        {trip.coverImage && (
          <>
            <Image source={{ uri: trip.coverImage }} style={styles.headerImage} resizeMode="cover" />
            <View style={styles.headerOverlay} />
          </>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.welcomeBack}>ברוך שובך! 🎉</Text>
          <Text style={styles.tripDestination}>{trip.destination}</Text>
          <Text style={styles.tripDates}>{getWelcomeMessage()}</Text>
        </View>
      </TouchableOpacity>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatItem icon="walk-outline" value={stats.distanceKm} label="ק״מ" />
        <StatItem icon="checkbox-outline" value={stats.activitiesCompleted} label="פעילויות" />
        <StatItem icon="camera-outline" value={stats.photosCount} label="תמונות" />
        <StatItem icon="location-outline" value={stats.citiesVisited} label="ערים" />
      </View>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>רגעים מהטיול</Text>
            <TouchableOpacity onPress={onViewPhotos}>
              <Text style={styles.seeAllLink}>הכל</Text>
            </TouchableOpacity>
          </View>
          <PhotoGallery photos={photos} onPress={onViewPhotos} />
        </View>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הישגים שנפתחו</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
            {achievements.map(achievement => (
              <AchievementBadge key={achievement.id} achievement={achievement} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Rating Section */}
      <View style={styles.ratingSection}>
        <Text style={styles.ratingPrompt}>איך היה הטיול?</Text>
        <StarRating rating={rating} onRate={handleRate} />
        {rating > 0 && (
          <Text style={styles.ratingFeedback}>
            {rating >= 4 ? 'שמחים שנהנית! 😊' : rating >= 3 ? 'תודה על המשוב' : 'נשתפר בפעם הבאה!'}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareButton} onPress={onShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          <Text style={styles.shareButtonText}>שתף טיול</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.planNextButton} onPress={onPlanNext} activeOpacity={0.8}>
          <Text style={styles.planNextButtonText}>תכנן את הבא</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.surface} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.large,
  },
  header: {
    height: 140,
    justifyContent: 'flex-end',
    backgroundColor: colors.primary,
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContent: {
    padding: spacing.md,
  },
  welcomeBack: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.9,
  },
  tripDestination: {
    ...typography.h2,
    color: colors.surface,
    fontWeight: '700',
  },
  tripDates: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.8,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.xs,
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
  },
  section: {
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  seeAllLink: {
    ...typography.caption,
    color: colors.primary,
  },
  photoGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  photoThumbnail: {
    width: (SCREEN_WIDTH - spacing.md * 4 - spacing.xs * 2) / 3,
    height: 70,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  photoThumbnailLarge: {
    width: (SCREEN_WIDTH - spacing.md * 4 - spacing.xs) / 2,
    height: 100,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlayText: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '600',
  },
  achievementsScroll: {
    marginTop: spacing.xs,
  },
  achievementBadge: {
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    minWidth: 80,
  },
  achievementNew: {
    backgroundColor: colors.primaryLight || '#E3F2FD',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  newBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  newBadgeText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '700',
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  ratingPrompt: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  starContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  ratingFeedback: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  shareButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  planNextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  planNextButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default TripSummaryCard;
