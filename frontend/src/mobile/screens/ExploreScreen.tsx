/**
 * ExploreScreen - Tab 1 (Home/Discovery)
 *
 * Main discovery screen with:
 * - Header with greeting + Weather Widget
 * - Functional search bar with clear button
 * - Horizontal filter chips with tag filtering
 * - Destination cards with navigation to Planner
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/tokens';
import { DESTINATIONS, FILTER_TAGS, Destination, FilterTag } from '../data/destinations';
import { haptics } from '../utils/haptics';

/**
 * Custom hook for search and filtering with debounce
 */
function useSearch(destinations: Destination[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter logic
  const filteredDestinations = useMemo(() => {
    return destinations.filter((dest) => {
      // Text search (case-insensitive match on name and description)
      const matchesText =
        debouncedQuery === '' ||
        dest.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        dest.description.toLowerCase().includes(debouncedQuery.toLowerCase());

      // Tag filter (destination must match at least one active tag)
      const matchesTags =
        activeTags.length === 0 ||
        activeTags.some((tag) =>
          dest.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
        );

      return matchesText && matchesTags;
    });
  }, [destinations, debouncedQuery, activeTags]);

  const toggleTag = useCallback((tagId: string) => {
    haptics.impact('light');
    setActiveTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setActiveTags([]);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    activeTags,
    toggleTag,
    filteredDestinations,
    clearSearch,
    clearAll,
    hasActiveFilters: searchQuery !== '' || activeTags.length > 0,
  };
}

/**
 * Weather Widget Component
 */
function WeatherWidget() {
  return (
    <View style={styles.weatherWidget}>
      <Text style={styles.weatherIcon}>☀️</Text>
      <Text style={styles.weatherTemp}>24°C</Text>
    </View>
  );
}

/**
 * Header Component
 */
function Header() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.userName}>Traveler</Text>
      </View>
      <WeatherWidget />
    </View>
  );
}

/**
 * Search Bar Component with clear button
 */
function SearchBar({
  query,
  onChangeText,
  onClear,
}: {
  query: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search destinations..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={onChangeText}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Filter Chip Component
 */
function FilterChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Filter Chips Row
 */
function FilterChipsRow({
  tags,
  activeTags,
  onToggleTag,
}: {
  tags: FilterTag[];
  activeTags: string[];
  onToggleTag: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContainer}
      keyboardShouldPersistTaps="handled"
    >
      {tags.map((chip) => (
        <FilterChip
          key={chip.id}
          label={chip.label}
          icon={chip.icon}
          selected={activeTags.includes(chip.id)}
          onPress={() => onToggleTag(chip.id)}
        />
      ))}
    </ScrollView>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={colors.textTertiary} />
      <Text style={styles.emptyStateTitle}>No destinations found</Text>
      <Text style={styles.emptyStateSubtitle}>
        Try a different search term or adjust your filters
      </Text>
    </View>
  );
}

/**
 * Destination Card Component
 */
function DestinationCard({
  item,
  onPress,
}: {
  item: Destination;
  onPress: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardImageContainer}>
        {!imageError ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="image" size={40} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.cardDifficulty}>
          <Text style={styles.cardDifficultyText}>{item.difficulty}</Text>
        </View>
        <View style={styles.cardRating}>
          <Ionicons name="star" size={12} color={colors.warning} />
          <Text style={styles.cardRatingText}>{item.rating}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaItem}>
            <Ionicons name="navigate" size={14} color={colors.textSecondary} />
            <Text style={styles.cardMetaText}>{item.distance}</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Ionicons name="time" size={14} color={colors.textSecondary} />
            <Text style={styles.cardMetaText}>{item.duration}</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            <Text style={styles.cardMetaText}>{item.region}</Text>
          </View>
        </View>
        <View style={styles.cardTags}>
          {item.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.cardTag}>
              <Text style={styles.cardTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * ExploreScreen Main Component
 */
export function ExploreScreen() {
  const navigation = useNavigation();
  const {
    searchQuery,
    setSearchQuery,
    activeTags,
    toggleTag,
    filteredDestinations,
    clearSearch,
    hasActiveFilters,
  } = useSearch(DESTINATIONS);

  const handleCardPress = useCallback(
    (destination: Destination) => {
      haptics.impact('medium');
      navigation.navigate('Planner' as never, { destination } as never);
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Destination }) => (
      <DestinationCard item={item} onPress={() => handleCardPress(item)} />
    ),
    [handleCardPress]
  );

  const keyExtractor = useCallback((item: Destination) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />
      <SearchBar
        query={searchQuery}
        onChangeText={setSearchQuery}
        onClear={clearSearch}
      />
      <FilterChipsRow
        tags={FILTER_TAGS}
        activeTags={activeTags}
        onToggleTag={toggleTag}
      />

      <View style={styles.sectionHeader}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>
          {hasActiveFilters
            ? `${filteredDestinations.length} Results`
            : 'AI Picks for Today'}
        </Text>
      </View>

      <FlatList
        data={filteredDestinations}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={Keyboard.dismiss}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={EmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  greeting: {
    ...typography.subhead,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.title2,
    color: colors.text,
  },
  weatherWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  weatherIcon: {
    fontSize: 24,
    marginRight: spacing.xs,
  },
  weatherTemp: {
    ...typography.headline,
    color: colors.text,
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  clearButton: {
    padding: spacing.xs,
  },

  // Filter Chips
  chipsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  chipLabel: {
    ...typography.subhead,
    color: colors.text,
  },
  chipLabelSelected: {
    color: colors.textInverse,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginLeft: spacing.sm,
  },

  // List
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    ...typography.title3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyStateSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  cardImageContainer: {
    height: 160,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImagePlaceholder: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDifficulty: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cardDifficultyText: {
    ...typography.caption1,
    color: colors.text,
    fontWeight: '600',
  },
  cardRating: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  cardRatingText: {
    ...typography.caption1,
    color: colors.text,
    fontWeight: '600',
  },
  cardContent: {
    padding: spacing.md,
  },
  cardTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.subhead,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardMetaText: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  cardTagText: {
    ...typography.caption2,
    color: colors.textSecondary,
  },
});

export default ExploreScreen;
