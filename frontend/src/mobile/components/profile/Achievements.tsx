/**
 * Achievement Components
 *
 * Displays user achievements and badges:
 * - AchievementCard: Single achievement with progress
 * - BadgeGrid: Grid of unlocked badges
 * - AchievementsSection: Complete achievements section
 *
 * Features:
 * - Animated unlock effects
 * - Progress tracking
 * - Rarity indicators
 * - Category filtering
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';
import {
  Achievement,
  UserAchievement,
  AchievementCategory,
  AchievementRarity,
  ACHIEVEMENTS,
} from './types';

interface AchievementCardProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  onPress?: () => void;
}

interface BadgeGridProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  onAchievementPress?: (achievement: Achievement) => void;
}

interface AchievementsSectionProps {
  userAchievements: UserAchievement[];
  onViewAll?: () => void;
}

/**
 * Rarity colors and styles
 */
const RARITY_CONFIG: Record<AchievementRarity, { colors: string[]; label: string; glow: string }> = {
  common: { colors: ['#9CA3AF', '#6B7280'], label: 'נפוץ', glow: '#9CA3AF' },
  rare: { colors: ['#3B82F6', '#2563EB'], label: 'נדיר', glow: '#3B82F6' },
  epic: { colors: ['#8B5CF6', '#7C3AED'], label: 'אפי', glow: '#8B5CF6' },
  legendary: { colors: ['#F59E0B', '#D97706'], label: 'אגדי', glow: '#F59E0B' },
};

/**
 * Category icons and labels
 */
const CATEGORY_CONFIG: Record<AchievementCategory, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  exploration: { icon: 'compass-outline', label: 'גילוי' },
  activity: { icon: 'fitness-outline', label: 'פעילות' },
  social: { icon: 'people-outline', label: 'חברתי' },
  planning: { icon: 'calendar-outline', label: 'תכנון' },
  special: { icon: 'star-outline', label: 'מיוחד' },
};

/**
 * Achievement Badge Component
 */
export function AchievementBadge({
  achievement,
  isUnlocked,
  isNew,
  size = 'medium',
  onPress,
}: {
  achievement: Achievement;
  isUnlocked: boolean;
  isNew?: boolean;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];

  const sizeStyles = {
    small: { container: 48, icon: 24 },
    medium: { container: 64, icon: 32 },
    large: { container: 80, icon: 40 },
  };

  const currentSize = sizeStyles[size];

  useEffect(() => {
    if (isNew) {
      // Bounce animation for new achievements
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 3,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isNew, scaleAnim, glowAnim]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.badgeContainer,
          {
            width: currentSize.container,
            height: currentSize.container,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isUnlocked ? (
          <LinearGradient
            colors={rarityConfig.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.badgeGradient, { borderRadius: currentSize.container / 2 }]}
          >
            <Text style={[styles.badgeIcon, { fontSize: currentSize.icon }]}>
              {achievement.icon}
            </Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.badgeLocked,
              {
                width: currentSize.container,
                height: currentSize.container,
                borderRadius: currentSize.container / 2,
              },
            ]}
          >
            <Ionicons name="lock-closed" size={currentSize.icon * 0.6} color={colors.textSecondary} />
          </View>
        )}

        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>חדש!</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

/**
 * Achievement Card Component
 */
export function AchievementCard({ achievement, userAchievement, onPress }: AchievementCardProps) {
  const isUnlocked = !!userAchievement;
  const progress = userAchievement?.progress || 0;
  const progressPercentage = Math.min(100, (progress / achievement.condition.threshold) * 100);
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const categoryConfig = CATEGORY_CONFIG[achievement.category];

  return (
    <TouchableOpacity
      style={[styles.achievementCard, !isUnlocked && styles.achievementCardLocked]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Badge */}
      <AchievementBadge
        achievement={achievement}
        isUnlocked={isUnlocked}
        isNew={userAchievement?.isNew}
        size="medium"
      />

      {/* Content */}
      <View style={styles.achievementContent}>
        <View style={styles.achievementHeader}>
          <Text style={[styles.achievementName, !isUnlocked && styles.textLocked]}>
            {achievement.name}
          </Text>
          <View style={[styles.rarityBadge, { backgroundColor: `${rarityConfig.glow}20` }]}>
            <Text style={[styles.rarityText, { color: rarityConfig.glow }]}>
              {rarityConfig.label}
            </Text>
          </View>
        </View>

        <Text style={[styles.achievementDescription, !isUnlocked && styles.textLocked]}>
          {achievement.description}
        </Text>

        {/* Progress Bar */}
        {!isUnlocked && achievement.progressType === 'count' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPercentage}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress}/{achievement.condition.threshold}
            </Text>
          </View>
        )}

        {/* Unlocked Date */}
        {isUnlocked && userAchievement && (
          <View style={styles.unlockedInfo}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.unlockedText}>
              נפתח {new Date(userAchievement.unlockedAt).toLocaleDateString('he-IL')}
            </Text>
          </View>
        )}
      </View>

      {/* Category Icon */}
      <View style={styles.categoryIcon}>
        <Ionicons name={categoryConfig.icon} size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

