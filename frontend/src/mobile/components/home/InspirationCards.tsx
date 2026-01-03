/**
 * InspirationCards Component
 *
 * Displays inspiration content for new users:
 * - Popular destinations carousel
 * - "Surprise Me" AI suggestion
 * - Trending trips
 * - Quick category filters
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_SPACING = spacing.md;

interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  matchScore?: number;
  category: DestinationCategory;
  tripDuration: string;
  bestTime: string;
}

type DestinationCategory = 'beach' | 'city' | 'nature' | 'adventure' | 'culture' | 'romantic';

interface InspirationCardsProps {
  onDestinationPress?: (destination: Destination) => void;
  onSurpriseMe?: () => void;
  onCategoryPress?: (category: DestinationCategory) => void;
  onSeeAll?: () => void;
}

/**
 * Category configuration
 */
const categories: { id: DestinationCategory; label: string; icon: string }[] = [
  { id: 'beach', label: 'חופים', icon: 'sunny-outline' },
  { id: 'city', label: 'ערים', icon: 'business-outline' },
  { id: 'nature', label: 'טבע', icon: 'leaf-outline' },
  { id: 'adventure', label: 'הרפתקאות', icon: 'compass-outline' },
  { id: 'culture', label: 'תרבות', icon: 'library-outline' },
  { id: 'romantic', label: 'רומנטי', icon: 'heart-outline' },
];

/**
 * Mock popular destinations
 */
const mockDestinations: Destination[] = [
  {
    id: '1',
    name: 'ברצלונה',
    country: 'ספרד',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800',
    matchScore: 95,
    category: 'city',
    tripDuration: '4-5 ימים',
    bestTime: 'אביב/סתיו',
  },
  {
    id: '2',
    name: 'סנטוריני',
    country: 'יוון',
    image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    matchScore: 92,
    category: 'romantic',
    tripDuration: '3-4 ימים',
    bestTime: 'קיץ',
  },
  {
    id: '3',
    name: 'פראג',
    country: 'צ׳כיה',
    image: 'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=800',
    matchScore: 88,
    category: 'culture',
    tripDuration: '3-4 ימים',
    bestTime: 'אביב/סתיו',
  },
  {
    id: '4',
    name: 'אמלפי',
    country: 'איטליה',
    image: 'https://images.unsplash.com/photo-1534008897995-27a23e859048?w=800',
    matchScore: 90,
    category: 'beach',
    tripDuration: '5-7 ימים',
    bestTime: 'קיץ',
  },
  {
    id: '5',
    name: 'לונדון',
    country: 'אנגליה',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
    matchScore: 85,
    category: 'city',
    tripDuration: '4-5 ימים',
    bestTime: 'כל השנה',
  },
];

/**
 * Destination Card Component
 */
function DestinationCard({
  destination,
  onPress,
}: {
  destination: Destination;
  onPress?: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.destinationCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Image
          source={{ uri: destination.image }}
          style={styles.destinationImage}
          resizeMode="cover"
        />
        <View style={styles.destinationOverlay} />

        {/* Match Score Badge */}
        {destination.matchScore && (
          <View style={styles.matchBadge}>
            <Ionicons name="sparkles" size={12} color={colors.primary} />
            <Text style={styles.matchScore}>{destination.matchScore}%</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.destinationContent}>
          <Text style={styles.destinationName}>{destination.name}</Text>
          <Text style={styles.destinationCountry}>{destination.country}</Text>

          <View style={styles.destinationMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.surface} />
              <Text style={styles.metaText}>{destination.tripDuration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={colors.surface} />
              <Text style={styles.metaText}>{destination.bestTime}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Surprise Me Card
 */
function SurpriseMeCard({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.surpriseCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.surpriseIconContainer}>
        <Ionicons name="shuffle" size={32} color={colors.surface} />
      </View>
      <Text style={styles.surpriseTitle}>הפתע אותי!</Text>
      <Text style={styles.surpriseSubtitle}>AI ימצא את היעד המושלם עבורך</Text>
    </TouchableOpacity>
  );
}

/**
 * Category Chip Component
 */
function CategoryChip({
  category,
  isSelected,
  onPress,
}: {
  category: { id: DestinationCategory; label: string; icon: string };
  isSelected: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={category.icon as any}
        size={16}
        color={isSelected ? colors.surface : colors.primary}
      />
      <Text
        style={[
          styles.categoryLabel,
          isSelected && styles.categoryLabelSelected,
        ]}
      >
        {category.label}
      </Text>
    </TouchableOpacity>
  );
}

export function InspirationCards({
  onDestinationPress,
  onSurpriseMe,
  onCategoryPress,
  onSeeAll,
}: InspirationCardsProps) {
  const [selectedCategory, setSelectedCategory] = useState<DestinationCategory | null>(null);

  const handleCategoryPress = (categoryId: DestinationCategory) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    onCategoryPress?.(categoryId);
  };

  // Filter destinations by category
  const filteredDestinations = selectedCategory
    ? mockDestinations.filter(d => d.category === selectedCategory)
    : mockDestinations;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>יעדים פופולריים</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllText}>הכל</Text>
        </TouchableOpacity>
      </View>

      {/* Category Chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.categoriesContainer}
        renderItem={({ item }) => (
          <CategoryChip
            category={item}
            isSelected={selectedCategory === item.id}
            onPress={() => handleCategoryPress(item.id)}
          />
        )}
      />

      {/* Destinations Carousel */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'surprise', type: 'surprise' }, ...filteredDestinations]}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.carouselContainer}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        renderItem={({ item }) => {
          if (item.type === 'surprise') {
            return <SurpriseMeCard onPress={onSurpriseMe} />;
          }
          return (
            <DestinationCard
              destination={item as Destination}
              onPress={() => onDestinationPress?.(item as Destination)}
            />
          );
        }}
      />

      {/* AI Recommendation Teaser */}
      <TouchableOpacity style={styles.aiTeaser} onPress={onSurpriseMe} activeOpacity={0.8}>
        <View style={styles.aiTeaserContent}>
          <Ionicons name="sparkles" size={24} color={colors.primary} />
          <View style={styles.aiTeaserText}>
            <Text style={styles.aiTeaserTitle}>רוצה המלצה אישית?</Text>
            <Text style={styles.aiTeaserSubtitle}>
              ספר לנו על העדפותיך ו-AI ימצא את היעד המושלם
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  seeAllText: {
    ...typography.body,
    color: colors.primary,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: colors.surface,
  },
  carouselContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  destinationCard: {
    width: CARD_WIDTH,
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginRight: CARD_SPACING,
    ...shadows.medium,
  },
  destinationImage: {
    ...StyleSheet.absoluteFillObject,
  },
  destinationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  matchBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  matchScore: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  destinationContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  destinationName: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '700',
  },
  destinationCountry: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
  },
  destinationMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.9,
  },
  surpriseCard: {
    width: CARD_WIDTH * 0.5,
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: CARD_SPACING,
    ...shadows.medium,
  },
  surpriseIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  surpriseTitle: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '700',
  },
  surpriseSubtitle: {
    ...typography.caption,
    color: colors.surface,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: 4,
  },
  aiTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryLight || '#E3F2FD',
    borderRadius: borderRadius.lg,
  },
  aiTeaserContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiTeaserText: {
    flex: 1,
  },
  aiTeaserTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  aiTeaserSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default InspirationCards;