/**
 * Badge Grid Component
 */
export function BadgeGrid({ achievements, userAchievements, onAchievementPress }: BadgeGridProps) {
  const unlockedIds = useMemo(
    () => new Set(userAchievements.map((ua) => ua.achievementId)),
    [userAchievements]
  );

  const newIds = useMemo(
    () => new Set(userAchievements.filter((ua) => ua.isNew).map((ua) => ua.achievementId)),
    [userAchievements]
  );

  // Sort: unlocked first, then by rarity
  const sortedAchievements = useMemo(() => {
    const rarityOrder: Record<AchievementRarity, number> = {
      legendary: 0,
      epic: 1,
      rare: 2,
      common: 3,
    };

    return [...achievements].sort((a, b) => {
      const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
      const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
      if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  }, [achievements, unlockedIds]);

  return (
    <View style={styles.badgeGrid}>
      {sortedAchievements.map((achievement) => (
        <View key={achievement.id} style={styles.badgeGridItem}>
          <AchievementBadge
            achievement={achievement}
            isUnlocked={unlockedIds.has(achievement.id)}
            isNew={newIds.has(achievement.id)}
            size="small"
            onPress={() => onAchievementPress?.(achievement)}
          />
          <Text
            style={[
              styles.badgeGridLabel,
              !unlockedIds.has(achievement.id) && styles.textLocked,
            ]}
            numberOfLines={1}
          >
            {achievement.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Category Filter Tabs
 */
function CategoryFilters({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: AchievementCategory | 'all';
  onCategoryChange: (category: AchievementCategory | 'all') => void;
}) {
  const categories: Array<{ key: AchievementCategory | 'all'; label: string }> = [
    { key: 'all', label: 'הכל' },
    ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
      key: key as AchievementCategory,
      label: config.label,
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilters}
      contentContainerStyle={styles.categoryFiltersContent}
    >
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.key}
          style={[
            styles.categoryChip,
            activeCategory === cat.key && styles.categoryChipActive,
          ]}
          onPress={() => onCategoryChange(cat.key)}
        >
          <Text
            style={[
              styles.categoryChipText,
              activeCategory === cat.key && styles.categoryChipTextActive,
            ]}
          >
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/**
 * Achievements Section Component
 */
export function AchievementsSection({ userAchievements, onViewAll }: AchievementsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const unlockedCount = userAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const newCount = userAchievements.filter((ua) => ua.isNew).length;

  const filteredAchievements = useMemo(() => {
    if (activeCategory === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  const userAchievementMap = useMemo(() => {
    return new Map(userAchievements.map((ua) => [ua.achievementId, ua]));
  }, [userAchievements]);

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>הישגים</Text>
          <Text style={styles.sectionSubtitle}>
            {unlockedCount}/{totalCount} נפתחו
            {newCount > 0 && ` · ${newCount} חדשים!`}
          </Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAllLink}>הכל</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress */}
      <View style={styles.overallProgress}>
        <View style={styles.overallProgressBar}>
          <View
            style={[
              styles.overallProgressFill,
              { width: `${(unlockedCount / totalCount) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.overallProgressText}>
          {Math.round((unlockedCount / totalCount) * 100)}%
        </Text>
      </View>

      {/* Category Filters */}
      <CategoryFilters
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Badge Grid */}
      <BadgeGrid
        achievements={filteredAchievements}
        userAchievements={userAchievements}
        onAchievementPress={setSelectedAchievement}
      />

      {/* Achievement Detail Modal */}
      <Modal
        visible={!!selectedAchievement}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAchievement(null)}
        >
          {selectedAchievement && (
            <View style={styles.modalContent}>
              <AchievementCard
                achievement={selectedAchievement}
                userAchievement={userAchievementMap.get(selectedAchievement.id)}
              />
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    margin: spacing.md,
    padding: spacing.md,
    ...shadows.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewAllLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
  },
  overallProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  overallProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  overallProgressText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  categoryFilters: {
    marginBottom: spacing.md,
  },
  categoryFiltersContent: {
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.surface,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeGridItem: {
    alignItems: 'center',
    width: 64,
  },
  badgeGridLabel: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: 10,
  },
  badgeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeIcon: {
    textAlign: 'center',
  },
  badgeLocked: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.warning,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  newBadgeText: {
    fontSize: 8,
    color: colors.text,
    fontWeight: '700',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  achievementCardLocked: {
    opacity: 0.7,
  },
  achievementContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  achievementName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  rarityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  achievementDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  textLocked: {
    color: colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  unlockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  unlockedText: {
    ...typography.caption,
    color: colors.success,
  },
  categoryIcon: {
    marginLeft: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
  },
});

export default AchievementsSection;
